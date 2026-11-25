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
import {
  getExpectedPaymentAmount,
} from "../utils/payment_charges.js";

// const expireAndReleaseOrder = async (orderId) => {
//   const session = await mongoose.startSession();

//   try {
//     await session.withTransaction(async () => {
//       // Only expire Razorpay orders when
//       // gateway initialization has failed.
//       const order = await Order.findOneAndUpdate(
//         {
//           _id: orderId,
//           paymentGateway: "RAZORPAY",
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

//       // Already processed or not a Razorpay order.
//       if (!order) {
//         return;
//       }

//       // Release reserved fractions.
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
//         throw new Error(
//           `Unable to release fractions for order ${order._id}`,
//         );
//       }

//       // Expire pending payment records.
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

const expireAndReleaseOrder = async (
  orderId,
  { initializationFailed = false, gatewayReconciled = false } = {},
) => {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const now = new Date();

      // ============================================
      // 1. FIND ORDER
      // ============================================

      const order = await Order.findById(orderId).session(session);

      if (!order) {
        return {
          expired: false,
          reason: "ORDER_NOT_FOUND",
        };
      }

      // Only pending orders can expire.
      if (order.status !== "PENDING_PAYMENT") {
        return {
          expired: false,
          reason: "ORDER_NOT_PENDING",
        };
      }

      const isManual = order.paymentGateway === "MANUAL";

      const isOnline = ["RAZORPAY", "CASHFREE", "PAYU"].includes(
        order.paymentGateway,
      );

      if (!isManual && !isOnline) {
        return {
          expired: false,
          reason: "INVALID_PAYMENT_GATEWAY",
        };
      }

      // ============================================
      // 2. CHECK EXPIRY CONDITIONS
      // ============================================

      if (initializationFailed) {
        if (order.paymentGateway !== "RAZORPAY") {
          return {
            expired: false,
            reason: "INVALID_INITIALIZATION_FAILURE",
          };
        }
      } else {
        if (
          !order.expiresAt ||
          new Date(order.expiresAt).getTime() > now.getTime()
        ) {
          return {
            expired: false,
            reason: "ORDER_NOT_EXPIRED",
          };
        }
      }

      // ============================================
      // 3. CHECK PAYMENT RECORDS
      // ============================================

      const payments = await Payment.find({
        orderId: order._id,
      }).session(session);

      // Never expire successful payments.
      if (payments.some((payment) => payment.status === "SUCCESS")) {
        return {
          expired: false,
          reason: "PAYMENT_ALREADY_SUCCESSFUL",
        };
      }

      // Manual payments under admin verification
      // should not expire automatically.
      if (
        isManual &&
        payments.some((payment) =>
          ["PENDING_VERIFICATION", "REVIEW_REQUIRED", "APPROVED"].includes(
            payment.manualVerificationStatus,
          ),
        )
      ) {
        return {
          expired: false,
          reason: "MANUAL_PAYMENT_UNDER_REVIEW",
        };
      }

      // Online payments must be reconciled with
      // the provider before automatic release.
      if (isOnline && !initializationFailed && !gatewayReconciled) {
        return {
          expired: false,
          reason: "GATEWAY_RECONCILIATION_REQUIRED",
        };
      }

      // ============================================
      // 4. CHECK PURCHASE HISTORY
      // ============================================

      const existingPurchase = await PurchaseHistory.findOne({
        orderId: order._id,
      }).session(session);

      if (existingPurchase) {
        return {
          expired: false,
          reason: "PURCHASE_ALREADY_CREATED",
        };
      }

      // ============================================
      // 5. EXPIRE ORDER ATOMICALLY
      // ============================================

      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          status: "PENDING_PAYMENT",
        },
        {
          $set: {
            status: "EXPIRED",
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!updatedOrder) {
        return {
          expired: false,
          reason: "ORDER_STATUS_CHANGED",
        };
      }

      // ============================================
      // 6. RELEASE FRACTIONS - ONLINE ONLY
      // ============================================

      let fractionsReleased = 0;

      if (isOnline) {
        const fractions = Number(order.fractions);

        if (!Number.isSafeInteger(fractions) || fractions <= 0) {
          throw new Error(`Invalid fractions for order ${order._id}`);
        }

        const assetResult = await Asset.updateOne(
          {
            _id: order.assetId,

            reservedFractions: {
              $gte: fractions,
            },
          },
          {
            $inc: {
              availableFractions: fractions,
              reservedFractions: -fractions,
            },
          },
          {
            session,
          },
        );

        if (assetResult.modifiedCount !== 1) {
          throw new Error(
            `Unable to release reserved fractions for order ${order._id}`,
          );
        }

        fractionsReleased = fractions;
      }

      // ============================================
      // 7. EXPIRE PENDING PAYMENT RECORDS
      // ============================================

      const paymentUpdate = {
        status: "EXPIRED",
      };

      if (isManual) {
        paymentUpdate.manualVerificationStatus = "EXPIRED";
      }

      await Payment.updateMany(
        {
          orderId: order._id,
          status: "PENDING",
        },
        {
          $set: paymentUpdate,
        },
        {
          session,
        },
      );

      console.log(
        `[ORDER EXPIRED] ${order._id} | ` +
          `Gateway: ${order.paymentGateway} | ` +
          `Fractions released: ${fractionsReleased}`,
      );

      return {
        expired: true,
        orderId: order._id,
        gateway: order.paymentGateway,
        fractionsReleased,
      };
    });
  } catch (error) {
    console.error(`ORDER EXPIRY ERROR: ${orderId}`, error);

    throw error;
  } finally {
    await session.endSession();
  }
};

// export const createOrder = async (req, res) => {
//   let order = null;
//   let asset = null;

//   try {
//     const userId = req.user.id;

//     const { assetId, fractions, paymentGateway = "PAYU" } = req.body;

//     // ==========================================
//     // VALIDATION
//     // ==========================================

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

//     // ==========================================
//     // ALL THREE PAYMENT GATEWAYS ENABLED
//     // ==========================================

//     const allowedGateways = [
//       // "RAZORPAY",
//       "CASHFREE",
//       "PAYU",
//     ];
//     if (!allowedGateways.includes(paymentGateway)) {
//       return res.status(400).json({
//         success: false,
//         message: "This payment gateway is currently unavailable.",
//       });
//     }

//     const fractionCount = Number(fractions);

//     if (!Number.isInteger(fractionCount) || fractionCount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid fraction count",
//       });
//     }

//     // ==========================================
//     // PAYU CONFIGURATION VALIDATION
//     // ==========================================

//     if (paymentGateway === "PAYU") {
//       if (
//         process.env.PAYU_ENV !== "PRODUCTION" ||
//         !process.env.PAYU_MERCHANT_KEY ||
//         !process.env.PAYU_MERCHANT_SALT ||
//         !process.env.PAYU_SUCCESS_URL ||
//         !process.env.PAYU_FAILURE_URL
//       ) {
//         console.error("PAYU PRODUCTION CONFIGURATION MISSING");

//         return res.status(503).json({
//           success: false,
//           message: "PayU payment service is currently unavailable.",
//         });
//       }
//     }

//     // ==========================================
//     // KYC CHECK
//     // ==========================================

//     const user = await User.findById(userId).select(
//       "name kycStatus isKycVerified email phone mobile mobileNumber phoneNumber",
//     );

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

//     // ==========================================
//     // CUSTOMER DETAILS
//     // ==========================================

//     let customerPhone = null;
//     let customerName = null;
//     let customerEmail = null;

//     // Cashfree and PayU require phone details.

//     if (paymentGateway === "CASHFREE" || paymentGateway === "PAYU") {
//       const rawPhone =
//         user.phoneNumber ?? user.mobileNumber ?? user.mobile ?? user.phone;

//       const digits = String(rawPhone ?? "").replace(/\D/g, "");

//       customerPhone =
//         digits.length === 12 && digits.startsWith("91")
//           ? digits.slice(2)
//           : digits;

//       if (!/^[6-9]\d{9}$/.test(customerPhone)) {
//         return res.status(400).json({
//           success: false,
//           message: "A valid registered mobile number is required for payment.",
//         });
//       }
//     }

//     // ==========================================
//     // PAYU CUSTOMER VALIDATION
//     // ==========================================

//     if (paymentGateway === "PAYU") {
//       customerName = String(user.name ?? "").trim();

//       customerEmail = String(user.email ?? "").trim();

//       if (!customerName) {
//         return res.status(400).json({
//           success: false,
//           message: "Customer name is required for PayU payment.",
//         });
//       }

//       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
//         return res.status(400).json({
//           success: false,
//           message: "Valid customer email is required for PayU payment.",
//         });
//       }
//     }

//     // ==========================================
//     // GENERATE PAYU TRANSACTION ID
//     // ==========================================

//     let payuTxnId = null;

//     if (paymentGateway === "PAYU") {
//       // 22 characters, alphanumeric.
//       // PayU Checkout Pro allows up to 25.

//       payuTxnId = "BN" + crypto.randomBytes(10).toString("hex");
//     }

//     // ==========================================
//     // RESERVE FRACTIONS +
//     // CREATE INTERNAL ORDER
//     // ==========================================

//     const session = await mongoose.startSession();

//     try {
//       await session.withTransaction(async () => {
//         asset = await Asset.findOneAndUpdate(
//           {
//             _id: assetId,

//             status: "ACTIVE",

//             availableFractions: {
//               $gte: fractionCount,
//             },

//             // Maximum 80% public purchase.

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

//         // ======================================
//         // CALCULATE AMOUNT
//         // ======================================

//         const amount = fractionCount * asset.amountPerFraction;

//         if (!Number.isFinite(amount) || amount <= 0) {
//           const error = new Error("Invalid asset payment amount");

