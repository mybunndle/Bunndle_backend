// import Order from "../model/OrderModel.js";
// import Payment from "../model/PaymentModel.js";
// import Asset from "../model/coAssetModel.js";
// import razorpay from "../config/razorpay.js";
// import { allocateFractions } from "../services/ownerShipService.js";
// import User from "../model/userModel.js";
// import mongoose from "mongoose";

// import {
//   verifyRazorpayPaymentSignature,
//   verifyRazorpayWebhookSignature,
// } from "../utils/razorpaySignature.js";

// import { finalizeSuccessfulPayment } from "../services/finalizeSuccessfulPaymentService.js";

// // Helper: safely expire order and release reserved fractions
// const expireAndReleaseOrder = async (orderId) => {
//   const session = await mongoose.startSession();

//   try {
//     await session.withTransaction(async () => {
//       // Only PENDING_PAYMENT order can be expired
//       const order = await Order.findOneAndUpdate(
//         {
//           _id: orderId,
//           status: "PENDING_PAYMENT",
//         },
//         {
//           $set: {
//             status: "EXPIRED",
//           },
//         },
//         {
//           returnDocument: "after",
//           session,
//         },
//       );

//       // Already handled by payment/cron/another request
//       if (!order) {
//         return;
//       }

//       const assetResult = await Asset.updateOne(
//         {
//           _id: order.assetId,
//           reservedFractions: {
//             $gte: order.fractions,
//           },
//         },
//         {
//           $inc: {
//             availableFractions: order.fractions,
//             reservedFractions: -order.fractions,
//           },
//         },
//         {
//           session,
//         },
//       );

//       if (assetResult.modifiedCount !== 1) {
//         throw new Error(`Unable to release fractions for order ${order._id}`);
//       }

//       await Payment.updateMany(
//         {
//           orderId: order._id,
//           status: "PENDING",
//         },
//         {
//           $set: {
//             status: "EXPIRED",
//           },
//         },
//         {
//           session,
//         },
//       );
//     });
//   } finally {
//     await session.endSession();
//   }
// };

// export const createOrder = async (req, res) => {
//   let order = null;
//   let asset = null;

//   try {
//     const userId = req.user.id;
//     const { assetId, fractions } = req.body;

//     // =========================
//     // VALIDATION
//     // =========================

//     if (!assetId || fractions === undefined) {
//       return res.status(400).json({
//         success: false,
//         message: "assetId and fractions are required",
//       });
//     }

//     if (!mongoose.isValidObjectId(assetId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid assetId",
//       });
//     }

//     const fractionCount = Number(fractions);

//     if (!Number.isInteger(fractionCount) || fractionCount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid fraction count",
//       });
//     }

//     // =========================
//     // KYC CHECK
//     // =========================

