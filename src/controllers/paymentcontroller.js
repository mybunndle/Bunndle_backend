
import Order from "../model/OrderModel.js";
import Payment from "../model/PaymentModel.js";
import Asset from "../model/coAssetModel.js";
import razorpay from "../config/razorpay.js";
import { allocateFractions } from "../services/ownerShipService.js";
import User from "../model/userModel.js";
import mongoose from "mongoose";

import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../utils/razorpaySignature.js";

import {
  finalizeSuccessfulPayment,
} from "../services/finalizeSuccessfulPaymentService.js";


// Helper: safely expire order and release reserved fractions
const expireAndReleaseOrder = async (orderId) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Only PENDING_PAYMENT order can be expired
      const order = await Order.findOneAndUpdate(
        {
          _id: orderId,
          status: "PENDING_PAYMENT",
        },
        {
          $set: {
            status: "EXPIRED",
          },
        },
        {
          returnDocument: "after",
          session,
        }
      );

      // Already handled by payment/cron/another request
      if (!order) {
        return;
      }

      const assetResult = await Asset.updateOne(
        {
          _id: order.assetId,
          reservedFractions: {
            $gte: order.fractions,
          },
        },
        {
          $inc: {
            availableFractions: order.fractions,
            reservedFractions: -order.fractions,
          },
        },
        {
          session,
        }
      );

      if (assetResult.modifiedCount !== 1) {
        throw new Error(
          `Unable to release fractions for order ${order._id}`
        );
      }

      await Payment.updateMany(
        {
          orderId: order._id,
          status: "PENDING",
        },
        {
          $set: {
            status: "EXPIRED",
          },
        },
        {
          session,
        }
      );
    });
  } finally {
    await session.endSession();
  }
};