//           error.statusCode = 400;

//           throw error;
//         }

//         // ======================================
//         // CREATE INTERNAL ORDER
//         // ======================================

//         const createdOrders = await Order.create(
//           [
//             {
//               userId,

//               assetId,

//               paymentGateway,

//               payuTxnId: paymentGateway === "PAYU" ? payuTxnId : null,

//               fractions: fractionCount,

//               amountPerFraction: asset.amountPerFraction,

//               totalAmount: amount,

//               status: "PENDING_PAYMENT",

//               expiresAt: new Date(Date.now() + 20 * 60 * 1000),
//             },
//           ],
//           {
//             session,
//           },
//         );

//         order = createdOrders[0];

//         // ======================================
//         // CREATE PAYU PENDING PAYMENT
//         // ======================================
//         // PayU does not require an additional
//         // gateway order creation API.
//         //
//         // Creating its pending payment inside
//         // the transaction prevents orphaned
//         // reservations if database creation fails.

//         if (paymentGateway === "PAYU") {
//           await Payment.create(
//             [
//               {
//                 userId,

//                 orderId: order._id,

//                 paymentGateway: "PAYU",

//                 payuTxnId,

//                 payuMihpayId: null,

//                 amount: order.totalAmount,

//                 currency: "INR",

//                 status: "PENDING",
//               },
//             ],
//             {
//               session,
//             },
//           );
//         }
//       });
//     } finally {
//       await session.endSession();
//     }

//     // ==========================================
//     // CREATE PAYMENT GATEWAY ORDER
//     // ==========================================

//     let razorpayOrder = null;
//     let cashfreeOrder = null;
//     let payuOrder = null;

//     try {
//       // ======================================
//       // RAZORPAY
//       // ======================================

//       if (paymentGateway === "RAZORPAY") {
//         razorpayOrder = await razorpay.orders.create({
//           amount: Math.round(order.totalAmount * 100),

//           currency: "INR",

//           receipt: `receipt_${order._id}`,
//         });
//       }

//       // ======================================
//       // CASHFREE
//       // ======================================
//       else if (paymentGateway === "CASHFREE") {
//         const cashfreeResponse = await cashfree.PGCreateOrder({
//           order_id: `BUNNDLE_${order._id}`,

//           order_amount: Number(order.totalAmount.toFixed(2)),

//           order_currency: "INR",

//           customer_details: {
//             customer_id: String(user._id),

//             customer_phone: customerPhone,

//             ...(user.email
//               ? {
//                   customer_email: user.email,
//                 }
//               : {}),
//           },

//           order_expiry_time: order.expiresAt.toISOString(),

//           order_note: `Bunndle asset purchase ${order._id}`,
//         });

//         cashfreeOrder = cashfreeResponse.data;

//         if (!cashfreeOrder?.order_id || !cashfreeOrder?.payment_session_id) {
//           throw new Error("Invalid Cashfree order response");
//         }
//       }

//       // ======================================
//       // PAYU LIVE
//       // ======================================
//       else if (paymentGateway === "PAYU") {
//         const amount = Number(order.totalAmount).toFixed(2);

//         // Merchant-generated checkout parameters.
//         // Flutter uses these with Checkout Pro.
//         //
//         // Hashes must be generated securely
//         // by a separate backend endpoint.

//         payuOrder = {
//           orderId: String(order._id),

//           transactionId: payuTxnId,

//           merchantKey: process.env.PAYU_MERCHANT_KEY,

//           amount,

//           currency: "INR",

//           productInfo: "Bunndle Asset Purchase",

//           firstName: customerName,

//           email: customerEmail,

//           phone: customerPhone,

//           surl: process.env.PAYU_SUCCESS_URL,

//           furl: process.env.PAYU_FAILURE_URL,

//           environment: "0",

//           isProduction: true,
//         };
//       }
//     } catch (gatewayError) {
//       console.error(`${paymentGateway} Order Creation Error:`, gatewayError);

//       if (paymentGateway === "RAZORPAY") {
//         await expireAndReleaseOrder(order._id);
//       }

//       // Cashfree may have created its order
//       // despite a timeout. Reconcile first.

//       return res.status(502).json({
//         success: false,
//         message:
//           "Unable to initialize payment. Please check the order status before retrying.",
//       });
//     }

//     // ==========================================
//     // CREATE PAYMENT RECORD
//     // ==========================================
//     // PayU Payment already created in transaction.

//     if (paymentGateway !== "PAYU") {
//       try {
//         await Payment.create({
//           userId,

//           orderId: order._id,

//           paymentGateway,

//           razorpayOrderId: razorpayOrder?.id ?? null,

//           cashfreeOrderId: cashfreeOrder?.order_id ?? null,

//           cashfreeCfOrderId: cashfreeOrder?.cf_order_id
//             ? String(cashfreeOrder.cf_order_id)
//             : null,

//           amount: order.totalAmount,

//           status: "PENDING",
//         });
//       } catch (paymentError) {
//         console.error("Payment Record Creation Error:", paymentError);

//         if (paymentGateway === "RAZORPAY") {
//           await expireAndReleaseOrder(order._id);
//         }

//         return res.status(500).json({
//           success: false,
//           message: "Unable to initialize payment. Please try again.",
//         });
//       }
//     }

//     // ==========================================
//     // PUBLIC / COMPANY FRACTIONS
//     // ==========================================

//     const publicLimit = Math.floor(asset.totalFractions * 0.8);

//     const companyReservedFractions = asset.totalFractions - publicLimit;

//     const publicUsed = asset.totalFractions - asset.availableFractions;

//     const publicAvailableFractions = Math.max(0, publicLimit - publicUsed);

//     // ==========================================
//     // RESPONSE
//     // ==========================================

//     return res.status(201).json({
//       success: true,

//       message: "Order created successfully",

//       order,

//       razorpayOrder,

//       // ======================================
//       // CASHFREE RESPONSE
//       // ======================================

//       ...(paymentGateway === "CASHFREE"
//         ? {
//             cashfreeOrder: {
//               order_id: cashfreeOrder.order_id,

//               cf_order_id: cashfreeOrder.cf_order_id,

//               payment_session_id: cashfreeOrder.payment_session_id,

//               order_status: cashfreeOrder.order_status,
//             },
//           }
//         : {}),

//       // ======================================
//       // PAYU RESPONSE
//       // ======================================

//       ...(paymentGateway === "PAYU"
//         ? {
//             payuOrder,
//           }
//         : {}),

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

// ============================================================
// VERIFY PAYMENT - EXISTING RAZORPAY
// ============================================================