//     const user = await User.findById(userId).select("kycStatus isKycVerified");

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     if (user.kycStatus !== "VERIFIED" || !user.isKycVerified) {
//       return res.status(403).json({
//         success: false,
//         message: "KYC verification is required before making an investment.",
//       });
//     }

//     // =========================
//     // RESERVE FRACTIONS +
//     // CREATE INTERNAL ORDER
//     // =========================

//     const session = await mongoose.startSession();

//     try {
//       await session.withTransaction(async () => {
//         /*
//           Example:

//           totalFractions = 100

//           Maximum public fractions = 80
//           Company protected = 20

//           totalFractions - availableFractions
//           gives currently sold/reserved fractions.
//         */

//         asset = await Asset.findOneAndUpdate(
//           {
//             _id: assetId,

//             status: "ACTIVE",

//             availableFractions: {
//               $gte: fractionCount,
//             },

//             // Prevent users from crossing 80%
//             $expr: {
//               $lte: [
//                 {
//                   $add: [
//                     {
//                       $subtract: ["$totalFractions", "$availableFractions"],
//                     },
//                     fractionCount,
//                   ],
//                 },

//                 {
//                   $floor: {
//                     $multiply: ["$totalFractions", 0.8],
//                   },
//                 },
//               ],
//             },
//           },

//           {
//             $inc: {
//               availableFractions: -fractionCount,
//               reservedFractions: fractionCount,
//             },
//           },

//           {
//             returnDocument: "after",
//             session,
//           },
//         );

//         if (!asset) {
//           const error = new Error(
//             "Requested fractions are not available. Maximum 80% of the asset can be purchased by users.",
//           );

//           error.statusCode = 400;

//           throw error;
//         }

//         const amount = fractionCount * asset.amountPerFraction;

//         const createdOrders = await Order.create(
//           [
//             {
//               userId,
//               assetId,

//               fractions: fractionCount,

//               amountPerFraction: asset.amountPerFraction,

//               totalAmount: amount,

//               status: "PENDING_PAYMENT",

//               expiresAt: new Date(Date.now() + 10 * 60 * 1000),
//             },
//           ],
//           {
//             session,
//           },
//         );

//         order = createdOrders[0];
//       });
//     } finally {
//       await session.endSession();
//     }

//     // =========================
//     // CREATE RAZORPAY ORDER
//     // =========================
//     // External API call transaction ke bahar rakho.

//     let razorpayOrder;

//     try {
//       razorpayOrder = await razorpay.orders.create({
//         amount: Math.round(order.totalAmount * 100),

//         currency: "INR",

//         receipt: `receipt_${order._id}`,
//       });
//     } catch (razorpayError) {
//       console.error("Razorpay Order Creation Error:", razorpayError);

//       await expireAndReleaseOrder(order._id);

//       return res.status(502).json({
//         success: false,
//         message: "Unable to initialize payment. Please try again.",
//       });
//     }

//     // =========================
//     // CREATE PAYMENT RECORD
//     // =========================

//     try {
//       await Payment.create({
//         userId,
//         orderId: order._id,
//         razorpayOrderId: razorpayOrder.id,

//         amount: order.totalAmount,

//         status: "PENDING",
//       });
//     } catch (paymentError) {
//       console.error("Payment Record Creation Error:", paymentError);

//       await expireAndReleaseOrder(order._id);

//       return res.status(500).json({
//         success: false,
//         message: "Unable to initialize payment. Please try again.",
//       });
//     }

//     // =========================
//     // PUBLIC / COMPANY FRACTIONS
//     // =========================

//     const publicLimit = Math.floor(asset.totalFractions * 0.8);

//     const companyReservedFractions = asset.totalFractions - publicLimit;

//     const publicUsed = asset.totalFractions - asset.availableFractions;

//     const publicAvailableFractions = Math.max(0, publicLimit - publicUsed);

//     // =========================
//     // RESPONSE
//     // =========================

//     return res.status(201).json({
//       success: true,
//       message: "Order created successfully",

//       order,

//       razorpayOrder,

//       fractionInfo: {
//         totalFractions: asset.totalFractions,

//         publicLimit,

//         publicAvailableFractions,

//         companyReservedFractions,
//       },
//     });
//   } catch (error) {
//     console.error("Create Order Error:", error);

//     return res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.statusCode
//         ? error.message
//         : "Something went wrong while creating the order.",
//     });
//   }
// };

// // ============================================================
// // VERIFY PAYMENT
// //
// // MongoDB stores the actual Date timestamp.
// // India time is only applied while formatting the response.
// // ============================================================

// export const verifyPayment = async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
//       req.body;

//     // ========================================================
//     // 1. VALIDATION
//     // ========================================================

//     if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: "Payment verification details are required",
//       });
//     }

//     // ========================================================
//     // 2. VERIFY CHECKOUT SIGNATURE
//     // ========================================================

//     const validSignature = verifyRazorpayPaymentSignature({
//       razorpayOrderId: razorpay_order_id,

//       razorpayPaymentId: razorpay_payment_id,

//       razorpaySignature: razorpay_signature,
//     });

//     if (!validSignature) {
//       return res.status(400).json({
//         success: false,
//         message: "Payment verification failed",
//       });
//     }

//     // ========================================================
//     // 3. FIND INTERNAL PAYMENT RECORD
//     // ========================================================

//     const payment = await Payment.findOne({
//       razorpayOrderId: razorpay_order_id,
//     });

//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: "Payment record not found",
//       });
//     }

//     // ========================================================
//     // 4. FETCH PAYMENT DIRECTLY FROM RAZORPAY
//     // ========================================================

//     let razorpayPayment;

//     try {
//       razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
//     } catch (error) {
//       console.error("RAZORPAY PAYMENT FETCH ERROR:", error);

//       return res.status(400).json({
//         success: false,
//         message: "Unable to verify payment with Razorpay",
//       });
//     }

//     if (!razorpayPayment) {
//       return res.status(400).json({
//         success: false,
//         message: "Unable to verify payment with Razorpay",
//       });
//     }

//     // ========================================================
//     // 5. VERIFY PAYMENT ID
//     // ========================================================

//     if (razorpayPayment.id && razorpayPayment.id !== razorpay_payment_id) {
//       return res.status(400).json({
//         success: false,
//         message: "Razorpay payment ID mismatch",
//       });
//     }

//     // ========================================================
//     // 6. VERIFY ORDER RELATION
//     // ========================================================

//     if (razorpayPayment.order_id !== razorpay_order_id) {
//       return res.status(400).json({
//         success: false,
//         message: "Payment does not belong to this order",
//       });
//     }

//     // ========================================================
//     // 7. VERIFY AMOUNT
//     //
//     // Payment.amount = INR
//     // Razorpay amount = paise
//     // ========================================================

//     const expectedAmount = Math.round(Number(payment.amount) * 100);

//     if (Number(razorpayPayment.amount) !== expectedAmount) {
//       return res.status(400).json({
//         success: false,
//         message: "Payment amount mismatch",
//       });
//     }

//     // ========================================================
//     // 8. VERIFY CURRENCY
//     // ========================================================

//     const expectedCurrency = payment.currency || "INR";

//     if (
//       razorpayPayment.currency &&
//       String(razorpayPayment.currency).toUpperCase() !==
//         String(expectedCurrency).toUpperCase()
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Payment currency mismatch",
//       });
//     }

//     // ========================================================
//     // 9. PAYMENT MUST BE CAPTURED
//     // ========================================================

//     if (razorpayPayment.status !== "captured") {
//       return res.status(400).json({
//         success: false,
//         message: `Payment is not captured. Current status: ${razorpayPayment.status}`,
//       });
//     }

//     // ========================================================
//     // 10. PAYMENT SUCCESS TIMESTAMP
//     //
//     // IMPORTANT:
//     //
//     // Do not manually add +5:30 here.
//     //
//     // MongoDB Date represents the actual instant.
//     // Asia/Kolkata is used only for display formatting.
//     // ========================================================

//     const paidAt = new Date();

//     // ========================================================
//     // 11. FINALIZE SUCCESSFUL PAYMENT
//     //
//     // SAME paidAt will go into:
//     //
//     // Payment.paidAt
//     // PurchaseHistory.paidAt
//     // ========================================================

//     const result = await finalizeSuccessfulPayment({
//       razorpayOrderId: razorpay_order_id,

//       razorpayPaymentId: razorpay_payment_id,

//       razorpaySignature: razorpay_signature,

//       paymentMethod: razorpayPayment.method || null,

//       webhookVerified: false,

//       paidAt,
//     });

//     // ========================================================
//     // 12. INDIA DATE
//     // ========================================================

//     const finalPaidAt = result.paidAt || paidAt;

//     const purchaseDate = new Intl.DateTimeFormat("en-IN", {
//       day: "2-digit",

//       month: "2-digit",

//       year: "numeric",

//       timeZone: "Asia/Kolkata",
//     }).format(finalPaidAt);

//     // ========================================================
//     // 13. INDIA TIME
//     // ========================================================

//     const purchaseTime = new Intl.DateTimeFormat("en-IN", {
//       hour: "2-digit",

//       minute: "2-digit",

//       second: "2-digit",

//       hour12: true,

//       timeZone: "Asia/Kolkata",
//     })
//       .format(finalPaidAt)
//       .toLowerCase();

//     // ========================================================
//     // 14. RESPONSE
//     // ========================================================

//     return res.status(200).json({
//       success: true,

//       message: result.alreadyProcessed
//         ? "Payment already verified and purchase already completed"
//         : "Payment verified and purchase completed successfully",

//       data: {
//         purchaseHistoryId: result.purchaseHistoryId,

//         paymentStatus: "SUCCESS",

//         paidAt: finalPaidAt,

//         purchaseDate,

//         purchaseTime,
//       },
//     });
//   } catch (error) {
//     console.error("VERIFY PAYMENT ERROR:", error);

//     return res.status(error.statusCode || 500).json({
//       success: false,

//       message: error.message || "Unable to verify payment",
//     });
//   }
// };

// export const razorpayWebhook = async (req, res) => {
//   try {
//     const receivedSignature = req.headers["x-razorpay-signature"];

//     const validSignature = verifyRazorpayWebhookSignature({
//       rawBody: req.body,

//       signature: receivedSignature,
//     });

//     if (!validSignature) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid webhook signature",
//       });
//     }

//     const eventData = JSON.parse(req.body.toString());

//     const event = eventData.event;

//     if (event === "payment.captured") {
//       const paymentEntity = eventData.payload.payment.entity;

//       const result = await finalizeSuccessfulPayment({
//         razorpayOrderId: paymentEntity.order_id,

//         razorpayPaymentId: paymentEntity.id,

//         paymentMethod: paymentEntity.method || null,

//         webhookVerified: true,
//       });

//       // PDF will be added here shortly.
//     }

//     return res.status(200).json({
//       success: true,
//     });
//   } catch (error) {
//     console.error("RAZORPAY WEBHOOK ERROR:", error);

//     return res.status(500).json({
//       success: false,
//     });
//   }
// };

// export const getAllOrders = async (req, res) => {
//   try {
//     const orders = await Order.find()
//       .populate({
//         path: "userId",
//         select: "name email phone",
//       })
//       .sort({ createdAt: -1 })
//       .lean();

//     const formattedOrders = orders.map((order) => ({
//       ...order,

//       userDetails: order.userId
//         ? {
//             name: order.userId.name || "",
//             email: order.userId.email || "",
//             number: order.userId.phone || "",
//             amount: order.totalAmount || 0,
//           }
//         : null,

//       userId: order.userId?._id || order.userId,
//     }));

//     return res.status(200).json({
//       success: true,
//       message: "Orders fetched successfully",
//       totalOrders: formattedOrders.length,
//       data: formattedOrders,
//     });
//   } catch (error) {
//     console.error("GET ALL ORDERS ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong while fetching orders",
//       error: error.message,
//     });
//   }
// };

import Order from "../model/OrderModel.js";
import Payment from "../model/PaymentModel.js";
import Asset from "../model/coAssetModel.js";

import razorpay from "../config/razorpay.js";
import cashfree from "../config/cashfree.js";
import crypto from "node:crypto";

import { allocateFractions } from "../services/ownerShipService.js";

import User from "../model/userModel.js";
import mongoose from "mongoose";

import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../utils/razorpaySignature.js";

import { finalizeSuccessfulPayment } from "../services/finalizeSuccessfulPaymentService.js";

// ============================================================
// HELPER: EXPIRE ORDER AND RELEASE RESERVED FRACTIONS
// ============================================================

const expireAndReleaseOrder = async (orderId) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
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
        },
      );

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
        },
      );

      if (assetResult.modifiedCount !== 1) {
        throw new Error(`Unable to release fractions for order ${order._id}`);
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
        },
      );
    });
  } finally {
    await session.endSession();
  }
};

