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
  createPayUPaymentHash,
  verifyPayUResponseHash,
  fetchPayUTransaction,
  toPaise,
} from "../services/payu_sevice.js";
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../utils/razorpaySignature.js";

import { finalizeSuccessfulPayment } from "../services/finalizeSuccessfulPaymentService.js";



// const expireAndReleaseOrder = async (orderId) => {
//   const session = await mongoose.startSession();

//   try {
//     await session.withTransaction(async () => {
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


// ============================================================
// CREATE ORDER - RAZORPAY + CASHFREE
// ============================================================


const expireAndReleaseOrder = async (orderId) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Only expire Razorpay orders when
      // gateway initialization has failed.
      const order = await Order.findOneAndUpdate(
        {
          _id: orderId,
          paymentGateway: "RAZORPAY",
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

      // Already processed or not a Razorpay order.
      if (!order) {
        return;
      }

      // Release reserved fractions.
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
        throw new Error(
          `Unable to release fractions for order ${order._id}`,
        );
      }

      // Expire pending payment records.
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
export const createOrder = async (req, res) => {
  let order = null;
  let asset = null;

  try {
    const userId = req.user.id;

    const { assetId, fractions, paymentGateway =  "PAYU" } = req.body;

    // ==========================================
    // VALIDATION
    // ==========================================

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

    // ==========================================
    // ALL THREE PAYMENT GATEWAYS ENABLED
    // ==========================================

    const allowedGateways = [
      // "RAZORPAY",
      // "CASHFREE",
      "PAYU",
    ];
    if (!allowedGateways.includes(paymentGateway)) {
      return res.status(400).json({
        success: false,
        message: "This payment gateway is currently unavailable.",
      });
    }

   

    const fractionCount = Number(fractions);

    if (!Number.isInteger(fractionCount) || fractionCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fraction count",
      });
    }

    // ==========================================
    // PAYU CONFIGURATION VALIDATION
    // ==========================================

    if (paymentGateway === "PAYU") {
      if (
        process.env.PAYU_ENV !== "PRODUCTION" ||
        !process.env.PAYU_MERCHANT_KEY ||
        !process.env.PAYU_MERCHANT_SALT ||
        !process.env.PAYU_SUCCESS_URL ||
        !process.env.PAYU_FAILURE_URL
      ) {
        console.error("PAYU PRODUCTION CONFIGURATION MISSING");

        return res.status(503).json({
          success: false,
          message: "PayU payment service is currently unavailable.",
        });
      }
    }

    // ==========================================
    // KYC CHECK
    // ==========================================

    const user = await User.findById(userId).select(
      "name kycStatus isKycVerified email phone mobile mobileNumber phoneNumber",
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

    // ==========================================
    // CUSTOMER DETAILS
    // ==========================================

    let customerPhone = null;
    let customerName = null;
    let customerEmail = null;

    // Cashfree and PayU require phone details.

    if (paymentGateway === "CASHFREE" || paymentGateway === "PAYU") {
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
          message: "A valid registered mobile number is required for payment.",
        });
      }
    }

    // ==========================================
    // PAYU CUSTOMER VALIDATION
    // ==========================================

    if (paymentGateway === "PAYU") {
      customerName = String(user.name ?? "").trim();

      customerEmail = String(user.email ?? "").trim();

      if (!customerName) {
        return res.status(400).json({
          success: false,
          message: "Customer name is required for PayU payment.",
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        return res.status(400).json({
          success: false,
          message: "Valid customer email is required for PayU payment.",
        });
      }
    }

    // ==========================================
    // GENERATE PAYU TRANSACTION ID
    // ==========================================

    let payuTxnId = null;

    if (paymentGateway === "PAYU") {
      // 22 characters, alphanumeric.
      // PayU Checkout Pro allows up to 25.

      payuTxnId = "BN" + crypto.randomBytes(10).toString("hex");
    }

    // ==========================================
    // RESERVE FRACTIONS +
    // CREATE INTERNAL ORDER
    // ==========================================

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

            // Maximum 80% public purchase.

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

        // ======================================
        // CALCULATE AMOUNT
        // ======================================

        const amount = fractionCount * asset.amountPerFraction;

        if (!Number.isFinite(amount) || amount <= 0) {
          const error = new Error("Invalid asset payment amount");

          error.statusCode = 400;

          throw error;
        }

        // ======================================
        // CREATE INTERNAL ORDER
        // ======================================

        const createdOrders = await Order.create(
          [
            {
              userId,

              assetId,

              paymentGateway,

              payuTxnId: paymentGateway === "PAYU" ? payuTxnId : null,

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

        // ======================================
        // CREATE PAYU PENDING PAYMENT
        // ======================================
        // PayU does not require an additional
        // gateway order creation API.
        //
        // Creating its pending payment inside
        // the transaction prevents orphaned
        // reservations if database creation fails.

        if (paymentGateway === "PAYU") {
          await Payment.create(
            [
              {
                userId,

                orderId: order._id,

                paymentGateway: "PAYU",

                payuTxnId,

                payuMihpayId: null,

                amount: order.totalAmount,

                currency: "INR",

                status: "PENDING",
              },
            ],
            {
              session,
            },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    // ==========================================
    // CREATE PAYMENT GATEWAY ORDER
    // ==========================================

    let razorpayOrder = null;
    let cashfreeOrder = null;
    let payuOrder = null;

    try {
      // ======================================
      // RAZORPAY
      // ======================================

      if (paymentGateway === "RAZORPAY") {
        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(order.totalAmount * 100),

          currency: "INR",

          receipt: `receipt_${order._id}`,
        });
      }

      // ======================================
      // CASHFREE
      // ======================================
      else if (paymentGateway === "CASHFREE") {
        const cashfreeResponse = await cashfree.PGCreateOrder({
          order_id: `BUNNDLE_${order._id}`,

          order_amount: Number(order.totalAmount.toFixed(2)),

          order_currency: "INR",

          customer_details: {
            customer_id: String(user._id),

            customer_phone: customerPhone,

            ...(user.email
              ? {
                  customer_email: user.email,
                }
              : {}),
          },

          order_expiry_time: order.expiresAt.toISOString(),

          order_note: `Bunndle asset purchase ${order._id}`,
        });

        cashfreeOrder = cashfreeResponse.data;

        if (!cashfreeOrder?.order_id || !cashfreeOrder?.payment_session_id) {
          throw new Error("Invalid Cashfree order response");
        }
      }

      // ======================================
      // PAYU LIVE
      // ======================================
      else if (paymentGateway === "PAYU") {
        const amount = Number(order.totalAmount).toFixed(2);

        // Merchant-generated checkout parameters.
        // Flutter uses these with Checkout Pro.
        //
        // Hashes must be generated securely
        // by a separate backend endpoint.

        payuOrder = {
          orderId: String(order._id),

          transactionId: payuTxnId,

          merchantKey: process.env.PAYU_MERCHANT_KEY,

          amount,

          currency: "INR",

          productInfo: "Bunndle Asset Purchase",

          firstName: customerName,

          email: customerEmail,

          phone: customerPhone,

          surl: process.env.PAYU_SUCCESS_URL,

          furl: process.env.PAYU_FAILURE_URL,

          environment: "0",

          isProduction: true,
        };
      }
    } catch (gatewayError) {
      console.error(`${paymentGateway} Order Creation Error:`, gatewayError);

      if (paymentGateway === "RAZORPAY") {
        await expireAndReleaseOrder(order._id);
      }

      // Cashfree may have created its order
      // despite a timeout. Reconcile first.

      return res.status(502).json({
        success: false,
        message:
          "Unable to initialize payment. Please check the order status before retrying.",
      });
    }

    // ==========================================
    // CREATE PAYMENT RECORD
    // ==========================================
    // PayU Payment already created in transaction.

    if (paymentGateway !== "PAYU") {
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
    }

    // ==========================================
    // PUBLIC / COMPANY FRACTIONS
    // ==========================================

    const publicLimit = Math.floor(asset.totalFractions * 0.8);

    const companyReservedFractions = asset.totalFractions - publicLimit;

    const publicUsed = asset.totalFractions - asset.availableFractions;

    const publicAvailableFractions = Math.max(0, publicLimit - publicUsed);

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message: "Order created successfully",

      order,

      razorpayOrder,

      // ======================================
      // CASHFREE RESPONSE
      // ======================================

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

      // ======================================
      // PAYU RESPONSE
      // ======================================

      ...(paymentGateway === "PAYU"
        ? {
            payuOrder,
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
// CONFIGURATION
// ============================================================

const PRODUCT_INFO = "Bunndle Asset Purchase";

const PAYU_TXN_REGEX = /^BN[a-f0-9]{20}$/;

// ============================================================
// HELPERS
// ============================================================

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?._id ||
    req.user?.userId ||
    null
  );
};

const getAmount = (amount) => {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw createError(409, "Invalid payment amount");
  }

  return value.toFixed(2);
};

const getPurchaseDateTime = (paidAt) => {
  const date = new Date(paidAt);

  return {
    paidAt: date,

    purchaseDate: new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(date),

    purchaseTime: new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
      .format(date)
      .toLowerCase(),
  };
};

// ============================================================
// SHARED PAYU RECONCILIATION
// ============================================================
// Called by:
// 1. Customer verification
// 2. Payment return callback
// 3. Payment webhook
//
// IMPORTANT:
// Payment is independently verified using
// PayU's server-side Verify Payment API.
// ============================================================

const reconcilePayUOrder = async ({
  order,
  webhookVerified = false,
  callbackMihpayId = null,
}) => {
  // ========================================================
  // 1. VALIDATE ORDER
  // ========================================================

  if (
    !order ||
    order.paymentGateway !== "PAYU" ||
    !PAYU_TXN_REGEX.test(order.payuTxnId || "")
  ) {
    throw createError(400, "Invalid PayU order");
  }

  // ========================================================
  // 2. FIND PAYMENT RECORD
  // ========================================================

  const payment = await Payment.findOne({
    orderId: order._id,
    paymentGateway: "PAYU",
    payuTxnId: order.payuTxnId,
  });

  if (!payment) {
    throw createError(
      404,
      "PayU payment record not found",
    );
  }

  if (
    String(payment.userId) !== String(order.userId)
  ) {
    throw createError(
      409,
      "Order and payment customer mismatch",
    );
  }

  // ========================================================
  // 3. CHECK STORED PAYMENT AMOUNT
  // ========================================================

  const orderAmount = toPaise(
    getAmount(order.totalAmount),
  );

  const paymentAmount = toPaise(
    getAmount(payment.amount),
  );

  if (
    orderAmount === null ||
    paymentAmount === null ||
    orderAmount !== paymentAmount
  ) {
    throw createError(
      409,
      "Stored order and payment amount mismatch",
    );
  }

  if (
    String(payment.currency || "INR").toUpperCase() !==
    "INR"
  ) {
    throw createError(
      409,
      "Invalid payment currency",
    );
  }

  // ========================================================
  // 4. FETCH TRANSACTION DIRECTLY FROM PAYU
  // ========================================================

  const gateway = await fetchPayUTransaction(
    order.payuTxnId,
  );

  if (!gateway.transaction) {
    return {
      status: gateway.status || "NOT_CONFIRMED",
      orderId: String(order._id),
      payuTxnId: order.payuTxnId,
    };
  }

  const transaction = gateway.transaction;

  // ========================================================
  // 5. VERIFY TRANSACTION ID
  // ========================================================

  if (
    transaction.txnid != null &&
    String(transaction.txnid) !==
      String(order.payuTxnId)
  ) {
    throw createError(
      409,
      "PayU transaction ID mismatch",
    );
  }

  // ========================================================
  // 6. VERIFY PAYMENT AMOUNT
  // ========================================================

  const receivedAmount = toPaise(
    transaction.transaction_amount ??
      transaction.amt,
  );

  if (
    receivedAmount === null ||
    receivedAmount !== orderAmount
  ) {
    throw createError(
      409,
      "PayU payment amount mismatch",
    );
  }

  // ========================================================
  // 7. VERIFY MERCHANT KEY
  // ========================================================

  if (
    transaction.key != null &&
    String(transaction.key) !==
      String(process.env.PAYU_MERCHANT_KEY)
  ) {
    throw createError(
      409,
      "PayU merchant key mismatch",
    );
  }

  // ========================================================
  // 8. VERIFY PRODUCT INFORMATION
  // ========================================================

  if (
    transaction.productinfo != null &&
    String(transaction.productinfo) !==
      PRODUCT_INFO
  ) {
    throw createError(
      409,
      "PayU product information mismatch",
    );
  }

  // ========================================================
  // 9. VERIFY CURRENCY
  // ========================================================

  if (
    transaction.currency != null &&
    String(transaction.currency).toUpperCase() !==
      "INR"
  ) {
    throw createError(
      409,
      "PayU currency mismatch",
    );
  }

  // ========================================================
  // 10. PAYMENT MUST BE SUCCESSFUL
  // ========================================================

  if (!gateway.verified) {
    return {
      status: gateway.status || "NOT_CONFIRMED",
      orderId: String(order._id),
      payuTxnId: order.payuTxnId,
    };
  }

  // ========================================================
  // 11. VERIFY PAYU PAYMENT ID
  // ========================================================

  const payuMihpayId = String(
    transaction.mihpayid ?? "",
  ).trim();

  if (
    !payuMihpayId ||
    payuMihpayId === "Not Found"
  ) {
    throw createError(
      409,
      "PayU payment ID not found",
    );
  }

  // ========================================================
  // 12. COMPARE CALLBACK PAYMENT ID
  // ========================================================

  if (
    callbackMihpayId != null &&
    String(callbackMihpayId) !== payuMihpayId
  ) {
    throw createError(
      409,
      "PayU callback payment ID mismatch",
    );
  }

  // ========================================================
  // 13. VERIFY STORED PAYMENT ID
  // ========================================================

  if (
    payment.payuMihpayId &&
    String(payment.payuMihpayId) !==
      payuMihpayId
  ) {
    throw createError(
      409,
      "PayU payment reference mismatch",
    );
  }

  // ========================================================
  // 14. CHECK DUPLICATE PAYMENT REFERENCE
  // ========================================================

  const duplicatePayment = await Payment.findOne({
    _id: { $ne: payment._id },
    payuMihpayId,
  });

  if (duplicatePayment) {
    throw createError(
      409,
      "PayU payment reference already used",
    );
  }

  // ========================================================
  // 15. CHECK EXPIRED OR RELEASED ORDER
  // ========================================================

  if (
    order.status !== "COMPLETED" &&
    (
      order.status !== "PENDING_PAYMENT" ||
      !Number.isFinite(
        new Date(order.expiresAt).getTime(),
      ) ||
      new Date(order.expiresAt).getTime() <= Date.now()
    )
  ) {
    return {
      status: "RECONCILIATION_REQUIRED",
      orderId: String(order._id),
      payuTxnId: order.payuTxnId,
      payuMihpayId,
      message:
        "Payment succeeded but order reservation is no longer active",
    };
  }

  // ========================================================
  // 16. FINALIZE SUCCESSFUL PAYMENT
  // ========================================================
  // Handles:
  // - MongoDB transaction
  // - Ownership allocation
  // - Reserved fractions
  // - Payment SUCCESS
  // - Order COMPLETED
  // - PurchaseHistory
  // - Welcome email
  // ========================================================

  const result = await finalizeSuccessfulPayment({
    paymentGateway: "PAYU",

    payuTxnId: order.payuTxnId,

    payuMihpayId,

    paymentMethod: transaction.mode || null,

    webhookVerified,

    paidAt: new Date(),
  });

  // ========================================================
  // 17. RETURN COMPLETED PURCHASE
  // ========================================================

  return {
    status: "COMPLETED",

    orderId: result.orderId,

    paymentId: result.paymentId,

    purchaseHistoryId: result.purchaseHistoryId,

    paymentStatus: "SUCCESS",

    alreadyProcessed: result.alreadyProcessed,

    payuTxnId: order.payuTxnId,

    payuMihpayId,

    ...getPurchaseDateTime(result.paidAt),
  };
};

// ============================================================
// 1. GENERATE PAYU PAYMENT HASH
// ============================================================



// These dynamic command formats must be
// validated against the SDK payload used
// by your installed PayU version.
// Do not add arbitrary hash names.

const PAYU_SDK_COMMANDS = Object.freeze({
  get_sdk_configuration: ["get_sdk_configuration"],
  get_checkout_details: ["get_checkout_details"],
  getBinInfo: ["getBinInfo", "get_bin_info"],
  validateVPA: ["validateVPA", "validate_vpa"],
  vas_for_mobile_sdk: ["vas_for_mobile_sdk"],
  payment_related_details_for_mobile_sdk: [
    "payment_related_details_for_mobile_sdk",
  ],
  get_eligible_payment_options: [
    "get_eligible_payment_options",
  ],
});

const PAYU_PRODUCT_INFO = "Bunndle Asset Purchase";
const PAYU_HASH_MAX_AGE_MS = 5 * 60 * 1000;

const normalizePayUPhone = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .replace(/^91(?=\d{10}$)/, "");

// ==========================================
// SPECIAL SDK HASH REQUESTS
// ==========================================

const validatePayUSpecialHash = ({
  hashName,
  hashString,
  merchantKey,
  order,
  user,
}) => {
  if (
    hashName !== "quickPayEvent" &&
    hashName !== "get_all_offer_details"
  ) {
    return { handled: false, valid: false };
  }

  // Observed SDK format:
  // JSON_PAYLOAD|HTTP_DATE|

  const firstPipe = hashString.indexOf("|");
  const lastPipe = hashString.lastIndexOf("|");

  if (
    firstPipe <= 0 ||
    lastPipe !== hashString.length - 1 ||
    lastPipe <= firstPipe + 1
  ) {
    return { handled: true, valid: false };
  }

  const jsonText = hashString.slice(0, firstPipe);
  const httpDate = hashString.slice(
    firstPipe + 1,
    lastPipe
  );

  // Reject additional pipe delimiters
  // and stale request timestamps.
  if (httpDate.includes("|")) {
    return { handled: true, valid: false };
  }

  const timestamp = Date.parse(httpDate);

  if (
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() - timestamp) >
      PAYU_HASH_MAX_AGE_MS
  ) {
    return { handled: true, valid: false };
  }

  let payload;

  try {
    payload = JSON.parse(jsonText);
  } catch {
    return { handled: true, valid: false };
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return { handled: true, valid: false };
  }

  const expectedAmount = Number(order.totalAmount);

  if (
    !Number.isFinite(Number(payload.amount)) ||
    Number(payload.amount) !== expectedAmount
  ) {
    return { handled: true, valid: false };
  }

  if (hashName === "get_all_offer_details") {
    // Observed payload:
    // {"amount":1}

    const keys = Object.keys(payload);

    return {
      handled: true,
      valid:
        keys.length === 1 &&
        keys[0] === "amount",
    };
  }

  // ======================================
  // QUICK PAY EVENT
  // ======================================

  const expectedCredential =
    `${merchantKey}:${String(user.email).trim()}`;

  const requestId = payload.requestId;

  if (
    payload.requestType !== "quickpay" ||
    payload.userCredential !== expectedCredential ||
    typeof requestId !== "string" ||
    !new RegExp(
      `^${order.payuTxnId}\\d{10,16}$`
    ).test(requestId) ||
    typeof payload.deviceId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(
      payload.deviceId
    )
  ) {
    return { handled: true, valid: false };
  }

  // The SDK was observed sending either
  // empty phone or registered phone.

  const sentPhone = normalizePayUPhone(
    payload.phone ?? ""
  );

  const registeredPhone = normalizePayUPhone(
    user.phoneNumber ??
      user.mobileNumber ??
      user.mobile ??
      user.phone
  );

  if (
    sentPhone &&
    sentPhone !== registeredPhone
  ) {
    return { handled: true, valid: false };
  }

  if (
    payload.userToken != null &&
    typeof payload.userToken !== "string"
  ) {
    return { handled: true, valid: false };
  }

  const allowedFields = new Set([
    "amount",
    "userToken",
    "phone",
    "requestId",
    "requestType",
    "deviceId",
    "userCredential",
  ]);

  if (
    Object.keys(payload).some(
      (key) => !allowedFields.has(key)
    )
  ) {
    return { handled: true, valid: false };
  }

  return { handled: true, valid: true };
};

// ==========================================
// GENERATE PAYU HASH
// ==========================================

// export const generatePayUHash = async (req, res) => {
//   try {
//     // ======================================
//     // 1. AUTHENTICATION
//     // ======================================

//     const userId = getUserId(req);

//     if (!mongoose.isValidObjectId(userId)) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized user",
//       });
//     }

//     // ======================================
//     // 2. REQUEST VALIDATION
//     // ======================================

//     const {
//       orderId,
//       hashName,
//       hashString,
//       hashType,
//       postSalt,
//     } = req.body || {};

//     if (!mongoose.isValidObjectId(orderId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Valid orderId is required",
//       });
//     }

//     if (
//       typeof hashName !== "string" ||
//       !hashName.trim() ||
//       typeof hashString !== "string" ||
//       !hashString.trim() ||
//       hashName.length > 128 ||
//       hashString.length > 4096
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "hashName and hashString are required",
//       });
//     }

//     if (
//       hashType != null &&
//       hashType !== "" &&
//       hashType !== "V1" &&
//       hashType !== "V2"
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Unsupported PayU hash type",
//       });
//     }

//     if (
//       postSalt != null &&
//       typeof postSalt !== "string"
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid PayU postSalt",
//       });
//     }

//     // ======================================
//     // 3. ACTIVE PAYU ORDER
//     // ======================================

//     const order = await Order.findOne({
//       _id: orderId,
//       userId,
//       paymentGateway: "PAYU",
//       status: "PENDING_PAYMENT",
//       expiresAt: { $gt: new Date() },
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message:
//           "Active PayU order not found or expired",
//       });
//     }

//     // ======================================
//     // 4. TRANSACTION ID
//     // ======================================

//     const transactionId = String(
//       order.payuTxnId || ""
//     );

//     if (!/^BN[a-f0-9]{20}$/.test(transactionId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid PayU transaction ID",
//       });
//     }

//     // ======================================
//     // 5. PENDING PAYMENT RECORD
//     // ======================================

//     const payment = await Payment.findOne({
//       orderId: order._id,
//       userId,
//       paymentGateway: "PAYU",
//       payuTxnId: transactionId,
//       status: "PENDING",
//     });

//     if (!payment) {
//       return res.status(409).json({
//         success: false,
//         message:
//           "Pending PayU payment not found",
//       });
//     }

//     // ======================================
//     // 6. AMOUNT CHECK
//     // ======================================

//     const orderAmount = Number(
//       order.totalAmount
//     );

//     const paymentAmount = Number(
//       payment.amount
//     );

//     if (
//       !Number.isFinite(orderAmount) ||
//       !Number.isFinite(paymentAmount) ||
//       orderAmount <= 0 ||
//       paymentAmount <= 0
//     ) {
//       return res.status(409).json({
//         success: false,
//         message: "Invalid payment amount",
//       });
//     }

//     const amount = orderAmount.toFixed(2);
//     const orderPaise = toPaise(amount);

//     if (
//       orderPaise === null ||
//       orderPaise !==
//         toPaise(paymentAmount.toFixed(2))
//     ) {
//       return res.status(409).json({
//         success: false,
//         message:
//           "Order and payment amount mismatch",
//       });
//     }

//     // ======================================
//     // 7. PAYU LIVE CONFIGURATION
//     // ======================================

//     const merchantKey =
//       process.env.PAYU_MERCHANT_KEY;

//     const merchantSalt =
//       process.env.PAYU_MERCHANT_SALT;

//     if (
//       process.env.PAYU_ENV !== "PRODUCTION" ||
//       !merchantKey ||
//       !merchantSalt
//     ) {
//       return res.status(503).json({
//         success: false,
//         message:
//           "PayU LIVE configuration missing",
//       });
//     }

//     // ======================================
//     // 8. CUSTOMER DETAILS
//     // ======================================

//     const user = await User.findById(
//       order.userId
//     ).select(
//       "name email phone phoneNumber mobile mobileNumber"
//     );

//     if (!user?.name || !user?.email) {
//       return res.status(400).json({
//         success: false,
//         message: "Customer details missing",
//       });
//     }

//     const firstname = String(
//       user.name
//     ).trim();

//     const email = String(
//       user.email
//     ).trim();

//     const registeredPhone =
//       normalizePayUPhone(
//         user.phoneNumber ??
//         user.mobileNumber ??
//         user.mobile ??
//         user.phone
//       );

//     // ======================================
//     // 9. BLOCK UNSUPPORTED TYPES
//     // ======================================

//     if (hashName === "mcpLookup") {
//       return res.status(400).json({
//         success: false,
//         message:
//           "MCP hash generation is not configured",
//       });
//     }

//     if (postSalt) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Post-salt hash requests are not enabled",
//       });
//     }

//     // ======================================
//     // 10. SPECIAL SDK HASH REQUESTS
//     // ======================================

//     const specialValidation =
//       validatePayUSpecialHash({
//         hashName,
//         hashString,
//         merchantKey,
//         order,
//         user,
//       });

//     if (specialValidation.handled) {
//       if (
//         !specialValidation.valid ||
//         hashType === "V2"
//       ) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Invalid PayU special hash request",
//         });
//       }
//     } else {
//       // ====================================
//       // 11. STANDARD HASH VALIDATION
//       // ====================================

//       const parts = hashString.split("|");

//       if (parts[0] !== merchantKey) {
//         return res.status(400).json({
//           success: false,
//           message: "PayU merchant key mismatch",
//         });
//       }

//       // ====================================
//       // 12. PAYMENT / PAYMENT_SOURCE
//       // ====================================

//       if (
//         hashName === "payment" ||
//         hashName === "payment_source"
//       ) {
//         if (hashType === "V2") {
//           return res.status(400).json({
//             success: false,
//             message:
//               "V2 payment hash is not configured",
//           });
//         }

//         // Standard PayU hash input:
//         //
//         // key|txnid|amount|productinfo|
//         // firstname|email|udf1|...|udf5||||||
//         //
//         // Eleven empty fields after email
//         // produce the required delimiters.

//         const expectedHashString = [
//           merchantKey,
//           transactionId,
//           amount,
//           PAYU_PRODUCT_INFO,
//           firstname,
//           email,
//           "", "", "", "", "",
//           "", "", "", "", "", "",
//         ].join("|");

//         if (
//           hashString !== expectedHashString
//         ) {
//           console.warn(
//             "PAYU PAYMENT HASH MISMATCH:",
//             {
//               orderId: String(order._id),
//               hashName,
//             }
//           );

//           return res.status(400).json({
//             success: false,
//             message:
//               "PayU payment parameters do not match order",
//           });
//         }
//       } else {
//         // ==================================
//         // 13. SDK COMMAND VALIDATION
//         // ==================================

//         const allowedCommands =
//           PAYU_SDK_COMMANDS[hashName];

//         if (
//           !Array.isArray(allowedCommands) ||
//           parts.length < 3 ||
//           !allowedCommands.includes(
//             parts[1]
//           )
//         ) {
//           return res.status(400).json({
//             success: false,
//             message:
//               "Unsupported or invalid PayU SDK hash request",
//           });
//         }

//         // Reject different Bunndle txn IDs.
//         const txnIds =
//           hashString.match(
//             /BN[a-f0-9]{20}/g
//           ) || [];

//         if (
//           txnIds.some(
//             (id) => id !== transactionId
//           )
//         ) {
//           return res.status(400).json({
//             success: false,
//             message:
//               "PayU transaction ID mismatch",
//           });
//         }

//         // ==================================
//         // 14. SDK CONFIGURATION
//         // ==================================

//         if (
//           hashName === "get_sdk_configuration"
//         ) {
//           if (
//             hashString !==
//               `${merchantKey}|get_sdk_configuration|GET|`
//           ) {
//             return res.status(400).json({
//               success: false,
//               message:
//                 "Invalid SDK configuration request",
//             });
//           }
//         }

//         // ==================================
//         // 15. CHECKOUT DETAILS
//         // ==================================

//         if (
//           hashName === "get_checkout_details"
//         ) {
//           if (
//             parts.length !== 4 ||
//             parts[3] !== ""
//           ) {
//             return res.status(400).json({
//               success: false,
//               message:
//                 "Invalid checkout details format",
//             });
//           }

//           let checkout;

//           try {
//             checkout = JSON.parse(
//               parts[2]
//             );
//           } catch {
//             return res.status(400).json({
//               success: false,
//               message:
//                 "Invalid checkout details JSON",
//             });
//           }

//           const transactionDetails =
//             checkout?.transactionDetails;

//           const customerDetails =
//             checkout?.customerDetails;

//           const sdkTxnId =
//             transactionDetails?.txnId;

//           const sdkAmount =
//             transactionDetails?.amount;

//           const sdkPhone =
//             normalizePayUPhone(
//               customerDetails?.mobile
//             );

//           if (
//             sdkTxnId !== transactionId ||
//             sdkAmount === undefined ||
//             toPaise(String(sdkAmount)) !==
//               orderPaise ||
//             sdkPhone !== registeredPhone ||
//             transactionDetails?.source !==
//               "Android_SDK" ||
//             checkout?.isSITxn !== false ||
//             typeof checkout?.requestId !==
//               "string" ||
//             !new RegExp(
//               `^${transactionId}\\d{10,16}$`
//             ).test(checkout.requestId)
//           ) {
//             return res.status(400).json({
//               success: false,
//               message:
//                 "PayU checkout details do not match order",
//             });
//           }

//           const allowedUseCases = new Set([
//             "getAdditionalCharges",
//             "getTaxSpecification",
//             "checkDownStatus",
//             "getExtendedPaymentDetails",
//             "checkCustomerEligibility",
//             "getMerchantDetails",
//             "getPaymentDetailsWithExtraFields",
//             "getSdkDetails",
//           ]);

//           if (
//             !checkout.useCase ||
//             typeof checkout.useCase !== "object" ||
//             Array.isArray(checkout.useCase) ||
//             Object.entries(
//               checkout.useCase
//             ).some(
//               ([key, value]) =>
//                 !allowedUseCases.has(key) ||
//                 typeof value !== "boolean"
//             )
//           ) {
//             return res.status(400).json({
//               success: false,
//               message:
//                 "Invalid checkout use-case parameters",
//             });
//           }

//           const allowedCheckoutKeys =
//             new Set([
//               "requestId",
//               "transactionDetails",
//               "customerDetails",
//               "useCase",
//               "isSITxn",
//             ]);

//           if (
//             Object.keys(checkout).some(
//               (key) =>
//                 !allowedCheckoutKeys.has(key)
//             ) ||
//             Object.keys(
//               transactionDetails
//             ).some(
//               (key) =>
//                 !["amount", "txnId", "source"]
//                   .includes(key)
//             ) ||
//             Object.keys(
//               customerDetails
//             ).some(
//               (key) => key !== "mobile"
//             )
//           ) {
//             return res.status(400).json({
//               success: false,
//               message:
//                 "Unexpected checkout details fields",
//             });
//           }
//         }

//         // Other SDK commands must have their
//         // own exact argument validation before
//         // being enabled in LIVE mode.
//         if (
//           hashName !== "get_sdk_configuration" &&
//           hashName !== "get_checkout_details"
//         ) {
//           return res.status(400).json({
//             success: false,
//             message:
//               "SDK command needs additional validation",
//           });
//         }
//       }
//     }

//     // ======================================
//     // 16. GENERATE HASH
//     // ======================================

//     let generatedHash;

//     if (hashType === "V2") {
//       generatedHash = crypto
//         .createHmac(
//           "sha256",
//           merchantSalt
//         )
//         .update(
//           hashString,
//           "utf8"
//         )
//         .digest("hex");
//     } else {
//       generatedHash = crypto
//         .createHash("sha512")
//         .update(
//           `${hashString}${merchantSalt}`,
//           "utf8"
//         )
//         .digest("hex");
//     }

//     // ======================================
//     // 17. SAFE LOG
//     // ======================================

//     console.log(
//       "PAYU HASH GENERATED:",
//       {
//         orderId: String(order._id),
//         hashName,
//         hashType: hashType || "V1",
//         specialHash:
//           specialValidation.handled,
//       }
//     );

//     // ======================================
//     // 18. SUCCESS RESPONSE
//     // ======================================

//     return res.status(200).json({
//       success: true,
//       message:
//         "PayU hash generated successfully",
//       data: {
//         orderId: String(order._id),
//         transactionId,
//         hashName,
//         hash: generatedHash,
//       },
//     });
//   } catch (error) {
//     console.error(
//       "GENERATE PAYU HASH ERROR:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message:
//         "Unable to generate PayU hash",
//     });
//   }
// };




export const generatePayUHash = async (req, res) => {
  try {
    // ======================================
    // 1. AUTHENTICATION
    // ======================================

    const userId = getUserId(req);

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    // ======================================
    // 2. REQUEST VALIDATION
    // ======================================

    const {
      orderId,
      hashName,
      hashString,
      hashType,
      postSalt,
    } = req.body || {};

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid orderId is required",
      });
    }

    if (
      typeof hashName !== "string" ||
      !hashName.trim() ||
      typeof hashString !== "string" ||
      !hashString.trim() ||
      hashName.length > 128 ||
      hashString.length > 4096
    ) {
      return res.status(400).json({
        success: false,
        message: "hashName and hashString are required",
      });
    }

    if (
      hashType != null &&
      hashType !== "" &&
      hashType !== "V1" &&
      hashType !== "V2"
    ) {
      return res.status(400).json({
        success: false,
        message: "Unsupported PayU hash type",
      });
    }

    if (
      postSalt != null &&
      typeof postSalt !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid PayU postSalt",
      });
    }

    // ======================================
    // 3. ACTIVE PAYU ORDER
    // ======================================

    const order = await Order.findOne({
      _id: orderId,
      userId,
      paymentGateway: "PAYU",
      status: "PENDING_PAYMENT",
      expiresAt: { $gt: new Date() },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Active PayU order not found or expired",
      });
    }

    // ======================================
    // 4. TRANSACTION ID
    // ======================================

    const transactionId = String(
      order.payuTxnId || ""
    );

    if (!/^BN[a-f0-9]{20}$/.test(transactionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PayU transaction ID",
      });
    }

    // ======================================
    // 5. PENDING PAYMENT
    // ======================================

    const payment = await Payment.findOne({
      orderId: order._id,
      userId,
      paymentGateway: "PAYU",
      payuTxnId: transactionId,
      status: "PENDING",
    });

    if (!payment) {
      return res.status(409).json({
        success: false,
        message: "Pending PayU payment not found",
      });
    }

    // ======================================
    // 6. AMOUNT VALIDATION
    // ======================================

    const orderAmount = Number(order.totalAmount);
    const paymentAmount = Number(payment.amount);

    if (
      !Number.isFinite(orderAmount) ||
      !Number.isFinite(paymentAmount) ||
      orderAmount <= 0 ||
      paymentAmount <= 0
    ) {
      return res.status(409).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const amount = orderAmount.toFixed(2);
    const orderPaise = toPaise(amount);

    if (
      orderPaise === null ||
      orderPaise !== toPaise(paymentAmount.toFixed(2))
    ) {
      return res.status(409).json({
        success: false,
        message: "Order and payment amount mismatch",
      });
    }

    // ======================================
    // 7. PAYU LIVE CONFIGURATION
    // ======================================

    const merchantKey = process.env.PAYU_MERCHANT_KEY;
    const merchantSalt = process.env.PAYU_MERCHANT_SALT;

    if (
      process.env.PAYU_ENV !== "PRODUCTION" ||
      !merchantKey ||
      !merchantSalt
    ) {
      return res.status(503).json({
        success: false,
        message: "PayU LIVE configuration missing",
      });
    }

    // ======================================
    // 8. CUSTOMER DETAILS
    // ======================================

    const user = await User.findById(order.userId).select(
      "name email phone phoneNumber mobile mobileNumber"
    );

    if (!user?.name || !user?.email) {
      return res.status(400).json({
        success: false,
        message: "Customer details missing",
      });
    }

    const firstname = String(user.name).trim();
    const email = String(user.email).trim();

    const registeredPhone = normalizePayUPhone(
      user.phoneNumber ??
      user.mobileNumber ??
      user.mobile ??
      user.phone
    );

    if (!registeredPhone) {
      return res.status(400).json({
        success: false,
        message: "Customer phone missing",
      });
    }

    // ======================================
    // 9. BLOCK UNSUPPORTED HASH TYPES
    // ======================================

    if (hashName === "mcpLookup") {
      return res.status(400).json({
        success: false,
        message: "MCP hash generation is not configured",
      });
    }

    if (postSalt) {
      return res.status(400).json({
        success: false,
        message: "Post-salt hash requests are not enabled",
      });
    }

    // Common safe JSON parser
    const parseObject = (value) => {
      try {
        const parsed = JSON.parse(value);

        if (
          !parsed ||
          typeof parsed !== "object" ||
          Array.isArray(parsed)
        ) {
          return null;
        }

        return parsed;
      } catch {
        return null;
      }
    };

    const hasOnlyKeys = (value, allowedKeys) => {
      return (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).every((key) =>
          allowedKeys.has(key)
        )
      );
    };

    const amountMatches = (value) => {
      if (
        typeof value !== "string" &&
        typeof value !== "number"
      ) {
        return false;
      }

      const paise = toPaise(String(value));

      return paise !== null && paise === orderPaise;
    };

    // ======================================
    // 10. IOS QUICK PAY HASH VALIDATION
    // ======================================

    let specialValidation = {
      handled: false,
      valid: false,
    };

    if (hashName === "fetch_quick_pay_option") {
      specialValidation.handled = true;

      if (hashType === "V2") {
        return res.status(400).json({
          success: false,
          message: "Unsupported iOS quick-pay hash type",
        });
      }

      // iOS format:
      // JSON|Thu, 19 Nov 2026 14:43:19|
      const match = hashString.match(
        /^(\{[^\r\n]*\})\|([^|\r\n]+)\|$/
      );

      if (!match) {
        return res.status(400).json({
          success: false,
          message: "Invalid iOS quick-pay format",
        });
      }

      const quickPay = parseObject(match[1]);
      const timestamp = match[2];

      const allowedQuickPayKeys = new Set([
        "phone",
        "userCredential",
        "userToken",
        "amount",
        "deviceId",
      ]);

      const timestampValid =
        /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2}(?: GMT)?$/.test(
          timestamp
        );

      // Interpret the SDK timestamp as UTC.
      const requestTime = timestampValid
        ? Date.parse(
            timestamp.endsWith(" GMT")
              ? timestamp
              : `${timestamp} GMT`
          )
        : NaN;

      const recentTimestamp =
        Number.isFinite(requestTime) &&
        Math.abs(Date.now() - requestTime) <=
          15 * 60 * 1000;

      const validQuickPay =
        hasOnlyKeys(quickPay, allowedQuickPayKeys) &&
        typeof quickPay.phone === "string" &&
        normalizePayUPhone(quickPay.phone) ===
          registeredPhone &&
        quickPay.userCredential ===
          `${merchantKey}:${email}` &&
        quickPay.userToken === "" &&
        amountMatches(quickPay.amount) &&
        typeof quickPay.deviceId === "string" &&
        /^[A-Za-z0-9-]{8,128}$/.test(
          quickPay.deviceId
        ) &&
        recentTimestamp;

      if (!validQuickPay) {
        return res.status(400).json({
          success: false,
          message:
            "iOS quick-pay parameters do not match order",
        });
      }

      specialValidation.valid = true;
    } else {
      // ====================================
      // 11. EXISTING ANDROID SPECIAL HASHES
      // ====================================

      specialValidation = validatePayUSpecialHash({
        hashName,
        hashString,
        merchantKey,
        order,
        user,
      });
    }

    // ======================================
    // 12. SPECIAL HASH RESULT
    // ======================================

    if (specialValidation.handled) {
      if (
        !specialValidation.valid ||
        hashType === "V2"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid PayU special hash request",
        });
      }
    } else {
      // ====================================
      // 13. STANDARD HASH
      // ====================================

      const parts = hashString.split("|");

      if (parts[0] !== merchantKey) {
        return res.status(400).json({
          success: false,
          message: "PayU merchant key mismatch",
        });
      }

      // ====================================
      // 14. PAYMENT / PAYMENT_SOURCE
      // ====================================

      if (
        hashName === "payment" ||
        hashName === "payment_source"
      ) {
        if (hashType === "V2") {
          return res.status(400).json({
            success: false,
            message: "V2 payment hash is not configured",
          });
        }

        const expectedHashString = [
          merchantKey,
          transactionId,
          amount,
          PAYU_PRODUCT_INFO,
          firstname,
          email,
          "", "", "", "", "",
          "", "", "", "", "", "",
        ].join("|");

        if (hashString !== expectedHashString) {
          return res.status(400).json({
            success: false,
            message:
              "PayU payment parameters do not match order",
          });
        }
      } else {
        // ==================================
        // 15. SDK COMMAND VALIDATION
        // ==================================

        // iOS additionally requests
        // eligibleBinsForEMI.
        const allowedCommands =
          hashName === "eligibleBinsForEMI"
            ? ["eligibleBinsForEMI"]
            : PAYU_SDK_COMMANDS[hashName];

        if (
          !Array.isArray(allowedCommands) ||
          parts.length < 3 ||
          !allowedCommands.includes(parts[1])
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Unsupported or invalid PayU SDK hash request",
          });
        }

        const txnIds =
          hashString.match(/BN[a-f0-9]{20}/g) || [];

        if (
          txnIds.some((id) => id !== transactionId)
        ) {
          return res.status(400).json({
            success: false,
            message: "PayU transaction ID mismatch",
          });
        }

        // ==================================
        // 16. SDK CONFIGURATION
        // ==================================

        if (hashName === "get_sdk_configuration") {
          if (
            hashString !==
            `${merchantKey}|get_sdk_configuration|GET|`
          ) {
            return res.status(400).json({
              success: false,
              message: "Invalid SDK configuration request",
            });
          }
        }

        // ==================================
        // 16A. IOS EMI ELIGIBILITY HASH
        // ==================================

        if (hashName === "eligibleBinsForEMI") {
          if (
            hashType === "V2" ||
            hashString !==
              `${merchantKey}|eligibleBinsForEMI|default|`
          ) {
            return res.status(400).json({
              success: false,
              message: "Invalid eligibleBinsForEMI request",
            });
          }
        }

        // ==================================
        // 17. CHECKOUT DETAILS
        // ANDROID + IOS
        // ==================================

        if (hashName === "get_checkout_details") {
          if (
            parts.length !== 4 ||
            parts[3] !== ""
          ) {
            return res.status(400).json({
              success: false,
              message: "Invalid checkout details format",
            });
          }

          const checkout = parseObject(parts[2]);

          if (!checkout) {
            return res.status(400).json({
              success: false,
              message: "Invalid checkout details JSON",
            });
          }

          const transactionDetails =
            checkout.transactionDetails;

          const customerDetails =
            checkout.customerDetails;

          if (
            !transactionDetails ||
            typeof transactionDetails !== "object" ||
            Array.isArray(transactionDetails) ||
            !customerDetails ||
            typeof customerDetails !== "object" ||
            Array.isArray(customerDetails)
          ) {
            return res.status(400).json({
              success: false,
              message: "Invalid checkout details",
            });
          }

          const source = transactionDetails.source;

          const isAndroid = source === "Android_SDK";
          const isIOS = source === "IOS_SDK";

          if (!isAndroid && !isIOS) {
            return res.status(400).json({
              success: false,
              message: "Unsupported PayU SDK platform",
            });
          }

          const sdkTxnId = transactionDetails.txnId;
          const sdkAmount = transactionDetails.amount;

          const sdkPhone = normalizePayUPhone(
            customerDetails.mobile
          );

          // Android: BN... + numeric suffix
          // iOS: requestId equals txnId

          const requestId = checkout.requestId;

          const validRequestId = isAndroid
            ? typeof requestId === "string" &&
              new RegExp(
                `^${transactionId}\\d{10,16}$`
              ).test(requestId)
            : requestId === transactionId;

          // Android requires isSITxn: false.
          // iOS may omit this field.
          const validSIField = isAndroid
            ? checkout.isSITxn === false
            : checkout.isSITxn === undefined ||
              checkout.isSITxn === false;

          if (
            sdkTxnId !== transactionId ||
            !amountMatches(sdkAmount) ||
            sdkPhone !== registeredPhone ||
            !validRequestId ||
            !validSIField
          ) {
            return res.status(400).json({
              success: false,
              message:
                "PayU checkout details do not match order",
            });
          }

          const allowedUseCases = new Set([
            "getAdditionalCharges",
            "getTaxSpecification",
            "checkDownStatus",
            "getExtendedPaymentDetails",
            "checkCustomerEligibility",
            "getMerchantDetails",
            "getPaymentDetailsWithExtraFields",
            "getSdkDetails",
          ]);

          if (
            !checkout.useCase ||
            typeof checkout.useCase !== "object" ||
            Array.isArray(checkout.useCase) ||
            Object.entries(checkout.useCase).some(
              ([key, value]) =>
                !allowedUseCases.has(key) ||
                typeof value !== "boolean"
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid checkout use-case parameters",
            });
          }

          const allowedCheckoutKeys = new Set([
            "requestId",
            "transactionDetails",
            "customerDetails",
            "useCase",
            "isSITxn",
          ]);

          const allowedTxnKeys = new Set([
            "amount",
            "txnId",
            "source",
          ]);

          const allowedCustomerKeys = new Set([
            "mobile",
          ]);

          if (
            !hasOnlyKeys(checkout, allowedCheckoutKeys) ||
            !hasOnlyKeys(
              transactionDetails,
              allowedTxnKeys
            ) ||
            !hasOnlyKeys(
              customerDetails,
              allowedCustomerKeys
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Unexpected checkout details fields",
            });
          }
        }

        // Only explicitly validated commands
        // are enabled for LIVE signing.
        if (
          hashName !== "get_sdk_configuration" &&
          hashName !== "get_checkout_details" &&
          hashName !== "eligibleBinsForEMI"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "SDK command needs additional validation",
          });
        }
      }
    }

    // ======================================
    // 18. GENERATE REQUESTED HASH
    // ======================================

    let generatedHash;

    if (hashType === "V2") {
      generatedHash = crypto
        .createHmac("sha256", merchantSalt)
        .update(hashString, "utf8")
        .digest("hex");
    } else {
      generatedHash = crypto
        .createHash("sha512")
        .update(
          `${hashString}${merchantSalt}`,
          "utf8"
        )
        .digest("hex");
    }

    // ======================================
    // 19. SAFE LOGGING
    // ======================================

    console.log("PAYU HASH GENERATED:", {
      orderId: String(order._id),
      hashName,
      hashType: hashType || "V1",
      specialHash: specialValidation.handled,
    });

    // ======================================
    // 20. SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "PayU hash generated successfully",
      data: {
        orderId: String(order._id),
        transactionId,
        hashName,
        hash: generatedHash,
      },
    });
  } catch (error) {
    console.error(
      "GENERATE PAYU HASH ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to generate PayU hash",
    });
  }
};