export const createOrder = async (req, res) => {
  let order = null;
  let asset = null;
  let paymentBreakdown = null;

  try {
    const userId = req.user?.id || req.user?._id;

    const {
      assetId,
      fractions,
      paymentGateway = "PAYU",
    } = req.body || {};

    // ========================================================
    // 1. BASIC VALIDATION
    // ========================================================

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

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

    const gateway = String(paymentGateway || "")
      .trim()
      .toUpperCase();

    // Currently enabled payment gateways.
    // Razorpay code is preserved but disabled.

    const allowedGateways = [
      // "RAZORPAY",
      "CASHFREE",
      "PAYU",
    ];

    if (!allowedGateways.includes(gateway)) {
      return res.status(400).json({
        success: false,
        message:
          "This payment gateway is currently unavailable.",
      });
    }

    const fractionCount = Number(fractions);

    if (
      fractions === null ||
      fractions === "" ||
      !Number.isSafeInteger(fractionCount) ||
      fractionCount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid fraction count",
      });
    }

    // ========================================================
    // 2. PAYU CONFIGURATION VALIDATION
    // ========================================================

    if (gateway === "PAYU") {
      if (
        process.env.PAYU_ENV !== "PRODUCTION" ||
        !process.env.PAYU_MERCHANT_KEY ||
        !process.env.PAYU_MERCHANT_SALT ||
        !process.env.PAYU_SUCCESS_URL ||
        !process.env.PAYU_FAILURE_URL
      ) {
        console.error(
          "PAYU PRODUCTION CONFIGURATION MISSING"
        );

        return res.status(503).json({
          success: false,
          message:
            "PayU payment service is currently unavailable.",
        });
      }
    }

    // ========================================================
    // 3. FETCH USER AND VERIFY KYC
    // ========================================================

    const user = await User.findById(userId).select(
      "name kycStatus isKycVerified email phone mobile mobileNumber phoneNumber"
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

    // ========================================================
    // 4. CUSTOMER DETAILS
    // ========================================================

    let customerPhone = null;
    let customerName = null;
    let customerEmail = null;

    if (
      gateway === "CASHFREE" ||
      gateway === "PAYU"
    ) {
      const rawPhone =
        user.phoneNumber ??
        user.mobileNumber ??
        user.mobile ??
        user.phone;

      const digits = String(rawPhone ?? "").replace(
        /\D/g,
        ""
      );

      customerPhone =
        digits.length === 12 &&
        digits.startsWith("91")
          ? digits.slice(2)
          : digits;

      if (!/^[6-9]\d{9}$/.test(customerPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "A valid registered mobile number is required for payment.",
        });
      }
    }

    // ========================================================
    // 5. PAYU CUSTOMER VALIDATION
    // ========================================================

    if (gateway === "PAYU") {
      customerName = String(
        user.name ?? ""
      ).trim();

      customerEmail = String(
        user.email ?? ""
      ).trim();

      if (!customerName) {
        return res.status(400).json({
          success: false,
          message:
            "Customer name is required for PayU payment.",
        });
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          customerEmail
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid customer email is required for PayU payment.",
        });
      }
    }

    // ========================================================
    // 6. GENERATE PAYU TRANSACTION ID
    // ========================================================

    let payuTxnId = null;

    if (gateway === "PAYU") {
      payuTxnId =
        "BN" +
        crypto.randomBytes(10).toString("hex");
    }

    // ========================================================
    // 7. RESERVE FRACTIONS AND CREATE INTERNAL ORDER
    // ========================================================

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // ----------------------------------------------------
        // 7.1 RESERVE AVAILABLE FRACTIONS
        // ----------------------------------------------------

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
            new: true,
            session,
          }
        );

        if (!asset) {
          const error = new Error(
            "Requested fractions are unavailable. Maximum 80% of the asset can be purchased by users."
          );

          error.statusCode = 400;
          throw error;
        }

        // ----------------------------------------------------
        // 7.2 CALCULATE BASE ASSET AMOUNT
        // ----------------------------------------------------

        const amountPerFraction = Number(
          asset.amountPerFraction
        );

        if (
          !Number.isFinite(amountPerFraction) ||
          amountPerFraction <= 0
        ) {
          const error = new Error(
            "Invalid asset fraction price"
          );

          error.statusCode = 400;
          throw error;
        }

        // Work in paise to prevent floating-point
        // calculation errors.

        const fractionPricePaise = Math.round(
          amountPerFraction * 100
        );

        if (
          !Number.isSafeInteger(fractionPricePaise) ||
          fractionPricePaise <= 0
        ) {
          const error = new Error(
            "Invalid asset fraction price"
          );

          error.statusCode = 400;
          throw error;
        }

        const basePaise =
          fractionPricePaise * fractionCount;

        if (
          !Number.isSafeInteger(basePaise) ||
          basePaise <= 0
        ) {
          const error = new Error(
            "Payment amount exceeds supported range"
          );

          error.statusCode = 400;
          throw error;
        }

        const baseAmount = basePaise / 100;

        // ----------------------------------------------------
        // 7.3 CALCULATE 0.5% ONLINE PROCESSING FEE
        // ----------------------------------------------------

        paymentBreakdown = calculateOrderPayment({
          baseAmount,
          paymentGateway: gateway,
        });

        const {
          processingFeePercentage,
          processingFee,
          totalPayableAmount,
          totalPayablePaise,
        } = paymentBreakdown;

        // ----------------------------------------------------
        // 7.4 VALIDATE PAYMENT BREAKDOWN
        // ----------------------------------------------------

        const processingFeePaise = Math.round(
          processingFee * 100
        );

        if (
          !Number.isSafeInteger(processingFeePaise) ||
          !Number.isSafeInteger(totalPayablePaise) ||
          totalPayablePaise <= 0 ||
          basePaise + processingFeePaise !==
            totalPayablePaise ||
          Math.round(totalPayableAmount * 100) !==
            totalPayablePaise
        ) {
          const error = new Error(
            "Invalid payment breakdown"
          );

          error.statusCode = 500;
          throw error;
        }

        // ----------------------------------------------------
        // 7.5 CREATE INTERNAL ORDER
        // ----------------------------------------------------

        const createdOrders = await Order.create(
          [
            {
              userId,

              assetId,

              paymentGateway: gateway,

              payuTxnId:
                gateway === "PAYU"
                  ? payuTxnId
                  : null,

              fractions: fractionCount,

              amountPerFraction:
                fractionPricePaise / 100,

              // Asset purchase amount without fee.
              totalAmount: baseAmount,

              // Additional online processing fee.
              processingFeePercentage,

              processingFee,

              // Actual amount customer pays.
              totalPayableAmount,

              status: "PENDING_PAYMENT",

              expiresAt: new Date(
                Date.now() + 20 * 60 * 1000
              ),
            },
          ],
          {
            session,
          }
        );

        order = createdOrders[0];

        // ----------------------------------------------------
        // 7.6 VERIFY SAVED ORDER PAYABLE AMOUNT
        // ----------------------------------------------------

        // The helper returns paise.
        // Must match calculateOrderPayment exactly.

        const expectedPaymentPaise =
          getExpectedPaymentAmount(order);

        if (
          expectedPaymentPaise !==
          totalPayablePaise
        ) {
          const error = new Error(
            "Order payable amount calculation mismatch"
          );

          error.statusCode = 500;
          throw error;
        }

        // ----------------------------------------------------
        // 7.7 CREATE PAYU PENDING PAYMENT
        // ----------------------------------------------------

        // PayU does not require separate gateway
        // order creation through an API.
        //
        // Pending Payment is created atomically
        // with the internal Order.

        if (gateway === "PAYU") {
          await Payment.create(
            [
              {
                userId,

                orderId: order._id,

                paymentGateway: "PAYU",

                payuTxnId,

                payuMihpayId: null,

                // Amount includes 0.5% fee.
                amount: expectedPaymentPaise / 100,

                currency: "INR",

                status: "PENDING",
              },
            ],
            {
              session,
            }
          );
        }
      });
    } finally {
      await session.endSession();
    }

    // ========================================================
    // 8. VALIDATE EXPECTED AMOUNT AFTER COMMIT
    // ========================================================

    const expectedPaymentPaise =
      getExpectedPaymentAmount(order);

    const finalPayableAmount =
      expectedPaymentPaise / 100;

    if (
      !paymentBreakdown ||
      expectedPaymentPaise !==
        paymentBreakdown.totalPayablePaise
    ) {
      console.error("ORDER AMOUNT VALIDATION FAILED:", {
        orderId: String(order._id),

        baseAmount: order.totalAmount,

        processingFee: order.processingFee,

        totalPayableAmount:
          order.totalPayableAmount,

        expectedPaymentPaise,
      });

      // Internal data mismatch after database commit.
      // Do not create a gateway order.
      // Reconcile and release this reservation safely.
      return res.status(500).json({
        success: false,

        message:
          "Order amount validation failed. Please contact support.",

        orderId: order._id,
      });
    }

    // ========================================================
    // 9. CREATE PAYMENT GATEWAY ORDER
    // ========================================================

    let razorpayOrder = null;
    let cashfreeOrder = null;
    let payuOrder = null;

    try {
      // ----------------------------------------------------
      // 9.1 RAZORPAY
      // ----------------------------------------------------

      if (gateway === "RAZORPAY") {
        razorpayOrder = await razorpay.orders.create({
          // Razorpay expects paise.
          amount: expectedPaymentPaise,

          currency: "INR",

          receipt: `receipt_${order._id}`,
        });

        // Verify Razorpay gateway order amount.
        if (
          !razorpayOrder?.id ||
          Number(razorpayOrder.amount) !==
            expectedPaymentPaise
        ) {
          throw new Error(
            "Razorpay gateway order amount mismatch"
          );
        }
      }

      // ----------------------------------------------------
      // 9.2 CASHFREE
      // ----------------------------------------------------

      else if (gateway === "CASHFREE") {
        const cashfreeResponse =
          await cashfree.PGCreateOrder({
            order_id: `BUNNDLE_${order._id}`,

            // Cashfree expects INR.
            order_amount: finalPayableAmount,

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

            order_expiry_time:
              order.expiresAt.toISOString(),

            order_note:
              `Bunndle asset purchase ${order._id}`,
          });

        cashfreeOrder = cashfreeResponse?.data;

        if (
          !cashfreeOrder?.order_id ||
          !cashfreeOrder?.payment_session_id
        ) {
          throw new Error(
            "Invalid Cashfree order response"
          );
        }

        // Some Cashfree order responses contain
        // order_amount. Verify it when present.
        if (
          cashfreeOrder.order_amount != null
        ) {
          const gatewayAmountPaise = Math.round(
            Number(cashfreeOrder.order_amount) * 100
          );

          if (
            !Number.isSafeInteger(gatewayAmountPaise) ||
            gatewayAmountPaise !==
              expectedPaymentPaise
          ) {
            throw new Error(
              "Cashfree gateway order amount mismatch"
            );
          }
        }

        if (
          String(cashfreeOrder.order_id) !==
          `BUNNDLE_${order._id}`
        ) {
          throw new Error(
            "Cashfree gateway order ID mismatch"
          );
        }
      }

      // ----------------------------------------------------
      // 9.3 PAYU
      // ----------------------------------------------------

      else if (gateway === "PAYU") {
        const payableAmountString =
          finalPayableAmount.toFixed(2);

        payuOrder = {
          orderId: String(order._id),

          transactionId: payuTxnId,

          merchantKey:
            process.env.PAYU_MERCHANT_KEY,

          // Base amount + 0.5% fee.
          amount: payableAmountString,

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
      console.error(
        `${gateway} ORDER CREATION ERROR:`,
        gatewayError
      );

      // Razorpay: only release immediately when
      // failure is confirmed before gateway creation.
      //
      // For uncertain gateway outcomes, reconcile
      // before releasing reserved fractions.
      //
      // Cashfree may have created its order before
      // the API returned an error or timeout.

      return res.status(502).json({
        success: false,

        message:
          "Unable to initialize payment. Please check the order status before retrying.",

        orderId: order._id,
      });
    }

    // ========================================================
    // 10. CREATE PAYMENT RECORD
    // CASHFREE / RAZORPAY
    // ========================================================

    // PayU pending Payment was already created
    // inside the database transaction.

    if (gateway !== "PAYU") {
      try {
        await Payment.create({
          userId,

          orderId: order._id,

          paymentGateway: gateway,

          razorpayOrderId:
            razorpayOrder?.id ?? null,

          cashfreeOrderId:
            cashfreeOrder?.order_id ?? null,

          cashfreeCfOrderId:
            cashfreeOrder?.cf_order_id
              ? String(cashfreeOrder.cf_order_id)
              : null,

          // Fee-inclusive payable amount.
          amount: finalPayableAmount,

          currency: "INR",

          status: "PENDING",
        });
      } catch (paymentError) {
        console.error(
          "PAYMENT RECORD CREATION ERROR:",
          paymentError
        );

        // Gateway order may already exist.
        // Do not automatically release inventory.
        // Reconcile first.

        return res.status(500).json({
          success: false,

          message:
            "Gateway order initialized but internal payment registration failed. Please check order status before retrying.",

          orderId: order._id,
        });
      }
    }

    // ========================================================
    // 11. CALCULATE PUBLIC / COMPANY FRACTIONS
    // ========================================================

    const publicLimit = Math.floor(
      asset.totalFractions * 0.8
    );

    const companyReservedFractions =
      asset.totalFractions - publicLimit;

    const publicUsed =
      asset.totalFractions -
      asset.availableFractions;

    const publicAvailableFractions = Math.max(
      0,
      publicLimit - publicUsed
    );

    // ========================================================
    // 12. LOG PAYMENT BREAKDOWN
    // ========================================================

    console.log("ONLINE ORDER CREATED:", {
      orderId: String(order._id),

      paymentGateway: gateway,

      fractions: fractionCount,

      baseAmount: order.totalAmount,

      processingFeePercentage:
        order.processingFeePercentage,

      processingFee:
        order.processingFee,

      totalPayableAmount:
        order.totalPayableAmount,

      expectedPaymentPaise,
    });

    // ========================================================
    // 13. FINAL RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,

      message: "Order created successfully",

      order,

      razorpayOrder,

      // ----------------------------------------------------
      // CASHFREE RESPONSE
      // ----------------------------------------------------

      ...(gateway === "CASHFREE"
        ? {
            cashfreeOrder: {
              order_id:
                cashfreeOrder.order_id,

              cf_order_id:
                cashfreeOrder.cf_order_id,

              payment_session_id:
                cashfreeOrder.payment_session_id,

              order_status:
                cashfreeOrder.order_status,
            },
          }
        : {}),

      // ----------------------------------------------------
      // PAYU RESPONSE
      // ----------------------------------------------------

      ...(gateway === "PAYU"
        ? {
            payuOrder,
          }
        : {}),

      // ----------------------------------------------------
      // PAYMENT BREAKDOWN
      // ----------------------------------------------------

      paymentBreakdown: {
        currency: "INR",

        paymentGateway: gateway,

        fractions: fractionCount,

        amountPerFraction:
          order.amountPerFraction,

        // Asset ownership value.
        baseAmount:
          order.totalAmount,

        // 0.5% fee.
        processingFeePercentage:
          order.processingFeePercentage,

        processingFee:
          order.processingFee,

        // Actual payment amount.
        totalPayableAmount:
          order.totalPayableAmount,
      },

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
      "CREATE ORDER ERROR:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message: error.statusCode
        ? error.message
        : "Something went wrong while creating the order.",
    });
  }
};



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
//     // ========================================================