// ============================================================
// CREATE ORDER - RAZORPAY + CASHFREE
// ============================================================

export const createOrder = async (req, res) => {
  let order = null;
  let asset = null;

  try {
    const userId = req.user.id;

    const { assetId, fractions, paymentGateway = "RAZORPAY" } = req.body;

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

    if (!["RAZORPAY", "CASHFREE"].includes(paymentGateway)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment gateway",
      });
    }

    const fractionCount = Number(fractions);

    if (!Number.isInteger(fractionCount) || fractionCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fraction count",
      });
    }

    // =========================
    // KYC CHECK
    // =========================

    const user = await User.findById(userId).select(
      "kycStatus isKycVerified email phone mobile mobileNumber phoneNumber",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.kycStatus !== "VERIFIED" || !user.isKycVerified) {
      return res.status(403).json({
        success: false,
        message: "KYC verification is required before making an investment.",
      });
    }

    // =========================
    // CASHFREE MOBILE VALIDATION
    // =========================

    let customerPhone = null;

    if (paymentGateway === "CASHFREE") {
      const rawPhone =
        user.phoneNumber ?? user.mobileNumber ?? user.mobile ?? user.phone;

      const digits = String(rawPhone ?? "").replace(/\D/g, "");

      customerPhone =
        digits.length === 12 && digits.startsWith("91")
          ? digits.slice(2)
          : digits;

      if (!/^[6-9]\d{9}$/.test(customerPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "A valid registered mobile number is required for Cashfree payment.",
        });
      }
    }

    // =========================
    // RESERVE FRACTIONS +
    // CREATE INTERNAL ORDER
    // =========================

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        asset = await Asset.findOneAndUpdate(
          {
            _id: assetId,

            status: "ACTIVE",

            availableFractions: {
              $gte: fractionCount,
            },

            // Maximum 80% available for public purchase.
            $expr: {
              $lte: [
                {
                  $add: [
                    {
                      $subtract: ["$totalFractions", "$availableFractions"],
                    },
                    fractionCount,
                  ],
                },
                {
                  $floor: {
                    $multiply: ["$totalFractions", 0.8],
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
          },
        );

        if (!asset) {
          const error = new Error(
            "Requested fractions are not available. Maximum 80% of the asset can be purchased by users.",
          );

          error.statusCode = 400;
          throw error;
        }

        const amount = fractionCount * asset.amountPerFraction;

        const createdOrders = await Order.create(
          [
            {
              userId,
              assetId,

              paymentGateway,

              fractions: fractionCount,

              amountPerFraction: asset.amountPerFraction,

              totalAmount: amount,

              status: "PENDING_PAYMENT",

              expiresAt: new Date(Date.now() + 20 * 60 * 1000),
            },
          ],
          {
            session,
          },
        );

        order = createdOrders[0];
      });
    } finally {
      await session.endSession();
    }

    // =========================
    // CREATE PAYMENT GATEWAY ORDER
    // =========================

    let razorpayOrder;
    let cashfreeOrder;

    try {
      if (paymentGateway === "RAZORPAY") {
        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(order.totalAmount * 100),

          currency: "INR",

          receipt: `receipt_${order._id}`,
        });
      } else {
        const cashfreeResponse = await cashfree.PGCreateOrder({
          order_id: `BUNNDLE_${order._id}`,

          order_amount: Number(order.totalAmount.toFixed(2)),

          order_currency: "INR",

          customer_details: {
            customer_id: String(user._id),

            customer_phone: customerPhone,

            ...(user.email ? { customer_email: user.email } : {}),
          },

          order_expiry_time: order.expiresAt.toISOString(),

          order_note: `Bunndle asset purchase ${order._id}`,
        });

        cashfreeOrder = cashfreeResponse.data;

        if (!cashfreeOrder?.order_id || !cashfreeOrder?.payment_session_id) {
          throw new Error("Invalid Cashfree order response");
        }
      }
    } catch (gatewayError) {
      console.error(`${paymentGateway} Order Creation Error:`, gatewayError);

      if (paymentGateway === "RAZORPAY") {
        await expireAndReleaseOrder(order._id);
      }

      // Cashfree may have created the order even if
      // the API request timed out. Reconcile before
      // releasing reserved fractions.

      return res.status(502).json({
        success: false,
        message:
          "Unable to initialize payment. Please check the order status before retrying.",
      });
    }

    // =========================
    // CREATE PAYMENT RECORD
    // =========================

    try {
      await Payment.create({
        userId,

        orderId: order._id,

        paymentGateway,

        razorpayOrderId: razorpayOrder?.id ?? null,

        cashfreeOrderId: cashfreeOrder?.order_id ?? null,

        cashfreeCfOrderId: cashfreeOrder?.cf_order_id
          ? String(cashfreeOrder.cf_order_id)
          : null,

        amount: order.totalAmount,

        status: "PENDING",
      });
    } catch (paymentError) {
      console.error("Payment Record Creation Error:", paymentError);

      if (paymentGateway === "RAZORPAY") {
        await expireAndReleaseOrder(order._id);
      }

      return res.status(500).json({
        success: false,
        message: "Unable to initialize payment. Please try again.",
      });
    }

    // =========================
    // PUBLIC / COMPANY FRACTIONS
    // =========================

    const publicLimit = Math.floor(asset.totalFractions * 0.8);

    const companyReservedFractions = asset.totalFractions - publicLimit;

    const publicUsed = asset.totalFractions - asset.availableFractions;

    const publicAvailableFractions = Math.max(0, publicLimit - publicUsed);

    // =========================
    // RESPONSE
    // =========================

    return res.status(201).json({
      success: true,

      message: "Order created successfully",

      order,

      razorpayOrder,

      ...(paymentGateway === "CASHFREE"
        ? {
            cashfreeOrder: {
              order_id: cashfreeOrder.order_id,

              cf_order_id: cashfreeOrder.cf_order_id,

              payment_session_id: cashfreeOrder.payment_session_id,

              order_status: cashfreeOrder.order_status,
            },
          }
        : {}),

      fractionInfo: {
        totalFractions: asset.totalFractions,

        publicLimit,

        publicAvailableFractions,

        companyReservedFractions,
      },
    });
  } catch (error) {
    console.error("Create Order Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,

      message: error.statusCode
        ? error.message
        : "Something went wrong while creating the order.",
    });
  }
};