// ============================================================
// 2. VERIFY PAYU PAYMENT
// ============================================================

export const verifyPayUPayment = async (req, res) => {
  try {
    const { orderId } = req.body || {};

    const userId = getUserId(req);

    // ======================================================
    // VALIDATION
    // ======================================================

    if (
      !mongoose.isValidObjectId(orderId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user or order ID",
      });
    }

    // ======================================================
    // FIND CUSTOMER'S PAYU ORDER
    // ======================================================

    const order = await Order.findOne({
      _id: orderId,
      userId,
      paymentGateway: "PAYU",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "PayU order not found",
      });
    }

    // ======================================================
    // RECONCILE WITH PAYU
    // ======================================================

    const result = await reconcilePayUOrder({
      order,
      webhookVerified: false,
    });

    // ======================================================
    // COMPLETED PURCHASE
    // ======================================================

    if (result.status === "COMPLETED") {
      return res.status(200).json({
        success: true,

        message: result.alreadyProcessed
          ? "Payment already verified and purchase completed"
          : "Payment verified and purchase completed successfully",

        data: result,
      });
    }

    // ======================================================
    // PENDING / FAILED / RECONCILIATION
    // ======================================================

    return res.status(200).json({
      success: false,

      message:
        result.status === "RECONCILIATION_REQUIRED"
          ? "Payment requires manual reconciliation"
          : "PayU payment not completed",

      data: result,
    });
  } catch (error) {
    console.error(
      "VERIFY PAYU PAYMENT ERROR:",
      error,
    );

    return res.status(
      error.statusCode || 502,
    ).json({
      success: false,

      message: error.statusCode
        ? error.message
        : "Unable to verify PayU payment",
    });
  }
};