//     const paidAt = new Date();

//     // ========================================================
//     // 11. FINALIZE SUCCESSFUL PAYMENT
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

// ============================================================
// NEW: VERIFY CASHFREE ORDER WITH GATEWAY
//
// Shared by:
// - verifyCashfreePayment
// - cashfreeWebhook
//
// Never trust frontend payment status.
// ============================================================


export const verifyPayment = async (req, res) => {
  try {
    const userId = req.user?.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

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
        message: "Payment verification details are required",
      });
    }

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // ========================================================
    // 2. VERIFY RAZORPAY CHECKOUT SIGNATURE
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
    // 3. FIND INTERNAL PAYMENT
    // ========================================================

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      paymentGateway: "RAZORPAY",
      userId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // ========================================================
    // 4. FIND INTERNAL ORDER
    // ========================================================

    const order = await Order.findOne({
      _id: payment.orderId,
      userId,
      paymentGateway: "RAZORPAY",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Razorpay order not found",
      });
    }

    // ========================================================
    // 5. FETCH PAYMENT DIRECTLY FROM RAZORPAY
    // ========================================================

    let razorpayPayment;

    try {
      razorpayPayment = await razorpay.payments.fetch(
        razorpay_payment_id
      );
    } catch (error) {
      console.error(
        "RAZORPAY PAYMENT FETCH ERROR:",
        error
      );

      return res.status(502).json({
        success: false,
        message: "Unable to verify payment with Razorpay",
      });
    }

    if (!razorpayPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment not found at Razorpay",
      });
    }

    // ========================================================
    // 6. VERIFY PAYMENT ID
    // ========================================================

    if (
      String(razorpayPayment.id) !==
      String(razorpay_payment_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment ID mismatch",
      });
    }

    // ========================================================
    // 7. VERIFY GATEWAY ORDER RELATION
    // ========================================================

    if (
      String(razorpayPayment.order_id) !==
      String(razorpay_order_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this order",
      });
    }

    // ========================================================
    // 8. VERIFY PAYMENT AMOUNT
    // INCLUDING ADDITIONAL 0.5% PROCESSING FEE
    // ========================================================

    // Returns expected amount in paise.
    const expectedAmountPaise =
      getExpectedPaymentAmount(order);

    // Payment.amount is stored in INR.
    const storedPaymentPaise = Math.round(
      Number(payment.amount) * 100
    );

    // Razorpay returns payment amount in paise.
    const gatewayPaymentPaise =
      Number(razorpayPayment.amount);

    if (
      !Number.isSafeInteger(storedPaymentPaise) ||
      !Number.isSafeInteger(gatewayPaymentPaise) ||
      storedPaymentPaise <= 0 ||
      gatewayPaymentPaise <= 0 ||
      expectedAmountPaise !== storedPaymentPaise ||
      expectedAmountPaise !== gatewayPaymentPaise
    ) {
      console.error("RAZORPAY AMOUNT MISMATCH:", {
        orderId: String(order._id),

        razorpayOrderId: razorpay_order_id,

        baseAmount: order.totalAmount,

        processingFee: order.processingFee,

        totalPayableAmount:
          order.totalPayableAmount,

        storedPaymentAmount: payment.amount,

        expectedAmountPaise,

        storedPaymentPaise,

        gatewayPaymentPaise,
      });

      return res.status(409).json({
        success: false,
        message: "Payment amount mismatch",
      });
    }

    // ========================================================
    // 9. VERIFY CURRENCY
    // ========================================================

    if (
      String(razorpayPayment.currency || "").toUpperCase() !==
      "INR" ||
      String(payment.currency || "INR").toUpperCase() !==
      "INR"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment currency mismatch",
      });
    }

    // ========================================================
    // 10. PAYMENT MUST BE CAPTURED
    // ========================================================

    if (razorpayPayment.status !== "captured") {
      return res.status(409).json({
        success: false,
        message:
          `Payment is not captured. Current status: ${razorpayPayment.status}`,
      });
    }

    // ========================================================
    // 11. VERIFY EXISTING PAYMENT REFERENCE
    // ========================================================

    if (
      payment.razorpayPaymentId &&
      String(payment.razorpayPaymentId) !==
      String(razorpay_payment_id)
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This order is associated with another Razorpay payment",
      });
    }

    // ========================================================
    // 12. PAYMENT SUCCESS TIMESTAMP
    // ========================================================

    const paidAt = razorpayPayment.created_at
      ? new Date(
          Number(razorpayPayment.created_at) * 1000
        )
      : new Date();

    // ========================================================
    // 13. FINALIZE SUCCESSFUL PAYMENT
    // ========================================================

    const result = await finalizeSuccessfulPayment({
      paymentGateway: "RAZORPAY",

      razorpayOrderId: razorpay_order_id,

      razorpayPaymentId: razorpay_payment_id,

      razorpaySignature: razorpay_signature,

      paymentMethod:
        razorpayPayment.method || null,

      webhookVerified: false,

      paidAt,
    });

    // ========================================================
    // 14. FORMAT INDIA DATE AND TIME
    // ========================================================

    const finalPaidAt = result.paidAt || paidAt;

    const purchaseDate = new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }
    ).format(new Date(finalPaidAt));

    const purchaseTime = new Intl.DateTimeFormat(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }
    )
      .format(new Date(finalPaidAt))
      .toLowerCase();

    // ========================================================
    // 15. SUCCESS RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      message: result.alreadyProcessed
        ? "Payment already verified and purchase already completed"
        : "Payment verified and purchase completed successfully",

      data: {
        orderId: order._id,

        purchaseHistoryId:
          result.purchaseHistoryId,

        paymentGateway: "RAZORPAY",

        paymentStatus: "SUCCESS",

        razorpayOrderId: razorpay_order_id,

        razorpayPaymentId: razorpay_payment_id,

        baseAmount: Number(order.totalAmount),

        processingFeePercentage:
          Number(order.processingFeePercentage || 0),

        processingFee:
          Number(order.processingFee || 0),

        totalPayableAmount:
          expectedAmountPaise / 100,

        paidAt: finalPaidAt,

        purchaseDate,

        purchaseTime,
      },
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,

      message:
        error.message || "Unable to verify payment",
    });
  }
};


// const verifyCashfreeOrderWithGateway = async (payment, order) => {
//   if (!payment || !order || !payment.cashfreeOrderId) {
//     return {
//       verified: false,
//       message: "Cashfree payment details not found",
//     };
//   }

//   if (
//     payment.paymentGateway !== "CASHFREE" ||
//     order.paymentGateway !== "CASHFREE"
//   ) {
//     return {
//       verified: false,
//       message: "Invalid payment gateway",
//     };
//   }

//   const cashfreeOrderId = payment.cashfreeOrderId;

//   // ==========================================
//   // FETCH ORDER FROM CASHFREE
//   // ==========================================

//   const orderResponse = await cashfree.PGFetchOrder(cashfreeOrderId);