// ============================================================
// VERIFY PAYMENT - EXISTING RAZORPAY
// ============================================================

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // ========================================================
    // 1. VALIDATION
    // ========================================================

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required",
      });
    }

    // ========================================================
    // 2. VERIFY CHECKOUT SIGNATURE
    // ========================================================

    const validSignature = verifyRazorpayPaymentSignature({
      razorpayOrderId: razorpay_order_id,

      razorpayPaymentId: razorpay_payment_id,

      razorpaySignature: razorpay_signature,
    });

    if (!validSignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // ========================================================
    // 3. FIND INTERNAL PAYMENT RECORD
    // ========================================================

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // ========================================================
    // 4. FETCH PAYMENT DIRECTLY FROM RAZORPAY
    // ========================================================

    let razorpayPayment;

    try {
      razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (error) {
      console.error("RAZORPAY PAYMENT FETCH ERROR:", error);

      return res.status(400).json({
        success: false,
        message: "Unable to verify payment with Razorpay",
      });
    }

    if (!razorpayPayment) {
      return res.status(400).json({
        success: false,
        message: "Unable to verify payment with Razorpay",
      });
    }

    // ========================================================
    // 5. VERIFY PAYMENT ID
    // ========================================================

    if (razorpayPayment.id && razorpayPayment.id !== razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment ID mismatch",
      });
    }

    // ========================================================
    // 6. VERIFY ORDER RELATION
    // ========================================================

    if (razorpayPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this order",
      });
    }

    // ========================================================
    // 7. VERIFY AMOUNT
    // ========================================================

    const expectedAmount = Math.round(Number(payment.amount) * 100);

    if (Number(razorpayPayment.amount) !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount mismatch",
      });
    }

    // ========================================================
    // 8. VERIFY CURRENCY
    // ========================================================

    const expectedCurrency = payment.currency || "INR";

    if (
      razorpayPayment.currency &&
      String(razorpayPayment.currency).toUpperCase() !==
        String(expectedCurrency).toUpperCase()
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment currency mismatch",
      });
    }

    // ========================================================
    // 9. PAYMENT MUST BE CAPTURED
    // ========================================================

    if (razorpayPayment.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: `Payment is not captured. Current status: ${razorpayPayment.status}`,
      });
    }

    // ========================================================
    // 10. PAYMENT SUCCESS TIMESTAMP
    // ========================================================

    const paidAt = new Date();

    // ========================================================
    // 11. FINALIZE SUCCESSFUL PAYMENT
    // ========================================================

    const result = await finalizeSuccessfulPayment({
      razorpayOrderId: razorpay_order_id,

      razorpayPaymentId: razorpay_payment_id,

      razorpaySignature: razorpay_signature,

      paymentMethod: razorpayPayment.method || null,

      webhookVerified: false,

      paidAt,
    });

    // ========================================================
    // 12. INDIA DATE
    // ========================================================

    const finalPaidAt = result.paidAt || paidAt;

    const purchaseDate = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",

      month: "2-digit",

      year: "numeric",

      timeZone: "Asia/Kolkata",
    }).format(finalPaidAt);

    // ========================================================
    // 13. INDIA TIME
    // ========================================================

    const purchaseTime = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",

      minute: "2-digit",

      second: "2-digit",

      hour12: true,

      timeZone: "Asia/Kolkata",
    })
      .format(finalPaidAt)
      .toLowerCase();

    // ========================================================
    // 14. RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      message: result.alreadyProcessed
        ? "Payment already verified and purchase already completed"
        : "Payment verified and purchase completed successfully",

      data: {
        purchaseHistoryId: result.purchaseHistoryId,

        paymentStatus: "SUCCESS",

        paidAt: finalPaidAt,

        purchaseDate,

        purchaseTime,
      },
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,

      message: error.message || "Unable to verify payment",
    });
  }
};