// ============================================================
// SHARED PAYU CALLBACK HANDLER
// ============================================================

const handlePayUCallback = async (
  req,
  res,
  source,
) => {
  try {
    const body = req.body || {};

    // ======================================================
    // 1. VALIDATE TRANSACTION ID
    // ======================================================

    if (
      typeof body.txnid !== "string" ||
      !PAYU_TXN_REGEX.test(body.txnid)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid PayU transaction ID",
      });
    }

    // ======================================================
    // 2. VERIFY PAYU RESPONSE HASH
    // ======================================================

    if (!verifyPayUResponseHash(body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PayU response hash",
      });
    }

    // ======================================================
    // 3. FIND ORDER
    // ======================================================

    const order = await Order.findOne({
      paymentGateway: "PAYU",
      payuTxnId: body.txnid,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "PayU order not found",
      });
    }

    // ======================================================
    // 4. VERIFY CALLBACK AMOUNT
    // ======================================================

    const expectedAmount = toPaise(
      getAmount(order.totalAmount),
    );

    const callbackAmount = toPaise(
      body.amount,
    );

    if (
      expectedAmount === null ||
      callbackAmount === null ||
      expectedAmount !== callbackAmount
    ) {
      return res.status(409).json({
        success: false,
        message: "PayU callback amount mismatch",
      });
    }

    // ======================================================
    // 5. VERIFY PRODUCT INFO
    // ======================================================

    if (body.productinfo !== PRODUCT_INFO) {
      return res.status(409).json({
        success: false,
        message: "Invalid PayU product information",
      });
    }

    // ======================================================
    // 6. SERVER-SIDE VERIFICATION
    // ======================================================

    const result = await reconcilePayUOrder({
      order,

      webhookVerified: source === "WEBHOOK",

      callbackMihpayId: body.mihpayid || null,
    });

    // ======================================================
    // 7. SUCCESSFULLY COMPLETED
    // ======================================================

    if (result.status === "COMPLETED") {
      return res.status(200).json({
        success: true,

        message:
          "PayU payment verified and purchase completed",

        data: result,
      });
    }

    // ======================================================
    // 8. EXPIRED ORDER RECONCILIATION
    // ======================================================

    if (result.status === "RECONCILIATION_REQUIRED") {
      console.error(
        "PAYU PAYMENT RECONCILIATION REQUIRED:",
        {
          orderId: String(order._id),
          payuTxnId: order.payuTxnId,
          payuMihpayId: result.payuMihpayId,
        },
      );

      return res.status(
        source === "WEBHOOK" ? 503 : 202,
      ).json({
        success: false,

        message:
          "PayU payment succeeded but order requires reconciliation",

        data: result,
      });
    }

    // ======================================================
    // 9. PENDING / FAILED PAYMENT
    // ======================================================

    return res.status(200).json({
      success: false,

      message: "PayU payment not completed",

      data: result,
    });
  } catch (error) {
    console.error(
      `PAYU ${source} ERROR:`,
      error,
    );

    return res.status(
      error.statusCode || 503,
    ).json({
      success: false,

      message: error.statusCode
        ? error.message
        : "Unable to process PayU callback",
    });
  }
};

// ============================================================
// 3. PAYU SUCCESS / FAILURE RETURN CALLBACK
// ============================================================

export const payuPaymentReturn = async (
  req,
  res,
) => {
  return handlePayUCallback(
    req,
    res,
    "RETURN",
  );
};

// ============================================================
// 4. PAYU WEBHOOK
// ============================================================

export const payuWebhook = async (
  req,
  res,
) => {
  return handlePayUCallback(
    req,
    res,
    "WEBHOOK",
  );
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