//   const gatewayOrder = orderResponse.data;

//   if (!gatewayOrder) {
//     return {
//       verified: false,
//       message: "Cashfree order not found",
//     };
//   }

//   // ==========================================
//   // VERIFY ORDER ID
//   // ==========================================

//   if (gatewayOrder.order_id !== cashfreeOrderId) {
//     return {
//       verified: false,
//       message: "Cashfree order ID mismatch",
//     };
//   }

//   // ==========================================
//   // VERIFY ORDER AMOUNT
//   //
//   // Cashfree order_amount is in rupees.
//   // ==========================================

//   const expectedAmountPaise = Math.round(Number(order.totalAmount) * 100);

//   const gatewayOrderAmountPaise = Math.round(
//     Number(gatewayOrder.order_amount) * 100,
//   );

//   const paymentAmountPaise = Math.round(Number(payment.amount) * 100);

//   if (
//     !Number.isFinite(expectedAmountPaise) ||
//     expectedAmountPaise <= 0 ||
//     expectedAmountPaise !== gatewayOrderAmountPaise ||
//     expectedAmountPaise !== paymentAmountPaise
//   ) {
//     return {
//       verified: false,
//       message: "Cashfree order amount mismatch",
//     };
//   }

//   // ==========================================
//   // VERIFY CURRENCY
//   // ==========================================

//   const expectedCurrency = String(payment.currency || "INR").toUpperCase();

//   if (
//     String(gatewayOrder.order_currency || "").toUpperCase() !== expectedCurrency
//   ) {
//     return {
//       verified: false,
//       message: "Cashfree order currency mismatch",
//     };
//   }

//   // ==========================================
//   // ORDER MUST BE PAID
//   // ==========================================

//   if (gatewayOrder.order_status !== "PAID") {
//     return {
//       verified: false,
//       message: `Cashfree order is not paid. Current status: ${gatewayOrder.order_status}`,
//     };
//   }

//   // ==========================================
//   // FETCH PAYMENT TRANSACTIONS
//   // ==========================================

//   const paymentsResponse = await cashfree.PGOrderFetchPayments(cashfreeOrderId);

//   const transactions = paymentsResponse.data;

//   if (!Array.isArray(transactions)) {
//     return {
//       verified: false,
//       message: "Unable to fetch Cashfree payment transactions",
//     };
//   }

//   // ==========================================
//   // FIND A SUCCESSFUL PAYMENT
//   // ==========================================

//   const successfulPayment = transactions.find((transaction) => {
//     const transactionAmountPaise = Math.round(
//       Number(transaction.payment_amount) * 100,
//     );

//     return (
//       transaction.payment_status === "SUCCESS" &&
//       transaction.cf_payment_id != null &&
//       String(transaction.order_id) === String(cashfreeOrderId) &&
//       transactionAmountPaise === expectedAmountPaise &&
//       String(transaction.payment_currency || "").toUpperCase() ===
//         expectedCurrency
//     );
//   });

//   if (!successfulPayment) {
//     return {
//       verified: false,
//       message: "No successful Cashfree payment found for this order",
//     };
//   }

//   // ==========================================
//   // PAYMENT METHOD
//   // ==========================================

//   const paymentMethod =
//     successfulPayment.payment_group ||
//     successfulPayment.payment_method?.type ||
//     null;

//   // ==========================================
//   // PAYMENT TIMESTAMP
//   // ==========================================

//   const gatewayPaidAt = successfulPayment.payment_completion_time;

//   const parsedPaidAt = gatewayPaidAt ? new Date(gatewayPaidAt) : new Date();

//   const paidAt = Number.isNaN(parsedPaidAt.getTime())
//     ? new Date()
//     : parsedPaidAt;

//   return {
//     verified: true,

//     cashfreeOrderId,

//     cashfreePaymentId: String(successfulPayment.cf_payment_id),

//     paymentMethod,

//     paidAt,
//   };
// };

// ============================================================
// NEW: VERIFY CASHFREE PAYMENT
// ============================================================

// export const verifyCashfreePayment = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const { orderId } = req.body;

//     // ==========================================
//     // VALIDATION
//     // ==========================================

//     if (!orderId || !mongoose.isValidObjectId(orderId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Valid orderId is required",
//       });
//     }

//     // ==========================================
//     // FIND INTERNAL ORDER
//     // ==========================================

//     const order = await Order.findOne({
//       _id: orderId,

//       userId,

//       paymentGateway: "CASHFREE",
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Cashfree order not found",
//       });
//     }

//     // ==========================================
//     // FIND INTERNAL PAYMENT
//     // ==========================================

//     const payment = await Payment.findOne({
//       orderId: order._id,

//       userId,

//       paymentGateway: "CASHFREE",
//     });

//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: "Cashfree payment record not found",
//       });
//     }

//     // ==========================================
//     // VERIFY DIRECTLY WITH CASHFREE
//     // ==========================================

//     const verification = await verifyCashfreeOrderWithGateway(payment, order);

//     if (!verification.verified) {
//       return res.status(400).json({
//         success: false,
//         message: verification.message,
//       });
//     }

//     // ==========================================
//     // FINALIZE PURCHASE
//     //
//     // Shared service creates PurchaseHistory,
//     // allocates Ownership and completes Order.
//     // ==========================================

//     const result = await finalizeSuccessfulPayment({
//       paymentGateway: "CASHFREE",

//       cashfreeOrderId: verification.cashfreeOrderId,

//       cashfreePaymentId: verification.cashfreePaymentId,

//       paymentMethod: verification.paymentMethod,

//       webhookVerified: false,

//       paidAt: verification.paidAt,
//     });

//     // ==========================================
//     // FORMAT INDIA DATE AND TIME
//     // ==========================================

//     const finalPaidAt = result.paidAt || verification.paidAt;

//     const purchaseDate = new Intl.DateTimeFormat("en-IN", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//       timeZone: "Asia/Kolkata",
//     }).format(finalPaidAt);

//     const purchaseTime = new Intl.DateTimeFormat("en-IN", {
//       hour: "2-digit",
//       minute: "2-digit",
//       second: "2-digit",
//       hour12: true,
//       timeZone: "Asia/Kolkata",
//     })
//       .format(finalPaidAt)
//       .toLowerCase();

//     // ==========================================
//     // RESPONSE
//     // ==========================================

//     return res.status(200).json({
//       success: true,

//       message: result.alreadyProcessed
//         ? "Payment already verified and purchase already completed"
//         : "Cashfree payment verified and purchase completed successfully",

//       data: {
//         purchaseHistoryId: result.purchaseHistoryId,

//         paymentGateway: "CASHFREE",

//         paymentStatus: "SUCCESS",

//         cashfreeOrderId: verification.cashfreeOrderId,

//         cashfreePaymentId: verification.cashfreePaymentId,

//         paidAt: finalPaidAt,

//         purchaseDate,

//         purchaseTime,
//       },
//     });
//   } catch (error) {
//     console.error("VERIFY CASHFREE PAYMENT ERROR:", error);

//     return res.status(error.statusCode || 500).json({
//       success: false,

//       message: error.message || "Unable to verify Cashfree payment",
//     });
//   }
// };