// ============================================================
// NEW: VERIFY CASHFREE ORDER WITH GATEWAY
//
// Shared by:
// - verifyCashfreePayment
// - cashfreeWebhook
//
// Never trust frontend payment status.
// ============================================================

const verifyCashfreeOrderWithGateway = async (payment, order) => {
  if (!payment || !order || !payment.cashfreeOrderId) {
    return {
      verified: false,
      message: "Cashfree payment details not found",
    };
  }

  if (
    payment.paymentGateway !== "CASHFREE" ||
    order.paymentGateway !== "CASHFREE"
  ) {
    return {
      verified: false,
      message: "Invalid payment gateway",
    };
  }

  const cashfreeOrderId = payment.cashfreeOrderId;

  // ==========================================
  // FETCH ORDER FROM CASHFREE
  // ==========================================

  const orderResponse = await cashfree.PGFetchOrder(cashfreeOrderId);

  const gatewayOrder = orderResponse.data;

  if (!gatewayOrder) {
    return {
      verified: false,
      message: "Cashfree order not found",
    };
  }

  // ==========================================
  // VERIFY ORDER ID
  // ==========================================

  if (gatewayOrder.order_id !== cashfreeOrderId) {
    return {
      verified: false,
      message: "Cashfree order ID mismatch",
    };
  }

  // ==========================================
  // VERIFY ORDER AMOUNT
  //
  // Cashfree order_amount is in rupees.
  // ==========================================

  const expectedAmountPaise = Math.round(Number(order.totalAmount) * 100);

  const gatewayOrderAmountPaise = Math.round(
    Number(gatewayOrder.order_amount) * 100,
  );

  const paymentAmountPaise = Math.round(Number(payment.amount) * 100);

  if (
    !Number.isFinite(expectedAmountPaise) ||
    expectedAmountPaise <= 0 ||
    expectedAmountPaise !== gatewayOrderAmountPaise ||
    expectedAmountPaise !== paymentAmountPaise
  ) {
    return {
      verified: false,
      message: "Cashfree order amount mismatch",
    };
  }

  // ==========================================
  // VERIFY CURRENCY
  // ==========================================

  const expectedCurrency = String(payment.currency || "INR").toUpperCase();

  if (
    String(gatewayOrder.order_currency || "").toUpperCase() !== expectedCurrency
  ) {
    return {
      verified: false,
      message: "Cashfree order currency mismatch",
    };
  }

  // ==========================================
  // ORDER MUST BE PAID
  // ==========================================

  if (gatewayOrder.order_status !== "PAID") {
    return {
      verified: false,
      message: `Cashfree order is not paid. Current status: ${gatewayOrder.order_status}`,
    };
  }

  // ==========================================
  // FETCH PAYMENT TRANSACTIONS
  // ==========================================

  const paymentsResponse = await cashfree.PGOrderFetchPayments(cashfreeOrderId);

  const transactions = paymentsResponse.data;

  if (!Array.isArray(transactions)) {
    return {
      verified: false,
      message: "Unable to fetch Cashfree payment transactions",
    };
  }

  // ==========================================
  // FIND A SUCCESSFUL PAYMENT
  // ==========================================

  const successfulPayment = transactions.find((transaction) => {
    const transactionAmountPaise = Math.round(
      Number(transaction.payment_amount) * 100,
    );

    return (
      transaction.payment_status === "SUCCESS" &&
      transaction.cf_payment_id != null &&
      String(transaction.order_id) === String(cashfreeOrderId) &&
      transactionAmountPaise === expectedAmountPaise &&
      String(transaction.payment_currency || "").toUpperCase() ===
        expectedCurrency
    );
  });

  if (!successfulPayment) {
    return {
      verified: false,
      message: "No successful Cashfree payment found for this order",
    };
  }

  // ==========================================
  // PAYMENT METHOD
  // ==========================================

  const paymentMethod =
    successfulPayment.payment_group ||
    successfulPayment.payment_method?.type ||
    null;

  // ==========================================
  // PAYMENT TIMESTAMP
  // ==========================================

  const gatewayPaidAt = successfulPayment.payment_completion_time;

  const parsedPaidAt = gatewayPaidAt ? new Date(gatewayPaidAt) : new Date();

  const paidAt = Number.isNaN(parsedPaidAt.getTime())
    ? new Date()
    : parsedPaidAt;

  return {
    verified: true,

    cashfreeOrderId,

    cashfreePaymentId: String(successfulPayment.cf_payment_id),

    paymentMethod,

    paidAt,
  };
};