export const createOrder = async (req, res) => {
  let order = null;
  let asset = null;

  try {
    const userId = req.user.id;
    const { assetId, fractions } = req.body;

    // =========================
    // VALIDATION
    // =========================

    if (!assetId || fractions === undefined) {
      return res.status(400).json({
        success: false,
        message: "assetId and fractions are required",
      });
    }

    if (!mongoose.isValidObjectId(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assetId",
      });
    }

    const fractionCount = Number(fractions);

    if (
      !Number.isInteger(fractionCount) ||
      fractionCount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid fraction count",
      });
    }

    // =========================
    // KYC CHECK
    // =========================

    const user = await User.findById(userId).select(
      "kycStatus isKycVerified"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      user.kycStatus !== "VERIFIED" ||
      !user.isKycVerified
    ) {
      return res.status(403).json({
        success: false,
        message:
          "KYC verification is required before making an investment.",
      });
    }

    // =========================
    // RESERVE FRACTIONS +
    // CREATE INTERNAL ORDER
    // =========================

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        /*
          Example:

          totalFractions = 100

          Maximum public fractions = 80
          Company protected = 20

          totalFractions - availableFractions
          gives currently sold/reserved fractions.
        */

        asset = await Asset.findOneAndUpdate(
          {
            _id: assetId,

            status: "ACTIVE",

            availableFractions: {
              $gte: fractionCount,
            },

            // Prevent users from crossing 80%
            $expr: {
              $lte: [
                {
                  $add: [
                    {
                      $subtract: [
                        "$totalFractions",
                        "$availableFractions",
                      ],
                    },
                    fractionCount,
                  ],
                },

                {
                  $floor: {
                    $multiply: [
                      "$totalFractions",
                      0.8,
                    ],
                  },
                },
              ],
            },
          },

          {
            $inc: {
              availableFractions: -fractionCount,
              reservedFractions: fractionCount,
            },
          },

          {
            returnDocument: "after",
            session,
          }
        );

        if (!asset) {
          const error = new Error(
            "Requested fractions are not available. Maximum 80% of the asset can be purchased by users."
          );

          error.statusCode = 400;

          throw error;
        }

        const amount =
          fractionCount *
          asset.amountPerFraction;

        const createdOrders =
          await Order.create(
            [
              {
                userId,
                assetId,

                fractions: fractionCount,

                amountPerFraction:
                  asset.amountPerFraction,

                totalAmount: amount,

                status: "PENDING_PAYMENT",

                expiresAt: new Date(
                  Date.now() +
                    5 * 60 * 1000
                ),
              },
            ],
            {
              session,
            }
          );

        order = createdOrders[0];
      });
    } finally {
      await session.endSession();
    }

    // =========================
    // CREATE RAZORPAY ORDER
    // =========================
    // External API call transaction ke bahar rakho.

    let razorpayOrder;

    try {
      razorpayOrder =
        await razorpay.orders.create({
          amount: Math.round(
            order.totalAmount * 100
          ),

          currency: "INR",

          receipt: `receipt_${order._id}`,
        });
    } catch (razorpayError) {
      console.error(
        "Razorpay Order Creation Error:",
        razorpayError
      );

      await expireAndReleaseOrder(
        order._id
      );

      return res.status(502).json({
        success: false,
        message:
          "Unable to initialize payment. Please try again.",
      });
    }

    // =========================
    // CREATE PAYMENT RECORD
    // =========================

    try {
      await Payment.create({
        userId,

        orderId: order._id,

        razorpayOrderId:
          razorpayOrder.id,

        amount: order.totalAmount,

        status: "PENDING",
      });
    } catch (paymentError) {
      console.error(
        "Payment Record Creation Error:",
        paymentError
      );

      await expireAndReleaseOrder(
        order._id
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to initialize payment. Please try again.",
      });
    }

    // =========================
    // PUBLIC / COMPANY FRACTIONS
    // =========================

    const publicLimit = Math.floor(
      asset.totalFractions * 0.8
    );

    const companyReservedFractions =
      asset.totalFractions -
      publicLimit;

    const publicUsed =
      asset.totalFractions -
      asset.availableFractions;

    const publicAvailableFractions =
      Math.max(
        0,
        publicLimit - publicUsed
      );

    // =========================
    // RESPONSE
    // =========================

    return res.status(201).json({
      success: true,
      message: "Order created successfully",

      order,

      razorpayOrder,

      fractionInfo: {
        totalFractions:
          asset.totalFractions,

        publicLimit,

        publicAvailableFractions,

        companyReservedFractions,
      },
    });
  } catch (error) {
    console.error(
      "Create Order Error:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.statusCode
            ? error.message
            : "Something went wrong while creating the order.",
      });
  }
};