const verifyCashfreeOrderWithGateway = async (payment, order) => {
  // ========================================================
  // 1. BASIC VALIDATION
  // ========================================================

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

  if (
    String(payment.orderId) !== String(order._id) ||
    String(payment.userId) !== String(order.userId)
  ) {
    return {
      verified: false,
      message: "Cashfree order and payment record mismatch",
    };
  }

  const cashfreeOrderId = String(payment.cashfreeOrderId);

  // ========================================================
  // 2. CALCULATE EXPECTED AMOUNT
  // INCLUDES 0.5% ONLINE PROCESSING CHARGE
  // ========================================================

  // Returns amount in paise.
  //
  // New orders:
  // order.totalPayableAmount = base + 0.5%
  //
  // Historical orders:
  // Falls back to order.totalAmount.
  //
  // Do not calculate the fee again.

  const expectedAmountPaise =
    getExpectedPaymentAmount(order);

  const paymentAmountValue = Number(payment.amount);

  const paymentAmountPaise = Math.round(
    paymentAmountValue * 100
  );

  if (
    !Number.isFinite(paymentAmountValue) ||
    !Number.isSafeInteger(paymentAmountPaise) ||
    paymentAmountPaise <= 0 ||
    expectedAmountPaise !== paymentAmountPaise
  ) {
    console.error("CASHFREE STORED AMOUNT MISMATCH:", {
      orderId: String(order._id),

      cashfreeOrderId,

      baseAmount: order.totalAmount,

      processingFeePercentage:
        order.processingFeePercentage ?? 0,

      processingFee: order.processingFee ?? 0,

      totalPayableAmount:
        order.totalPayableAmount ?? order.totalAmount,

      storedPaymentAmount: payment.amount,

      expectedAmountPaise,

      paymentAmountPaise,
    });

    return {
      verified: false,
      message: "Cashfree stored payment amount mismatch",
    };
  }

  // ========================================================
  // 3. VERIFY CURRENCY
  // ========================================================

  const expectedCurrency = String(
    payment.currency || "INR"
  ).toUpperCase();

  if (expectedCurrency !== "INR") {
    return {
      verified: false,
      message: "Invalid payment currency",
    };
  }

  // ========================================================
  // 4. FETCH ORDER FROM CASHFREE
  // ========================================================

  const orderResponse = await cashfree.PGFetchOrder(
    cashfreeOrderId
  );

  const gatewayOrder = orderResponse?.data;

  if (!gatewayOrder) {
    return {
      verified: false,
      message: "Cashfree order not found",
    };
  }

  // ========================================================
  // 5. VERIFY CASHFREE ORDER ID
  // ========================================================

  if (
    String(gatewayOrder.order_id) !==
    cashfreeOrderId
  ) {
    return {
      verified: false,
      message: "Cashfree order ID mismatch",
    };
  }

  // ========================================================
  // 6. VERIFY CASHFREE ORDER AMOUNT
  // ========================================================

  // Cashfree order_amount is in INR.

  const gatewayOrderAmountValue = Number(
    gatewayOrder.order_amount
  );

  const gatewayOrderAmountPaise = Math.round(
    gatewayOrderAmountValue * 100
  );

  if (
    !Number.isFinite(gatewayOrderAmountValue) ||
    !Number.isSafeInteger(gatewayOrderAmountPaise) ||
    gatewayOrderAmountPaise <= 0 ||
    gatewayOrderAmountPaise !== expectedAmountPaise
  ) {
    console.error("CASHFREE GATEWAY ORDER AMOUNT MISMATCH:", {
      orderId: String(order._id),

      cashfreeOrderId,

      baseAmount: order.totalAmount,

      processingFee: order.processingFee ?? 0,

      expectedPayableAmount:
        expectedAmountPaise / 100,

      gatewayOrderAmount:
        gatewayOrder.order_amount,

      expectedAmountPaise,

      gatewayOrderAmountPaise,
    });

    return {
      verified: false,
      message: "Cashfree order amount mismatch",
    };
  }

  // ========================================================
  // 7. VERIFY CASHFREE ORDER CURRENCY
  // ========================================================

  if (
    String(gatewayOrder.order_currency || "")
      .toUpperCase() !== expectedCurrency
  ) {
    return {
      verified: false,
      message: "Cashfree order currency mismatch",
    };
  }

  // ========================================================
  // 8. CASHFREE ORDER MUST BE PAID
  // ========================================================

  if (gatewayOrder.order_status !== "PAID") {
    return {
      verified: false,
      message:
        `Cashfree order is not paid. Current status: ${gatewayOrder.order_status}`,
    };
  }

  // ========================================================
  // 9. FETCH CASHFREE PAYMENT TRANSACTIONS
  // ========================================================

  const paymentsResponse =
    await cashfree.PGOrderFetchPayments(
      cashfreeOrderId
    );

  const transactions = paymentsResponse?.data;

  if (!Array.isArray(transactions)) {
    return {
      verified: false,
      message:
        "Unable to fetch Cashfree payment transactions",
    };
  }

  // ========================================================
  // 10. FIND MATCHING SUCCESSFUL PAYMENT
  // ========================================================

  const successfulPayment = transactions.find(
    (transaction) => {
      if (
        transaction.payment_status !== "SUCCESS" ||
        transaction.cf_payment_id == null ||
        String(transaction.order_id) !== cashfreeOrderId
      ) {
        return false;
      }

      // Cashfree payment_amount is in INR.
      const transactionAmountValue = Number(
        transaction.payment_amount
      );

      if (
        transaction.payment_amount === null ||
        transaction.payment_amount === undefined ||
        !Number.isFinite(transactionAmountValue)
      ) {
        return false;
      }

      const transactionAmountPaise = Math.round(
        transactionAmountValue * 100
      );

      if (
        !Number.isSafeInteger(transactionAmountPaise) ||
        transactionAmountPaise !== expectedAmountPaise
      ) {
        return false;
      }

      return (
        String(transaction.payment_currency || "")
          .toUpperCase() === expectedCurrency
      );
    }
  );

  if (!successfulPayment) {
    console.error(
      "CASHFREE SUCCESSFUL PAYMENT NOT FOUND:",
      {
        cashfreeOrderId,
        expectedAmountPaise,
        transactionCount: transactions.length,
      }
    );

    return {
      verified: false,
      message:
        "No matching successful Cashfree payment found for this order",
    };
  }

  // ========================================================
  // 11. VERIFY EXISTING PAYMENT REFERENCE
  // ========================================================

  const cashfreePaymentId = String(
    successfulPayment.cf_payment_id
  );

  if (
    payment.cashfreePaymentId &&
    String(payment.cashfreePaymentId) !== cashfreePaymentId
  ) {
    return {
      verified: false,
      message:
        "Cashfree payment ID does not match the stored payment",
    };
  }

  // ========================================================
  // 12. PAYMENT METHOD
  // ========================================================

  const paymentMethod =
    successfulPayment.payment_group ||
    successfulPayment.payment_method?.type ||
    null;

  // ========================================================
  // 13. PAYMENT COMPLETION TIMESTAMP
  // ========================================================

  const gatewayPaidAt =
    successfulPayment.payment_completion_time;

  const parsedPaidAt = gatewayPaidAt
    ? new Date(gatewayPaidAt)
    : new Date();

  const paidAt = Number.isNaN(
    parsedPaidAt.getTime()
  )
    ? new Date()
    : parsedPaidAt;

  // ========================================================
  // 14. VERIFIED RESULT
  // ========================================================

  return {
    verified: true,

    cashfreeOrderId,

    cashfreePaymentId,

    paymentMethod,

    paidAt,

    // Additional verified amount information.
    baseAmount: Number(order.totalAmount),

    processingFeePercentage: Number(
      order.processingFeePercentage || 0
    ),

    processingFee: Number(
      order.processingFee || 0
    ),

    totalPayableAmount:
      expectedAmountPaise / 100,

    verifiedAmountPaise: expectedAmountPaise,

    currency: expectedCurrency,
  };
};