// ============================================================
// NEW: VERIFY CASHFREE PAYMENT
// ============================================================

export const verifyCashfreePayment = async (req, res) => {
  try {
    const userId = req.user.id;

    const { orderId } = req.body;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!orderId || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid orderId is required",
      });
    }

    // ==========================================
    // FIND INTERNAL ORDER
    // ==========================================

    const order = await Order.findOne({
      _id: orderId,

      userId,

      paymentGateway: "CASHFREE",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Cashfree order not found",
      });
    }

    // ==========================================
    // FIND INTERNAL PAYMENT
    // ==========================================

    const payment = await Payment.findOne({
      orderId: order._id,

      userId,

      paymentGateway: "CASHFREE",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Cashfree payment record not found",
      });
    }

    // ==========================================
    // VERIFY DIRECTLY WITH CASHFREE
    // ==========================================

    const verification = await verifyCashfreeOrderWithGateway(payment, order);

    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        message: verification.message,
      });
    }

    // ==========================================
    // FINALIZE PURCHASE
    //
    // Shared service creates PurchaseHistory,
    // allocates Ownership and completes Order.
    // ==========================================

    const result = await finalizeSuccessfulPayment({
      paymentGateway: "CASHFREE",

      cashfreeOrderId: verification.cashfreeOrderId,

      cashfreePaymentId: verification.cashfreePaymentId,

      paymentMethod: verification.paymentMethod,

      webhookVerified: false,

      paidAt: verification.paidAt,
    });

    // ==========================================
    // FORMAT INDIA DATE AND TIME
    // ==========================================

    const finalPaidAt = result.paidAt || verification.paidAt;

    const purchaseDate = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(finalPaidAt);

    const purchaseTime = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
      .format(finalPaidAt)
      .toLowerCase();

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message: result.alreadyProcessed
        ? "Payment already verified and purchase already completed"
        : "Cashfree payment verified and purchase completed successfully",

      data: {
        purchaseHistoryId: result.purchaseHistoryId,

        paymentGateway: "CASHFREE",

        paymentStatus: "SUCCESS",

        cashfreeOrderId: verification.cashfreeOrderId,

        cashfreePaymentId: verification.cashfreePaymentId,

        paidAt: finalPaidAt,

        purchaseDate,

        purchaseTime,
      },
    });
  } catch (error) {
    console.error("VERIFY CASHFREE PAYMENT ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,

      message: error.message || "Unable to verify Cashfree payment",
    });
  }
};