// ============================================================
// VERIFY PAYMENT
//
// MongoDB stores the actual Date timestamp.
// India time is only applied while formatting the response.
// ============================================================

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;


    // ========================================================
    // 1. VALIDATION
    // ========================================================

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment verification details are required",
      });
    }


    // ========================================================
    // 2. VERIFY CHECKOUT SIGNATURE
    // ========================================================

    const validSignature =
      verifyRazorpayPaymentSignature({
        razorpayOrderId:
          razorpay_order_id,

        razorpayPaymentId:
          razorpay_payment_id,

        razorpaySignature:
          razorpay_signature,
      });


    if (!validSignature) {
      return res.status(400).json({
        success: false,
        message:
          "Payment verification failed",
      });
    }


    // ========================================================
    // 3. FIND INTERNAL PAYMENT RECORD
    // ========================================================

    const payment =
      await Payment.findOne({
        razorpayOrderId:
          razorpay_order_id,
      });


    if (!payment) {
      return res.status(404).json({
        success: false,
        message:
          "Payment record not found",
      });
    }


    // ========================================================
    // 4. FETCH PAYMENT DIRECTLY FROM RAZORPAY
    // ========================================================

    let razorpayPayment;

    try {
      razorpayPayment =
        await razorpay.payments.fetch(
          razorpay_payment_id
        );
    } catch (error) {
      console.error(
        "RAZORPAY PAYMENT FETCH ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          "Unable to verify payment with Razorpay",
      });
    }


    if (!razorpayPayment) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to verify payment with Razorpay",
      });
    }


    // ========================================================
    // 5. VERIFY PAYMENT ID
    // ========================================================

    if (
      razorpayPayment.id &&
      razorpayPayment.id !==
        razorpay_payment_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Razorpay payment ID mismatch",
      });
    }


    // ========================================================
    // 6. VERIFY ORDER RELATION
    // ========================================================

    if (
      razorpayPayment.order_id !==
      razorpay_order_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment does not belong to this order",
      });
    }


    // ========================================================
    // 7. VERIFY AMOUNT
    //
    // Payment.amount = INR
    // Razorpay amount = paise
    // ========================================================

    const expectedAmount =
      Math.round(
        Number(
          payment.amount
        ) * 100
      );


    if (
      Number(
        razorpayPayment.amount
      ) !== expectedAmount
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount mismatch",
      });
    }


    // ========================================================
    // 8. VERIFY CURRENCY
    // ========================================================

    const expectedCurrency =
      payment.currency ||
      "INR";


    if (
      razorpayPayment.currency &&
      String(
        razorpayPayment.currency
      ).toUpperCase() !==
        String(
          expectedCurrency
        ).toUpperCase()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment currency mismatch",
      });
    }


    // ========================================================
    // 9. PAYMENT MUST BE CAPTURED
    // ========================================================

    if (
      razorpayPayment.status !==
      "captured"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Payment is not captured. Current status: ${razorpayPayment.status}`,
      });
    }


    // ========================================================
    // 10. PAYMENT SUCCESS TIMESTAMP
    //
    // IMPORTANT:
    //
    // Do not manually add +5:30 here.
    //
    // MongoDB Date represents the actual instant.
    // Asia/Kolkata is used only for display formatting.
    // ========================================================

    const paidAt =
      new Date();


    // ========================================================
    // 11. FINALIZE SUCCESSFUL PAYMENT
    //
    // SAME paidAt will go into:
    //
    // Payment.paidAt
    // PurchaseHistory.paidAt
    // ========================================================

    const result =
      await finalizeSuccessfulPayment({
        razorpayOrderId:
          razorpay_order_id,

        razorpayPaymentId:
          razorpay_payment_id,

        razorpaySignature:
          razorpay_signature,

        paymentMethod:
          razorpayPayment.method ||
          null,

        webhookVerified:
          false,

        paidAt,
      });


    // ========================================================
    // 12. INDIA DATE
    // ========================================================

    const finalPaidAt =
      result.paidAt ||
      paidAt;


    const purchaseDate =
      new Intl.DateTimeFormat(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "2-digit",

          year:
            "numeric",

          timeZone:
            "Asia/Kolkata",
        }
      ).format(
        finalPaidAt
      );


    // ========================================================
    // 13. INDIA TIME
    // ========================================================

    const purchaseTime =
      new Intl.DateTimeFormat(
        "en-IN",
        {
          hour:
            "2-digit",

          minute:
            "2-digit",

          second:
            "2-digit",

          hour12:
            true,

          timeZone:
            "Asia/Kolkata",
        }
      )
        .format(
          finalPaidAt
        )
        .toLowerCase();


    // ========================================================
    // 14. RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      message:
        result.alreadyProcessed
          ? "Payment already verified and purchase already completed"
          : "Payment verified and purchase completed successfully",

      data: {
        purchaseHistoryId:
          result.purchaseHistoryId,

        paymentStatus:
          "SUCCESS",

        paidAt:
          finalPaidAt,

        purchaseDate,

        purchaseTime,
      },
    });

  } catch (error) {
    console.error(
      "VERIFY PAYMENT ERROR:",
      error
    );


    return res
      .status(
        error.statusCode ||
        500
      )
      .json({
        success: false,

        message:
          error.message ||
          "Unable to verify payment",
      });
  }
};


// export const verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     } = req.body;

//     // Verify Razorpay Signature
//     const generatedSignature = crypto
//       .createHmac(
//         "sha256",
//         process.env.RAZORPAY_KEY_SECRET
//       )
//       .update(
//         `${razorpay_order_id}|${razorpay_payment_id}`
//       )
//       .digest("hex");

//     if (
//       generatedSignature !==
//       razorpay_signature
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Payment verification failed",
//       });
//     }

//     // Find Payment Record
//     const payment =
//       await Payment.findOne({
//         razorpayOrderId:
//           razorpay_order_id,
//       });

//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message:
//           "Payment record not found",
//       });
//     }

//     // Duplicate Verification Protection
//     if (payment.status === "SUCCESS") {
//       return res.status(200).json({
//         success: true,
//         message:
//           "Payment already verified",
//       });
//     }

//     // Find Order
//     const order =
//       await Order.findById(
//         payment.orderId
//       );

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message:
//           "Order not found",
//       });
//     }

//     // Allow only pending orders
//     if (
//       order.status !==
//       "PENDING_PAYMENT"
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: `Order status is ${order.status}. Payment cannot be processed.`,
//       });
//     }

//     // Extra protection if cron hasn't run yet
//     if (
//       order.expiresAt &&
//       order.expiresAt < new Date()
//     ) {
//       order.status = "EXPIRED";
//       await order.save();

//       payment.status = "EXPIRED";
//       await payment.save();

//       return res.status(400).json({
//         success: false,
//         message:
//           "Order has expired.",
//       });
//     }

//     // Allocate Ownership First
//     await allocateFractions({
//       assetId: order.assetId,
//       userId: order.userId,
//       fractions: order.fractions,
//       razorpayOrderId:
//         razorpay_order_id,
//       razorpayPaymentId:
//         razorpay_payment_id,
//     });

//     // Update Payment
//     payment.razorpayPaymentId =
//       razorpay_payment_id;

//     payment.razorpaySignature =
//       razorpay_signature;

//     payment.status = "SUCCESS";

//     await payment.save();

//     // Release Reserved Fractions
//     await Asset.findByIdAndUpdate(
//       order.assetId,
//       {
//         $inc: {
//           reservedFractions:
//             -order.fractions,
//         },
//       }
//     );

//     // Complete Order
//     order.status = "COMPLETED";

//     await order.save();

//     return res.status(200).json({
//       success: true,
//       message:
//         "Payment verified and fractions allocated successfully",
//       orderId: order._id,
//     });
//   } catch (error) {
//     console.log(
//       "VERIFY PAYMENT ERROR:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };









// export const verifyPayment = async (
//   req,
//   res
// ) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     } = req.body;


//     // =====================================
//     // 1. VALIDATION
//     // =====================================

//     if (
//       !razorpay_order_id ||
//       !razorpay_payment_id ||
//       !razorpay_signature
//     ) {
//       return res.status(400).json({
//         success: false,

//         message:
//           "Payment verification details are required",
//       });
//     }


//     // =====================================
//     // 2. VERIFY SIGNATURE
//     // =====================================

//     const validSignature =
//       verifyRazorpayPaymentSignature({
//         razorpayOrderId:
//           razorpay_order_id,

//         razorpayPaymentId:
//           razorpay_payment_id,

//         razorpaySignature:
//           razorpay_signature,
//       });


//     if (!validSignature) {
//       return res.status(400).json({
//         success: false,

//         message:
//           "Payment verification failed",
//       });
//     }


//     // =====================================
//     // 3. FIND PAYMENT RECORD
//     // =====================================

//     const payment =
//       await Payment.findOne({
//         razorpayOrderId:
//           razorpay_order_id,
//       });


//     if (!payment) {
//       return res.status(404).json({
//         success: false,

//         message:
//           "Payment record not found",
//       });
//     }


//     // =====================================
//     // 4. FETCH ACTUAL RAZORPAY PAYMENT
//     // =====================================

//     const razorpayPayment =
//       await razorpay.payments.fetch(
//         razorpay_payment_id
//       );


//     if (!razorpayPayment) {
//       return res.status(400).json({
//         success: false,

//         message:
//           "Unable to verify payment with Razorpay",
//       });
//     }


//     // =====================================
//     // 5. VERIFY RAZORPAY ORDER
//     // =====================================

//     if (
//       razorpayPayment.order_id !==
//       razorpay_order_id
//     ) {
//       return res.status(400).json({
//         success: false,

//         message:
//           "Payment does not belong to this order",
//       });
//     }


//     // =====================================
//     // 6. VERIFY AMOUNT
//     // =====================================

//     const expectedAmount =
//       Math.round(
//         Number(payment.amount) *
//           100
//       );


//     if (
//       Number(
//         razorpayPayment.amount
//       ) !== expectedAmount
//     ) {
//       return res.status(400).json({
//         success: false,

//         message:
//           "Payment amount mismatch",
//       });
//     }


//     // =====================================
//     // 7. PAYMENT MUST BE CAPTURED
//     // =====================================

//     if (
//       razorpayPayment.status !==
//       "captured"
//     ) {
//       return res.status(400).json({
//         success: false,

//         message:
//           `Payment is not captured. Current status: ${razorpayPayment.status}`,
//       });
//     }


//     // =====================================
//     // 8. FINALIZE PURCHASE
//     // =====================================

//     const result =
//       await finalizeSuccessfulPayment({
//         razorpayOrderId:
//           razorpay_order_id,

//         razorpayPaymentId:
//           razorpay_payment_id,

//         razorpaySignature:
//           razorpay_signature,

//         paymentMethod:
//           razorpayPayment.method ||
//           null,

//         webhookVerified:
//           false,
//       });


//     return res.status(200).json({
//       success: true,

//       message:
//         "Payment verified and purchase completed successfully",

//       data: {
//         purchaseHistoryId:
//           result.purchaseHistoryId,

//         paymentStatus:
//           "SUCCESS",
//       },
//     });

//   } catch (error) {
//     console.error(
//       "VERIFY PAYMENT ERROR:",
//       error
//     );

//     return res
//       .status(
//         error.statusCode ||
//           500
//       )
//       .json({
//         success: false,

//         message:
//           error.message ||
//           "Unable to verify payment",
//       });
//   }
// };

// export const razorpayWebhook = async (req, res) => {
//   try {
//     const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

//     const generatedSignature = crypto
//       .createHmac("sha256", secret)
//       .update(req.body)
//       .digest("hex");

//     const receivedSignature = req.headers["x-razorpay-signature"];

//     if (generatedSignature !== receivedSignature) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid webhook signature",
//       });
//     }

//     const eventData = JSON.parse(req.body.toString());

//     const event = eventData.event;

//     if (event === "payment.captured") {
//       const paymentEntity = eventData.payload.payment.entity;

//       await Payment.findOneAndUpdate(
//         {
//           razorpayPaymentId: paymentEntity.id,
//         },
//         {
//           webhookVerified: true,

//           status: "SUCCESS",
//         },
//       );
//     }

//     return res.status(200).json({
//       success: true,
//     });
//   } catch (error) {
//     console.log(error);

//     return res.status(500).json({
//       success: false,
//     });
//   }
// };


export const razorpayWebhook =
  async (req, res) => {
    try {
      const receivedSignature =
        req.headers[
          "x-razorpay-signature"
        ];


      const validSignature =
        verifyRazorpayWebhookSignature({
          rawBody:
            req.body,

          signature:
            receivedSignature,
        });


      if (!validSignature) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid webhook signature",
        });
      }


      const eventData =
        JSON.parse(
          req.body.toString()
        );


      const event =
        eventData.event;


      if (
        event ===
        "payment.captured"
      ) {
        const paymentEntity =
          eventData.payload.payment
            .entity;


        const result =
          await finalizeSuccessfulPayment({
            razorpayOrderId:
              paymentEntity.order_id,

            razorpayPaymentId:
              paymentEntity.id,

            paymentMethod:
              paymentEntity.method ||
              null,

            webhookVerified:
              true,
          });


        // PDF will be added here shortly.
      }


      return res.status(200).json({
        success: true,
      });

    } catch (error) {
      console.error(
        "RAZORPAY WEBHOOK ERROR:",
        error
      );


      return res.status(500).json({
        success: false,
      });
    }
  };






// import crypto from "crypto";
// import Order from "../model/OrderModel.js";
// import Payment from "../model/PaymentModel.js";
// import razorpay from "../config/razorpay.js";
// import { allocateFractions } from "../services/ownerShipService.js";

// export  const createOrder = async (req,res)=>{

//    try{

//       const userId = req.user.id;

//       const { amount } = req.body;

//       // STEP 1 → Save Order In MongoDB
//       const order = await Order.create({

//          userId,

//          totalAmount:amount

//       });

//       // STEP 2 → Create Razorpay Order
//       const options = {

//          amount: amount * 100,

//          currency:"INR",

//          receipt:`receipt_${order._id}`

//       };

//       const razorpayOrder =
//          await razorpay.orders.create(options);

//       // STEP 3 → Save Payment Record
//       await Payment.create({

//          userId,

//          orderId:order._id,

//          razorpayOrderId:razorpayOrder.id,

//          amount,

//       });

//       return res.status(200).json({

//          success:true,

//          order,

//          razorpayOrder

//       });

//    }catch(error){

//       console.log(error);

//       return res.status(500).json({

//          success:false,

//          message:error.message

//       });

//    }

// };

// export const verifyPayment = async (req,res)=>{

//    try{

//       const {

//          razorpay_order_id,

//          razorpay_payment_id,

//          razorpay_signature

//       } = req.body;

//       // STEP 1 → Generate Signature
//       const generatedSignature = crypto

//          .createHmac(

//             "sha256",

//             process.env.RAZORPAY_KEY_SECRET

//          )

//          .update(

//             razorpay_order_id + "|" + razorpay_payment_id

//          )

//          .digest("hex");

//       // STEP 2 → Compare Signature
//       if(generatedSignature !== razorpay_signature){

//          return res.status(400).json({

//             success:false,

//             message:"Payment verification failed"

//          });

//       }

//       // STEP 3 → Update Payment
//       const payment = await Payment.findOneAndUpdate(

//          { razorpayOrderId: razorpay_order_id },

//          {

//             razorpayPaymentId: razorpay_payment_id,

//             razorpaySignature: razorpay_signature,

//             status:"SUCCESS"

//          },

//          { new:true }

//       );

//       // STEP 4 → Update Order
//       await Order.findByIdAndUpdate(

//          payment.orderId,

//          {

//             status:"CONFIRMED"

//          }

//       );

//       return res.status(200).json({

//          success:true,

//          message:"Payment verified"

//       });

//    }catch(error){

//       console.log(error);

//       return res.status(500).json({

//          success:false,

//          message:error.message

//       });

//    }

// };

// export const razorpayWebhook = async (req, res) => {

//    try {

//       const secret =
//          process.env.RAZORPAY_WEBHOOK_SECRET;

//       const generatedSignature = crypto
//          .createHmac("sha256", secret)
//          .update(req.body)
//          .digest("hex");

//       const receivedSignature =
//          req.headers["x-razorpay-signature"];

//       // VERIFY SIGNATURE
//       if (generatedSignature !== receivedSignature) {

//          return res.status(400).json({
//             success: false,
//             message: "Invalid webhook signature"
//          });

//       }

//       // CONVERT BUFFER TO JSON
//       const eventData =
//          JSON.parse(req.body.toString());

//       const event = eventData.event;

//       console.log("Webhook Event:", event);

//       // PAYMENT SUCCESS
//       if (event === "payment.captured") {

//          const paymentEntity =
//             eventData.payload.payment.entity;

//          console.log(paymentEntity);

//          await Payment.findOneAndUpdate(

//             {
//                razorpayPaymentId:
//                   paymentEntity.id
//             },

//             {
//                webhookVerified: true,
//                status: "SUCCESS"
//             }

//          );

//       }

//       return res.status(200).json({
//          success: true
//       });

//    } catch (error) {

//       console.log(error);

//       return res.status(500).json({
//          success: false
//       });

//    }

// };