export const verifyCashfreePayment = async (req, res) => {
  try {
    const userId = req.user?.id;

    const { orderId } = req.body || {};

    // ========================================================
    // 1. VALIDATION
    // ========================================================

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "User authentication is required",
      });
    }

    if (
      !orderId ||
      !mongoose.isValidObjectId(orderId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid orderId is required",
      });
    }

    // ========================================================
    // 2. FIND INTERNAL ORDER
    // ========================================================

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

    // ========================================================
    // 3. FIND INTERNAL PAYMENT
    // ========================================================

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

    // ========================================================
    // 4. VERIFY STORED PAYMENT AMOUNT
    // INCLUDING 0.5% PROCESSING CHARGE
    // ========================================================

    // Expected amount in paise.
    // New orders include the 0.5% processing charge.
    // Old orders fall back to totalAmount.

    const expectedAmountPaise =
      getExpectedPaymentAmount(order);

    const storedAmount = Number(payment.amount);

    const storedPaymentPaise = Math.round(
      storedAmount * 100
    );

    if (
      !Number.isFinite(storedAmount) ||
      !Number.isSafeInteger(storedPaymentPaise) ||
      storedPaymentPaise <= 0 ||
      expectedAmountPaise !== storedPaymentPaise
    ) {
      console.error(
        "CASHFREE STORED PAYMENT AMOUNT MISMATCH:",
        {
          orderId: String(order._id),

          paymentId: String(payment._id),

          baseAmount: order.totalAmount,

          processingFee:
            order.processingFee ?? 0,

          totalPayableAmount:
            order.totalPayableAmount ??
            order.totalAmount,

          storedPaymentAmount: payment.amount,

          expectedAmountPaise,
          storedPaymentPaise,
        }
      );

      return res.status(409).json({
        success: false,
        message:
          "Stored order and Cashfree payment amount mismatch",
      });
    }

    // ========================================================
    // 5. VERIFY PAYMENT CURRENCY
    // ========================================================

    if (
      String(payment.currency || "INR")
        .toUpperCase() !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment currency mismatch",
      });
    }

    // ========================================================
    // 6. VERIFY DIRECTLY WITH CASHFREE
    // ========================================================

    // IMPORTANT:
    // This helper must validate the actual gateway amount
    // against order.totalPayableAmount, not order.totalAmount.
    //
    // It must also verify:
    // - Cashfree order belongs to the internal order
    // - Payment status is SUCCESS
    // - Correct gateway payment reference
    // - INR currency

    const verification =
      await verifyCashfreeOrderWithGateway(
        payment,
        order
      );

    if (!verification?.verified) {
      return res.status(400).json({
        success: false,
        message:
          verification?.message ||
          "Cashfree payment verification failed",
      });
    }

    // ========================================================
    // 7. VERIFY GATEWAY PAYMENT REFERENCES
    // ========================================================

    if (
      !verification.cashfreeOrderId ||
      !verification.cashfreePaymentId
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cashfree gateway payment details are missing",
      });
    }

    if (
      String(verification.cashfreeOrderId) !==
      String(payment.cashfreeOrderId)
    ) {
      return res.status(409).json({
        success: false,
        message: "Cashfree order ID mismatch",
      });
    }

    if (
      payment.cashfreePaymentId &&
      String(payment.cashfreePaymentId) !==
      String(verification.cashfreePaymentId)
    ) {
      return res.status(409).json({
        success: false,
        message: "Cashfree payment ID mismatch",
      });
    }

    // ========================================================
    // 8. FINALIZE SUCCESSFUL PAYMENT
    // ========================================================

    const result = await finalizeSuccessfulPayment({
      paymentGateway: "CASHFREE",

      cashfreeOrderId:
        verification.cashfreeOrderId,

      cashfreePaymentId:
        verification.cashfreePaymentId,

      paymentMethod:
        verification.paymentMethod || null,

      webhookVerified: false,

      paidAt:
        verification.paidAt || new Date(),
    });

    // ========================================================
    // 9. FORMAT INDIA DATE AND TIME
    // ========================================================

    const finalPaidAt = new Date(
      result.paidAt ||
      verification.paidAt ||
      new Date()
    );

    const purchaseDate = new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }
    ).format(finalPaidAt);

    const purchaseTime = new Intl.DateTimeFormat(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }
    )
      .format(finalPaidAt)
      .toLowerCase();

    // ========================================================
    // 10. RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      message: result.alreadyProcessed
        ? "Payment already verified and purchase already completed"
        : "Cashfree payment verified and purchase completed successfully",

      data: {
        orderId: order._id,

        purchaseHistoryId:
          result.purchaseHistoryId,

        paymentGateway: "CASHFREE",

        paymentStatus: "SUCCESS",

        cashfreeOrderId:
          verification.cashfreeOrderId,

        cashfreePaymentId:
          verification.cashfreePaymentId,

        baseAmount: Number(order.totalAmount),

        processingFeePercentage:
          Number(
            order.processingFeePercentage || 0
          ),

        processingFee:
          Number(order.processingFee || 0),

        totalPayableAmount:
          expectedAmountPaise / 100,

        paidAt: finalPaidAt,

        purchaseDate,

        purchaseTime,
      },
    });
  } catch (error) {
    console.error(
      "VERIFY CASHFREE PAYMENT ERROR:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        error.message ||
        "Unable to verify Cashfree payment",
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
  return req.user?.id || req.user?._id || req.user?.userId || null;
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
    throw createError(404, "PayU payment record not found");
  }

  if (String(payment.userId) !== String(order.userId)) {
    throw createError(409, "Order and payment customer mismatch");
  }

  // ========================================================
  // 3. CHECK STORED PAYMENT AMOUNT
  // ========================================================

  const orderAmount = toPaise(getAmount(order.totalAmount));

  const paymentAmount = toPaise(getAmount(payment.amount));

  if (
    orderAmount === null ||
    paymentAmount === null ||
    orderAmount !== paymentAmount
  ) {
    throw createError(409, "Stored order and payment amount mismatch");
  }

  if (String(payment.currency || "INR").toUpperCase() !== "INR") {
    throw createError(409, "Invalid payment currency");
  }

  // ========================================================
  // 4. FETCH TRANSACTION DIRECTLY FROM PAYU
  // ========================================================

  const gateway = await fetchPayUTransaction(order.payuTxnId);

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
    String(transaction.txnid) !== String(order.payuTxnId)
  ) {
    throw createError(409, "PayU transaction ID mismatch");
  }

  // ========================================================
  // 6. VERIFY PAYMENT AMOUNT
  // ========================================================

  const receivedAmount = toPaise(
    transaction.transaction_amount ?? transaction.amt,
  );

  if (receivedAmount === null || receivedAmount !== orderAmount) {
    throw createError(409, "PayU payment amount mismatch");
  }

  // ========================================================
  // 7. VERIFY MERCHANT KEY
  // ========================================================

  if (
    transaction.key != null &&
    String(transaction.key) !== String(process.env.PAYU_MERCHANT_KEY)
  ) {
    throw createError(409, "PayU merchant key mismatch");
  }

  // ========================================================
  // 8. VERIFY PRODUCT INFORMATION
  // ========================================================

  if (
    transaction.productinfo != null &&
    String(transaction.productinfo) !== PRODUCT_INFO
  ) {
    throw createError(409, "PayU product information mismatch");
  }

  // ========================================================
  // 9. VERIFY CURRENCY
  // ========================================================

  if (
    transaction.currency != null &&
    String(transaction.currency).toUpperCase() !== "INR"
  ) {
    throw createError(409, "PayU currency mismatch");
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

  const payuMihpayId = String(transaction.mihpayid ?? "").trim();

  if (!payuMihpayId || payuMihpayId === "Not Found") {
    throw createError(409, "PayU payment ID not found");
  }

  // ========================================================
  // 12. COMPARE CALLBACK PAYMENT ID
  // ========================================================

  if (callbackMihpayId != null && String(callbackMihpayId) !== payuMihpayId) {
    throw createError(409, "PayU callback payment ID mismatch");
  }

  // ========================================================
  // 13. VERIFY STORED PAYMENT ID
  // ========================================================

  if (payment.payuMihpayId && String(payment.payuMihpayId) !== payuMihpayId) {
    throw createError(409, "PayU payment reference mismatch");
  }

  // ========================================================
  // 14. CHECK DUPLICATE PAYMENT REFERENCE
  // ========================================================

  const duplicatePayment = await Payment.findOne({
    _id: { $ne: payment._id },
    payuMihpayId,
  });

  if (duplicatePayment) {
    throw createError(409, "PayU payment reference already used");
  }

  // ========================================================
  // 15. CHECK EXPIRED OR RELEASED ORDER
  // ========================================================

  if (
    order.status !== "COMPLETED" &&
    (order.status !== "PENDING_PAYMENT" ||
      !Number.isFinite(new Date(order.expiresAt).getTime()) ||
      new Date(order.expiresAt).getTime() <= Date.now())
  ) {
    return {
      status: "RECONCILIATION_REQUIRED",
      orderId: String(order._id),
      payuTxnId: order.payuTxnId,
      payuMihpayId,
      message: "Payment succeeded but order reservation is no longer active",
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
  get_eligible_payment_options: ["get_eligible_payment_options"],
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
  if (hashName !== "quickPayEvent" && hashName !== "get_all_offer_details") {
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
  const httpDate = hashString.slice(firstPipe + 1, lastPipe);

  // Reject additional pipe delimiters
  // and stale request timestamps.
  if (httpDate.includes("|")) {
    return { handled: true, valid: false };
  }

  const timestamp = Date.parse(httpDate);

  if (
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() - timestamp) > PAYU_HASH_MAX_AGE_MS
  ) {
    return { handled: true, valid: false };
  }

  let payload;

  try {
    payload = JSON.parse(jsonText);
  } catch {
    return { handled: true, valid: false };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
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
      valid: keys.length === 1 && keys[0] === "amount",
    };
  }

  // ======================================
  // QUICK PAY EVENT
  // ======================================

  const expectedCredential = `${merchantKey}:${String(user.email).trim()}`;

  const requestId = payload.requestId;

  if (
    payload.requestType !== "quickpay" ||
    payload.userCredential !== expectedCredential ||
    typeof requestId !== "string" ||
    !new RegExp(`^${order.payuTxnId}\\d{10,16}$`).test(requestId) ||
    typeof payload.deviceId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(payload.deviceId)
  ) {
    return { handled: true, valid: false };
  }

  // The SDK was observed sending either
  // empty phone or registered phone.

  const sentPhone = normalizePayUPhone(payload.phone ?? "");

  const registeredPhone = normalizePayUPhone(
    user.phoneNumber ?? user.mobileNumber ?? user.mobile ?? user.phone,
  );

  if (sentPhone && sentPhone !== registeredPhone) {
    return { handled: true, valid: false };
  }

  if (payload.userToken != null && typeof payload.userToken !== "string") {
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

  if (Object.keys(payload).some((key) => !allowedFields.has(key))) {
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

    const { orderId, hashName, hashString, hashType, postSalt } =
      req.body || {};

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

    if (postSalt != null && typeof postSalt !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid postSalt",
      });
    }

    // Only V1 hashes are enabled.
    if (hashType === "V2" || postSalt) {
      return res.status(400).json({
        success: false,
        message: "Requested hash type is not enabled",
      });
    }

    if (hashName === "mcpLookup") {
      return res.status(400).json({
        success: false,
        message: "MCP hash is not configured",
      });
    }

    // ======================================
    // 2. ACTIVE PAYU ORDER
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

    const transactionId = String(order.payuTxnId || "");

    if (!/^BN[a-f0-9]{20}$/.test(transactionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    // ======================================
    // 3. PENDING PAYMENT
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
    // 4. AMOUNT VALIDATION
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
        message: "Order/payment amount mismatch",
      });
    }

    // ======================================
    // 5. PAYU CONFIGURATION
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
    // 6. CUSTOMER DETAILS
    // ======================================

    const user = await User.findById(order.userId).select(
      "name email phone phoneNumber mobile mobileNumber",
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
      user.phoneNumber ?? user.mobileNumber ?? user.mobile ?? user.phone,
    );

    if (!registeredPhone) {
      return res.status(400).json({
        success: false,
        message: "Customer phone missing",
      });
    }

    // ======================================
    // 7. VALIDATION HELPERS
    // ======================================

    const fail = (message) =>
      res.status(400).json({
        success: false,
        message,
      });

    const parseObject = (value) => {
      try {
        const result = JSON.parse(value);

        return result && typeof result === "object" && !Array.isArray(result)
          ? result
          : null;
      } catch {
        return null;
      }
    };

    const onlyKeys = (object, allowed) =>
      object !== null &&
      typeof object === "object" &&
      !Array.isArray(object) &&
      Object.keys(object).every((key) => allowed.has(key));

    const amountMatches = (value) => {
      if (typeof value !== "string" && typeof value !== "number") {
        return false;
      }

      const paise = toPaise(String(value));

      return paise !== null && paise === orderPaise;
    };

    // ======================================
    // 8. SDK TIMESTAMP VALIDATION
    // ======================================

    const validSdkTimestamp = (value) => {
      if (
        typeof value !== "string" ||
        !/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2}(?: GMT)?$/.test(
          value,
        )
      ) {
        return false;
      }

      const normalized = value.endsWith(" GMT") ? value : `${value} GMT`;

      const timestamp = Date.parse(normalized);

      return (
        Number.isFinite(timestamp) &&
        Math.abs(Date.now() - timestamp) <= 15 * 60 * 1000
      );
    };

    const parseTimedJson = (value) => {
      const match = value.match(/^(\{[^\r\n]*\})\|([^|\r\n]+)\|$/);

      if (!match) {
        return null;
      }

      const body = parseObject(match[1]);

      if (!body || !validSdkTimestamp(match[2])) {
        return null;
      }

      return body;
    };

    // ======================================
    // 9. CARD NUMBER VALIDATION
    // ======================================

    const isValidCardNumber = (value) => {
      if (typeof value !== "string" || !/^\d{12,19}$/.test(value)) {
        return false;
      }

      let sum = 0;
      let doubleDigit = false;

      for (let i = value.length - 1; i >= 0; i--) {
        let digit = Number(value[i]);

        if (doubleDigit) {
          digit *= 2;

          if (digit > 9) {
            digit -= 9;
          }
        }

        sum += digit;
        doubleDigit = !doubleDigit;
      }

      return sum % 10 === 0;
    };

    // ======================================
    // 10. HASH VALIDATION
    // ======================================

    let validated = false;

    // ======================================
    // IOS QUICK PAY
    // ======================================

    if (hashName === "fetch_quick_pay_option") {
      const data = parseTimedJson(hashString);

      const allowed = new Set([
        "phone",
        "userCredential",
        "userToken",
        "amount",
        "deviceId",
      ]);

      if (
        !onlyKeys(data, allowed) ||
        normalizePayUPhone(data.phone) !== registeredPhone ||
        data.userCredential !== `${merchantKey}:${email}` ||
        data.userToken !== "" ||
        !amountMatches(data.amount) ||
        typeof data.deviceId !== "string" ||
        !/^[A-Za-z0-9-]{8,128}$/.test(data.deviceId)
      ) {
        return fail("Invalid iOS quick-pay parameters");
      }

      validated = true;
    }

    // ======================================
    // CARD BIN HASH - ANDROID + IOS
    // ======================================
    else if (
      hashName === "getBinBasedDetails" ||
      hashName === "binBaseDetails"
    ) {
      const data = parseTimedJson(hashString);

      if (!data) {
        return fail("Invalid PayU BIN hash format");
      }

      const isAndroid = hashName === "binBaseDetails";

      const expectedSource = isAndroid ? "ANDROID_SDK" : "IOS_SDK";

      const allowedKeys = new Set([
        "txnId",
        "cardNumber",
        "merchantKey",
        "amount",
        "source",
        "isPricingCFEnable",
        "disableConvFeeCompounding",
        "isSITxn",
      ]);

      const validBoolean = (value) =>
        value === true ||
        value === false ||
        value === "true" ||
        value === "false";

      // Android sends isSITxn: false.
      // iOS may omit this field.
      const validSIField = isAndroid
        ? data.isSITxn === false
        : data.isSITxn === undefined || data.isSITxn === false;

      // Android: actual booleans.
      // iOS: string booleans.
      const validFlags = isAndroid
        ? typeof data.isPricingCFEnable === "boolean" &&
          typeof data.disableConvFeeCompounding === "boolean"
        : validBoolean(data.isPricingCFEnable) &&
          validBoolean(data.disableConvFeeCompounding);

      if (
        !onlyKeys(data, allowedKeys) ||
        data.txnId !== transactionId ||
        data.merchantKey !== merchantKey ||
        !amountMatches(data.amount) ||
        data.source !== expectedSource ||
        !isValidCardNumber(data.cardNumber) ||
        !validFlags ||
        !validSIField
      ) {
        return fail("PayU BIN details do not match order");
      }

      // Never log cardNumber or hashString.
      validated = true;
    }

    // ======================================
    // UPI VALIDATION
    // ======================================
    else if (hashName === "validateVPA") {
      const parts = hashString.split("|");

      const valid =
        parts.length === 4 &&
        parts[0] === merchantKey &&
        parts[1] === "validateVPA" &&
        parts[3] === "" &&
        typeof parts[2] === "string" &&
        parts[2].length <= 255 &&
        /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(parts[2]);

      if (!valid) {
        return fail("Invalid PayU VPA request");
      }

      validated = true;
    }

    // ======================================
    // EMI ELIGIBILITY
    // ======================================
    else if (hashName === "eligibleBinsForEMI") {
      if (hashString !== `${merchantKey}|eligibleBinsForEMI|default|`) {
        return fail("Invalid eligibleBinsForEMI request");
      }

      validated = true;
    }

    // ======================================
    // EXISTING SPECIAL HASHES
    // ======================================

    if (!validated) {
      const special = validatePayUSpecialHash({
        hashName,
        hashString,
        merchantKey,
        order,
        user,
      });

      if (special.handled) {
        if (!special.valid) {
          return fail("Invalid PayU special hash request");
        }

        validated = true;
      }
    }

    // ======================================
    // STANDARD / SDK HASH VALIDATION
    // ======================================

    if (!validated) {
      const parts = hashString.split("|");

      if (parts[0] !== merchantKey) {
        return fail("PayU merchant key mismatch");
      }

      // ====================================
      // PAYMENT / PAYMENT_SOURCE
      // ====================================

      if (hashName === "payment" || hashName === "payment_source") {
        const expected = [
          merchantKey,
          transactionId,
          amount,
          PAYU_PRODUCT_INFO,
          firstname,
          email,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ].join("|");

        if (hashString !== expected) {
          return fail("PayU payment parameters do not match order");
        }

        validated = true;
      }

      // ====================================
      // SDK CONFIGURATION
      // ====================================
      else if (hashName === "get_sdk_configuration") {
        if (hashString !== `${merchantKey}|get_sdk_configuration|GET|`) {
          return fail("Invalid SDK configuration request");
        }

        validated = true;
      }

      // ====================================
      // CHECKOUT DETAILS - ANDROID + IOS
      // ====================================
      else if (hashName === "get_checkout_details") {
        const allowedCommands = PAYU_SDK_COMMANDS[hashName];

        if (
          !Array.isArray(allowedCommands) ||
          !allowedCommands.includes(parts[1]) ||
          parts.length !== 4 ||
          parts[3] !== ""
        ) {
          return fail("Invalid checkout command format");
        }

        const checkout = parseObject(parts[2]);

        if (!checkout) {
          return fail("Invalid checkout details JSON");
        }

        const txn = checkout.transactionDetails;

        const customer = checkout.customerDetails;

        const checkoutKeys = new Set([
          "requestId",
          "transactionDetails",
          "customerDetails",
          "useCase",
          "isSITxn",
        ]);

        const txnKeys = new Set(["amount", "txnId", "source"]);

        const customerKeys = new Set(["mobile"]);

        if (
          !onlyKeys(checkout, checkoutKeys) ||
          !onlyKeys(txn, txnKeys) ||
          !onlyKeys(customer, customerKeys)
        ) {
          return fail("Unexpected checkout details fields");
        }

        const isAndroid = txn.source === "Android_SDK";

        const isIOS = txn.source === "IOS_SDK";

        if (!isAndroid && !isIOS) {
          return fail("Unsupported PayU SDK platform");
        }

        const validRequestId = isAndroid
          ? typeof checkout.requestId === "string" &&
            new RegExp(`^${transactionId}\\d{10,16}$`).test(checkout.requestId)
          : checkout.requestId === transactionId;

        const validSI = isAndroid
          ? checkout.isSITxn === false
          : checkout.isSITxn === undefined || checkout.isSITxn === false;

        if (
          txn.txnId !== transactionId ||
          !amountMatches(txn.amount) ||
          normalizePayUPhone(customer.mobile) !== registeredPhone ||
          !validRequestId ||
          !validSI
        ) {
          return fail("Checkout parameters do not match order");
        }

        const useCaseKeys = new Set([
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
          !onlyKeys(checkout.useCase, useCaseKeys) ||
          Object.values(checkout.useCase).some(
            (value) => typeof value !== "boolean",
          )
        ) {
          return fail("Invalid checkout use-case");
        }

        validated = true;
      }
    }

    // ======================================
    // BLOCK UNKNOWN HASH REQUESTS
    // ======================================

    if (!validated) {
      return fail("Unsupported PayU SDK hash request");
    }

    // ======================================
    // GENERATE PAYU V1 HASH
    // ======================================

    const generatedHash = crypto
      .createHash("sha512")
      .update(`${hashString}${merchantSalt}`, "utf8")
      .digest("hex");

    // Do not log card details,
    // credentials or hashString.
    console.log("PAYU HASH GENERATED:", {
      orderId: String(order._id),
      hashName,
    });

    // ======================================
    // SUCCESS RESPONSE
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
    console.error("GENERATE PAYU HASH ERROR:", error);

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
    console.error("VERIFY PAYU PAYMENT ERROR:", error);

    return res.status(error.statusCode || 502).json({
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

const handlePayUCallback = async (req, res, source) => {
  try {
    const body = req.body || {};

    // ======================================================
    // 1. VALIDATE TRANSACTION ID
    // ======================================================

    if (typeof body.txnid !== "string" || !PAYU_TXN_REGEX.test(body.txnid)) {
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

    const expectedAmount = toPaise(getAmount(order.totalAmount));

    const callbackAmount = toPaise(body.amount);

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

        message: "PayU payment verified and purchase completed",

        data: result,
      });
    }

    // ======================================================
    // 8. EXPIRED ORDER RECONCILIATION
    // ======================================================

    if (result.status === "RECONCILIATION_REQUIRED") {
      console.error("PAYU PAYMENT RECONCILIATION REQUIRED:", {
        orderId: String(order._id),
        payuTxnId: order.payuTxnId,
        payuMihpayId: result.payuMihpayId,
      });

      return res.status(source === "WEBHOOK" ? 503 : 202).json({
        success: false,

        message: "PayU payment succeeded but order requires reconciliation",

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
    console.error(`PAYU ${source} ERROR:`, error);

    return res.status(error.statusCode || 503).json({
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

export const payuPaymentReturn = async (req, res) => {
  return handlePayUCallback(req, res, "RETURN");
};

// ============================================================
// 4. PAYU WEBHOOK
// ============================================================

export const payuWebhook = async (req, res) => {
  return handlePayUCallback(req, res, "WEBHOOK");
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