// ============================================================
// RAZORPAY WEBHOOK - EXISTING
// ============================================================

export const razorpayWebhook = async (req, res) => {
  try {
    const receivedSignature = req.headers["x-razorpay-signature"];

    const validSignature = verifyRazorpayWebhookSignature({
      rawBody: req.body,

      signature: receivedSignature,
    });

    if (!validSignature) {
      return res.status(400).json({
        success: false,

        message: "Invalid webhook signature",
      });
    }

    const eventData = JSON.parse(req.body.toString());

    const event = eventData.event;

    if (event === "payment.captured") {
      const paymentEntity = eventData.payload.payment.entity;

      const result = await finalizeSuccessfulPayment({
        razorpayOrderId: paymentEntity.order_id,

        razorpayPaymentId: paymentEntity.id,

        paymentMethod: paymentEntity.method || null,

        webhookVerified: true,
      });

      // PDF will be added here shortly.
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("RAZORPAY WEBHOOK ERROR:", error);

    return res.status(500).json({
      success: false,
    });
  }
};

// ============================================================
// CASHFREE WEBHOOK
// ============================================================

export const cashfreeWebhook = async (req, res) => {
  try {
    // ==========================================
    // RAW BODY VALIDATION
    // ==========================================

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Raw webhook body is required",
      });
    }

    const rawBody = req.body.toString("utf8");

    const receivedSignature = req.headers["x-webhook-signature"];

    const timestamp = req.headers["x-webhook-timestamp"];

    if (
      typeof receivedSignature !== "string" ||
      typeof timestamp !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing Cashfree webhook headers",
      });
    }

    // ==========================================
    // VERIFY CASHFREE SIGNATURE
    // ==========================================

    const secret = process.env.CASHFREE_CLIENT_SECRET;

    if (!secret) {
      throw new Error("Cashfree webhook credentials not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(timestamp + rawBody)
      .digest("base64");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    const receivedBuffer = Buffer.from(receivedSignature, "utf8");

    const validSignature =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!validSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Cashfree webhook signature",
      });
    }

    // ==========================================
    // PARSE VERIFIED WEBHOOK
    // ==========================================

    const eventData = JSON.parse(rawBody);

    const event = eventData.type;

    // ==========================================
    // PAYMENT SUCCESS EVENT
    // ==========================================

    if (event === "PAYMENT_SUCCESS_WEBHOOK") {
      const cashfreeOrderId = eventData.data?.order?.order_id;

      const webhookPayment = eventData.data?.payment;

      if (
        !cashfreeOrderId ||
        !webhookPayment?.cf_payment_id ||
        webhookPayment.payment_status !== "SUCCESS"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid Cashfree payment event",
        });
      }

      // ========================================
      // FIND PAYMENT
      // ========================================

      const payment = await Payment.findOne({
        cashfreeOrderId,
        paymentGateway: "CASHFREE",
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found",
        });
      }

      const order = await Order.findById(payment.orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // ========================================
      // VERIFY PAYMENT DIRECTLY WITH CASHFREE
      // ========================================

      const verification = await verifyCashfreeOrderWithGateway(payment, order);

      if (!verification.verified) {
        return res.status(503).json({
          success: false,
          message: "Payment not yet verified",
        });
      }

      if (
        verification.cashfreePaymentId !== String(webhookPayment.cf_payment_id)
      ) {
        return res.status(409).json({
          success: false,
          message: "Webhook payment ID does not match verified payment",
        });
      }

      // ========================================
      // FINALIZE PURCHASE
      // ========================================

      await finalizeSuccessfulPayment({
        paymentGateway: "CASHFREE",

        cashfreeOrderId: verification.cashfreeOrderId,

        cashfreePaymentId: verification.cashfreePaymentId,

        paymentMethod: verification.paymentMethod,

        webhookVerified: true,

        paidAt: verification.paidAt,
      });
    }

    // ==========================================
    // ACKNOWLEDGE WEBHOOK
    // ==========================================

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("CASHFREE WEBHOOK ERROR:", error);

    return res.status(500).json({
      success: false,
    });
  }
};

// ============================================================
// GET ALL ORDERS - EXISTING
// ============================================================

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedOrders = orders.map((order) => ({
      ...order,

      userDetails: order.userId
        ? {
            name: order.userId.name || "",

            email: order.userId.email || "",

            number: order.userId.phone || "",

            amount: order.totalAmount || 0,
          }
        : null,

      userId: order.userId?._id || order.userId,
    }));

    return res.status(200).json({
      success: true,

      message: "Orders fetched successfully",

      totalOrders: formattedOrders.length,

      data: formattedOrders,
    });
  } catch (error) {
    console.error("GET ALL ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,

      message: "Something went wrong while fetching orders",

      error: error.message,
    });
  }
};
