// import mongoose from "mongoose";

// import Payment from "../model/PaymentModel.js";
// import Order from "../model/OrderModel.js";
// import Asset from "../model/coAssetModel.js";
// import User from "../model/userModel.js";
// import PurchaseHistory from "../model/purchaseHistoryModel.js";

// import { allocateFractions } from "./ownerShipService.js";

// const getIndianTime = () => {
//   const istOffset = 5.5 * 60 * 60 * 1000;

//   return new Date(Date.now() + istOffset);
// };

// const generateTransactionReference = (purchaseId) => {
//   const suffix = purchaseId.toString().slice(-10).toUpperCase();

//   return `BND-TXN-${suffix}`;
// };

// export const finalizeSuccessfulPayment = async ({
//   razorpayOrderId,
//   razorpayPaymentId,
//   razorpaySignature = null,
//   paymentMethod = null,
//   webhookVerified = false,
// }) => {
//   const session = await mongoose.startSession();

//   let purchaseHistoryId = null;

//   try {
//     await session.withTransaction(async () => {
//       // ==================================
//       // 1. FIND PAYMENT
//       // ==================================

//       const payment = await Payment.findOne({
//         razorpayOrderId,
//       })
//         .select("+razorpaySignature")
//         .session(session);

//       if (!payment) {
//         const error = new Error("Payment record not found");

//         error.statusCode = 404;

//         throw error;
//       }

//       // ==================================
//       // 2. IDEMPOTENCY
//       // ==================================

//       if (payment.status === "SUCCESS" && payment.purchaseHistoryId) {
//         if (razorpaySignature) {
//           payment.razorpaySignature = razorpaySignature;

//           payment.signatureVerified = true;
//         }

//         if (paymentMethod) {
//           payment.paymentMethod = paymentMethod;
//         }

//         if (webhookVerified) {
//           payment.webhookVerified = true;
//         }

//         if (!payment.razorpayPaymentId) {
//           payment.razorpayPaymentId = razorpayPaymentId;
//         }

//         await payment.save({
//           session,
//         });

//         purchaseHistoryId = payment.purchaseHistoryId;

//         return;
//       }

//       // ==================================
//       // 3. FIND ORDER
//       // ==================================

//       const order = await Order.findById(payment.orderId).session(session);

//       if (!order) {
//         const error = new Error("Order not found");

//         error.statusCode = 404;

//         throw error;
//       }

//       if (order.status !== "PENDING_PAYMENT") {
//         const error = new Error(
//           `Order status is ${order.status}. Payment cannot be finalized.`,
//         );

//         error.statusCode = 409;

//         throw error;
//       }

//       // ==================================
//       // 4. FIND USER + ASSET
//       // ==================================

//       const [user, asset] = await Promise.all([
//         User.findById(order.userId).session(session),

//         Asset.findById(order.assetId).session(session),
//       ]);

//       if (!user) {
//         throw new Error("User not found");
//       }

//       if (!asset) {
//         throw new Error("Asset not found");
//       }

//       // ==================================
//       // 5. ALLOCATE OWNERSHIP
//       // ==================================

//       const ownershipResult = await allocateFractions({
//         assetId: order.assetId,

//         userId: order.userId,

//         fractions: order.fractions,

//         razorpayOrderId,

//         razorpayPaymentId,

//         session,
//       });

//       if (!ownershipResult?.ownership) {
//         throw new Error("Unable to allocate ownership");
//       }

//       // ==================================
//       // 6. FINALIZE RESERVED FRACTIONS
//       // ==================================

//       /*
//        * createOrder already did:
//        *
//        * availableFractions -= fractions
//        * reservedFractions += fractions
//        *
//        * Successful payment therefore ONLY:
//        *
//        * reservedFractions -= fractions
//        */

//       const assetUpdate = await Asset.updateOne(
//         {
//           _id: order.assetId,

//           reservedFractions: {
//             $gte: order.fractions,
//           },
//         },

//         {
//           $inc: {
//             reservedFractions: -order.fractions,
//           },
//         },

//         {
//           session,
//         },
//       );

//       if (assetUpdate.modifiedCount !== 1) {
//         throw new Error("Unable to finalize reserved fractions");
//       }

//       // ==================================
//       // 7. CHECK EXISTING PURCHASE
//       // ==================================

//       let purchase = await PurchaseHistory.findOne({
//         orderId: order._id,
//       }).session(session);

//       // ==================================
//       // 8. CREATE PURCHASE HISTORY
//       // ==================================

//       if (!purchase) {
//         const totalMonthlyRental =
//           Number(asset.rentalAmountPerFraction || 0) * Number(order.fractions);

//         const createdPurchases = await PurchaseHistory.create(
//           [
//             {
//               // THESE WERE MISSING
//               // IN YOUR OLD FLOW
//               orderId: order._id,

//               paymentId: payment._id,

//               assetId: order.assetId,

//               userId: order.userId,

//               // =======================
//               // PURCHASE DETAILS
//               // =======================

//               fractionsPurchased: order.fractions,

//               amountPerFraction: order.amountPerFraction,

//               totalAmount: order.totalAmount,

//               // =======================
//               // USER SNAPSHOT
//               // =======================

//               userSnapshot: {
//                 name: user.name || user.fullName || null,

//                 email: user.email || null,

//                 phone: user.phone || user.mobile || null,
//               },

//               // =======================
//               // ASSET SNAPSHOT
//               // =======================

//               assetSnapshot: {
//                 assetName: asset.assetName || null,

//                 assetCode: asset.assetCode || null,

//                 specification: asset.specification || null,

//                 assetCost: asset.assetCost ?? null,

//                 rentalAmountPerFraction: asset.rentalAmountPerFraction ?? null,

//                 totalMonthlyRental,

//                 durationMonths: asset.durationMonths ?? null,

//                 lockInMonths: asset.lockInMonths ?? null,
//               },

//               // =======================
//               // PAYMENT SNAPSHOT
//               // =======================

//               paymentStatus: "SUCCESS",

//               razorpayOrderId,

//               razorpayPaymentId,

//               razorpaySignature,

//               paymentMethod,

//               currency: "INR",

//               paidAt: getIndianTime(),

//               // PDF later
//               documentGenerationStatus: "NOT_STARTED",
//             },
//           ],

//           {
//             session,
//           },
//         );

//         purchase = createdPurchases[0];

//         purchase.transactionReference = generateTransactionReference(
//           purchase._id,
//         );

//         await purchase.save({
//           session,
//         });
//       }

//       // ==================================
//       // 9. UPDATE PAYMENT
//       // ==================================

//       payment.razorpayPaymentId = razorpayPaymentId;

//       if (razorpaySignature) {
//         payment.razorpaySignature = razorpaySignature;

//         payment.signatureVerified = true;
//       }

//       if (paymentMethod) {
//         payment.paymentMethod = paymentMethod;
//       }

//       if (webhookVerified) {
//         payment.webhookVerified = true;
//       }

//       payment.status = "SUCCESS";

//       payment.paidAt = payment.paidAt || getIndianTime();

//       payment.purchaseHistoryId = purchase._id;

//       await payment.save({
//         session,
//       });

//       // ==================================
//       // 10. COMPLETE ORDER
//       // ==================================

//       order.status = "COMPLETED";

//       await order.save({
//         session,
//       });

//       purchaseHistoryId = purchase._id;
//     });

//     return {
//       success: true,

//       purchaseHistoryId,
//     };
//   } catch (error) {
//     /*
//      * Protection for simultaneous
//      * Flutter verify + webhook execution.
//      */
//     if (error?.code === 11000) {
//       const existingPurchase = await PurchaseHistory.findOne({
//         razorpayPaymentId,
//       });

//       if (existingPurchase) {
//         return {
//           success: true,

//           purchaseHistoryId: existingPurchase._id,
//         };
//       }
//     }

//     throw error;
//   } finally {
//     await session.endSession();
//   }
// };

// import mongoose from "mongoose";

// import Order from "../model/OrderModel.js";
// import Payment from "../model/PaymentModel.js";
// import Asset from "../model/coAssetModel.js";
// import PurchaseHistory from "../model/purchaseHistoryModel.js";

// import { allocateFractions } from "./ownerShipService.js";

// // ============================================================
// // CREATE ERROR
// // ============================================================

// const createError = (statusCode, message) => {
//   const error = new Error(message);

//   error.statusCode = statusCode;

//   return error;
// };

// // ============================================================
// // NORMALIZE PAID AT
// //
// // IMPORTANT:
// //
// // MongoDB me actual timestamp save hoga.
// // Yaha manually +5:30 add nahi karna.
// //
// // Display time par:
// //
// // timeZone: "Asia/Kolkata"
// //
// // use karna.
// // ============================================================

// const normalizePaidAt = (paidAt) => {
//   if (paidAt) {
//     const parsedDate = new Date(paidAt);

//     if (!Number.isNaN(parsedDate.getTime())) {
//       return parsedDate;
//     }
//   }

//   return new Date();
// };

// // ============================================================
// // BUILD ASSET SNAPSHOT
// // ============================================================

// const buildAssetSnapshot = (asset) => {
//   return {
//     assetName: asset.assetName ?? null,

//     assetCode: asset.assetCode ?? null,

//     specification: asset.specification ?? null,

//     assetCost: Number(asset.assetCost || 0),

//     totalFractions: Number(asset.totalFractions || 0),

//     amountPerFraction: Number(asset.amountPerFraction || 0),

//     rentalAmountPerFraction: Number(asset.rentalAmountPerFraction || 0),

//     durationMonths: Number(asset.durationMonths || 0),

//     lockInMonths: Number(asset.lockInMonths || 0),
//   };
// };

// // ============================================================
// // FIND EXISTING PURCHASE
// //
// // Used for duplicate/idempotent protection.
// // ============================================================

// const findExistingPurchase = async ({ orderId, paymentId, session = null }) => {
//   let query = PurchaseHistory.findOne({
//     $or: [
//       {
//         orderId,
//       },
//       {
//         paymentId,
//       },
//     ],
//   });

//   if (session) {
//     query = query.session(session);
//   }

//   return query;
// };

// // ============================================================
// // FINALIZE SUCCESSFUL PAYMENT
// // ============================================================

// export const finalizeSuccessfulPayment = async ({
//   razorpayOrderId,
//   razorpayPaymentId,
//   razorpaySignature = null,
//   paymentMethod = null,
//   webhookVerified = false,
//   paidAt = null,
// }) => {
//   // ========================================================
//   // 1. VALIDATION
//   // ========================================================

//   if (!razorpayOrderId) {
//     throw createError(400, "Razorpay order ID is required");
//   }

//   if (!razorpayPaymentId) {
//     throw createError(400, "Razorpay payment ID is required");
//   }

//   // ========================================================
//   // 2. FINAL PAID AT
//   //
//   // Same timestamp will be used for:
//   //
//   // Payment.paidAt
//   // PurchaseHistory.paidAt
//   // ========================================================

//   const finalPaidAt = normalizePaidAt(paidAt);

//   // ========================================================
//   // 3. FIND PAYMENT
//   // ========================================================

//   const payment = await Payment.findOne({
//     razorpayOrderId,
//   });

//   if (!payment) {
//     throw createError(404, "Payment record not found");
//   }

//   // ========================================================
//   // 4. DUPLICATE PAYMENT ID PROTECTION
//   // ========================================================

//   if (
//     payment.status === "SUCCESS" &&
//     payment.razorpayPaymentId &&
//     String(payment.razorpayPaymentId) !== String(razorpayPaymentId)
//   ) {
//     throw createError(
//       409,
//       "This order has already been completed using another payment",
//     );
//   }

//   // ========================================================
//   // 5. FIND ORDER
//   // ========================================================

//   const order = await Order.findById(payment.orderId);

//   if (!order) {
//     throw createError(404, "Order not found");
//   }

//   // ========================================================
//   // 6. FIND ASSET
//   // ========================================================

//   const asset = await Asset.findById(order.assetId);

//   if (!asset) {
//     throw createError(404, "Asset not found");
//   }

//   // ========================================================
//   // 7. FIND EXISTING PURCHASE
//   // ========================================================

//   const existingPurchase = await findExistingPurchase({
//     orderId: order._id,

//     paymentId: payment._id,
//   });

//   // ========================================================
//   // 8. ALREADY COMPLETED
//   //
//   // Important:
//   //
//   // Fractions dobara allocate nahi honge.
//   //
//   // Old records me paidAt missing hai to repair karenge.
//   // ========================================================

//   if (payment.status === "SUCCESS" && existingPurchase) {
//     const existingPaidAt =
//       existingPurchase.paidAt || payment.paidAt || finalPaidAt;

//     // ======================================================
//     // UPDATE MISSING PAYMENT VALUES
//     // ======================================================

//     const paymentUpdate = {};

//     if (!payment.paidAt) {
//       paymentUpdate.paidAt = existingPaidAt;
//     }

//     if (!payment.razorpayPaymentId) {
//       paymentUpdate.razorpayPaymentId = razorpayPaymentId;
//     }

//     if (razorpaySignature && !payment.razorpaySignature) {
//       paymentUpdate.razorpaySignature = razorpaySignature;
//     }

//     if (paymentMethod && !payment.paymentMethod) {
//       paymentUpdate.paymentMethod = paymentMethod;
//     }

//     if (webhookVerified && !payment.webhookVerified) {
//       paymentUpdate.webhookVerified = true;

//       paymentUpdate.webhookVerifiedAt = finalPaidAt;
//     }

//     // ======================================================
//     // SAVE PAYMENT REPAIR
//     // ======================================================

//     if (Object.keys(paymentUpdate).length > 0) {
//       await Payment.updateOne(
//         {
//           _id: payment._id,
//         },

//         {
//           $set: paymentUpdate,
//         },
//       );
//     }

//     // ======================================================
//     // REPAIR PURCHASE HISTORY PAID AT
//     // ======================================================

//     if (!existingPurchase.paidAt) {
//       await PurchaseHistory.updateOne(
//         {
//           _id: existingPurchase._id,

//           $or: [
//             {
//               paidAt: null,
//             },

//             {
//               paidAt: {
//                 $exists: false,
//               },
//             },
//           ],
//         },

//         {
//           $set: {
//             paidAt: existingPaidAt,
//           },
//         },
//       );
//     }

//     // ======================================================
//     // EXISTING PURCHASE RESPONSE
//     // ======================================================

//     return {
//       success: true,

//       alreadyProcessed: true,

//       purchaseHistoryId: existingPurchase._id,

//       paymentId: payment._id,

//       orderId: order._id,

//       paidAt: existingPaidAt,
//     };
//   }

//   // ========================================================
//   // 9. EXPIRED ORDER
//   // ========================================================

//   if (order.status === "EXPIRED") {
//     throw createError(
//       409,
//       "Order has expired. Successful payment requires manual reconciliation",
//     );
//   }

//   // ========================================================
//   // 10. START TRANSACTION
//   // ========================================================

//   const session = await mongoose.startSession();

//   let purchaseHistory = null;

//   try {
//     await session.withTransaction(async () => {
//       // ==================================================
//       // 11. RELOAD PAYMENT
//       // ==================================================

//       const currentPayment = await Payment.findById(payment._id).session(
//         session,
//       );

//       if (!currentPayment) {
//         throw createError(404, "Payment record not found");
//       }

//       // ==================================================
//       // 12. RELOAD ORDER
//       // ==================================================

//       const currentOrder = await Order.findById(order._id).session(session);

//       if (!currentOrder) {
//         throw createError(404, "Order not found");
//       }

//       // ==================================================
//       // 13. CHECK EXISTING PURCHASE AGAIN
//       //
//       // Parallel request protection.
//       // ==================================================

//       const purchaseAlreadyExists = await findExistingPurchase({
//         orderId: currentOrder._id,

//         paymentId: currentPayment._id,

//         session,
//       });

//       if (purchaseAlreadyExists) {
//         const existingPaidAt =
//           purchaseAlreadyExists.paidAt || currentPayment.paidAt || finalPaidAt;

//         // ================================================
//         // REPAIR PURCHASE PAID AT
//         // ================================================

//         if (!purchaseAlreadyExists.paidAt) {
//           purchaseAlreadyExists.paidAt = existingPaidAt;

//           await purchaseAlreadyExists.save({
//             session,
//           });
//         }

//         // ================================================
//         // UPDATE PAYMENT
//         // ================================================

//         currentPayment.status = "SUCCESS";

//         currentPayment.razorpayPaymentId = razorpayPaymentId;

//         if (razorpaySignature) {
//           currentPayment.razorpaySignature = razorpaySignature;
//         }

//         if (paymentMethod) {
//           currentPayment.paymentMethod = paymentMethod;
//         }

//         if (!currentPayment.paidAt) {
//           currentPayment.paidAt = existingPaidAt;
//         }

//         if (webhookVerified) {
//           currentPayment.webhookVerified = true;

//           currentPayment.webhookVerifiedAt =
//             currentPayment.webhookVerifiedAt || finalPaidAt;
//         }

//         await currentPayment.save({
//           session,
//         });

//         purchaseHistory = purchaseAlreadyExists;

//         return;
//       }

//       // ==================================================
//       // 14. ORDER STATUS CHECK
//       // ==================================================

//       if (currentOrder.status === "EXPIRED") {
//         throw createError(
//           409,
//           "Order has expired. Successful payment requires manual reconciliation",
//         );
//       }

//       if (!["PENDING_PAYMENT", "COMPLETED"].includes(currentOrder.status)) {
//         throw createError(
//           409,
//           `Order cannot be completed from status ${currentOrder.status}`,
//         );
//       }

//       // ==================================================
//       // 15. ALLOCATE FRACTIONS
//       //
//       // IMPORTANT:
//       //
//       // allocateFractions should only manage ownership.
//       //
//       // PurchaseHistory should NOT be created there.
//       // ==================================================

//       await allocateFractions({
//         assetId: currentOrder.assetId,

//         userId: currentOrder.userId,

//         fractions: currentOrder.fractions,

//         razorpayOrderId,

//         razorpayPaymentId,

//         session,
//       });

//       // ==================================================
//       // 16. UPDATE PAYMENT
//       // ==================================================

//       currentPayment.razorpayPaymentId = razorpayPaymentId;

//       if (razorpaySignature) {
//         currentPayment.razorpaySignature = razorpaySignature;
//       }

//       currentPayment.status = "SUCCESS";

//       // ==================================================
//       // SAVE PAID AT
//       // ==================================================

//       currentPayment.paidAt = currentPayment.paidAt || finalPaidAt;

//       // ==================================================
//       // PAYMENT METHOD
//       // ==================================================

//       if (paymentMethod) {
//         currentPayment.paymentMethod = paymentMethod;
//       }

//       // ==================================================
//       // WEBHOOK DATA
//       // ==================================================

//       if (webhookVerified) {
//         currentPayment.webhookVerified = true;

//         currentPayment.webhookVerifiedAt =
//           currentPayment.webhookVerifiedAt || finalPaidAt;
//       }

//       // ==================================================
//       // SAVE PAYMENT
//       // ==================================================

//       await currentPayment.save({
//         session,
//       });

//       // ==================================================
//       // 17. RELEASE RESERVED FRACTIONS
//       //
//       // During order creation:
//       //
//       // availableFractions -= fractions
//       // reservedFractions += fractions
//       //
//       // After successful payment:
//       //
//       // reservedFractions -= fractions
//       //
//       // availableFractions does NOT increase.
//       // ==================================================

//       if (currentOrder.status === "PENDING_PAYMENT") {
//         const assetUpdate = await Asset.updateOne(
//           {
//             _id: currentOrder.assetId,

//             reservedFractions: {
//               $gte: currentOrder.fractions,
//             },
//           },

//           {
//             $inc: {
//               reservedFractions: -Number(currentOrder.fractions),
//             },
//           },

//           {
//             session,
//           },
//         );

//         if (assetUpdate.modifiedCount !== 1) {
//           throw createError(409, "Unable to finalize reserved fractions");
//         }
//       }

//       // ==================================================
//       // 18. COMPLETE ORDER
//       // ==================================================

//       currentOrder.status = "COMPLETED";

//       await currentOrder.save({
//         session,
//       });

//       // ==================================================
//       // 19. GET UPDATED ASSET
//       // ==================================================

//       const currentAsset = await Asset.findById(currentOrder.assetId).session(
//         session,
//       );

//       if (!currentAsset) {
//         throw createError(404, "Asset not found");
//       }

//       // ==================================================
//       // 20. CREATE SNAPSHOT
//       // ==================================================

//       const assetSnapshot = buildAssetSnapshot(currentAsset);

//       // ==================================================
//       // 21. CREATE PURCHASE HISTORY
//       //
//       // Important:
//       //
//       // orderId + paymentId both save karna required hai.
//       // ==================================================

//       const purchaseRecords = await PurchaseHistory.create(
//         [
//           {
//             // ==========================================
//             // USER
//             // ==========================================

//             userId: currentOrder.userId,

//             // ==========================================
//             // ASSET
//             // ==========================================

//             assetId: currentOrder.assetId,

//             // ==========================================
//             // INTERNAL ORDER
//             // ==========================================

//             orderId: currentOrder._id,

//             // ==========================================
//             // INTERNAL PAYMENT
//             // ==========================================

//             paymentId: currentPayment._id,

//             // ==========================================
//             // FRACTIONS
//             // ==========================================

//             fractionsPurchased: Number(currentOrder.fractions || 0),

//             // ==========================================
//             // FRACTION PRICE
//             // ==========================================

//             amountPerFraction: Number(
//               currentOrder.amountPerFraction ||
//                 currentAsset.amountPerFraction ||
//                 0,
//             ),

//             // ==========================================
//             // TOTAL PAID
//             // ==========================================

//             totalAmount: Number(
//               currentOrder.totalAmount || currentPayment.amount || 0,
//             ),

//             // ==========================================
//             // PAYMENT STATUS
//             // ==========================================

//             paymentStatus: "SUCCESS",

//             // ==========================================
//             // RAZORPAY ORDER ID
//             // ==========================================

//             razorpayOrderId,

//             // ==========================================
//             // RAZORPAY PAYMENT ID
//             // ==========================================

//             razorpayPaymentId,

//             // ==========================================
//             // RAZORPAY SIGNATURE
//             // ==========================================

//             razorpaySignature: razorpaySignature || null,

//             // ==========================================
//             // TRANSACTION REFERENCE
//             // ==========================================

//             transactionReference: razorpayPaymentId,

//             // ==========================================
//             // PAID AT
//             //
//             // This is used for:
//             //
//             // Purchase Date
//             // Agreement Date
//             // Acquisition Date
//             // ==========================================

//             paidAt: currentPayment.paidAt || finalPaidAt,

//             // ==========================================
//             // ASSET SNAPSHOT
//             // ==========================================

//             assetSnapshot,
//           },
//         ],

//         {
//           session,
//         },
//       );

//       purchaseHistory = purchaseRecords[0];
//     });

//     // ======================================================
//     // 22. SAFETY CHECK
//     // ======================================================

//     if (!purchaseHistory) {
//       purchaseHistory = await findExistingPurchase({
//         orderId: order._id,

//         paymentId: payment._id,
//       });
//     }

//     if (!purchaseHistory) {
//       throw createError(
//         500,
//         "Payment completed but purchase history could not be created",
//       );
//     }

//     // ======================================================
//     // 23. SUCCESS RESPONSE
//     // ======================================================

//     return {
//       success: true,

//       alreadyProcessed: false,

//       purchaseHistoryId: purchaseHistory._id,

//       paymentId: payment._id,

//       orderId: order._id,

//       paidAt: purchaseHistory.paidAt || finalPaidAt,
//     };
//   } catch (error) {
//     console.error("FINALIZE SUCCESSFUL PAYMENT ERROR:", error);

//     throw error;
//   } finally {
//     await session.endSession();
//   }
// };

// import mongoose from "mongoose";

// import Order from "../model/OrderModel.js";
// import Payment from "../model/PaymentModel.js";
// import Asset from "../model/coAssetModel.js";
// import PurchaseHistory from "../model/purchaseHistoryModel.js";

// import { allocateFractions } from "./ownerShipService.js";

// const createError = (statusCode, message) => {
//   const error = new Error(message);
//   error.statusCode = statusCode;
//   return error;
// };

// const normalizePaidAt = (paidAt) => {
//   if (paidAt) {
//     const parsedDate = new Date(paidAt);

//     if (!Number.isNaN(parsedDate.getTime())) {
//       return parsedDate;
//     }
//   }

//   return new Date();
// };

// const buildAssetSnapshot = (asset) => {
//   return {
//     assetName: asset.assetName ?? null,
//     assetCode: asset.assetCode ?? null,
//     specification: asset.specification ?? null,
//     assetCost: Number(asset.assetCost || 0),
//     totalFractions: Number(asset.totalFractions || 0),
//     amountPerFraction: Number(asset.amountPerFraction || 0),
//     rentalAmountPerFraction: Number(asset.rentalAmountPerFraction || 0),
//     durationMonths: Number(asset.durationMonths || 0),
//     lockInMonths: Number(asset.lockInMonths || 0),
//   };
// };

// const findExistingPurchase = async ({
//   orderId,
//   paymentId,
//   session = null,
// }) => {
//   let query = PurchaseHistory.findOne({
//     $or: [{ orderId }, { paymentId }],
//   });

//   if (session) {
//     query = query.session(session);
//   }

//   return query;
// };

// export const finalizeSuccessfulPayment = async ({
//   razorpayOrderId,
//   razorpayPaymentId,
//   razorpaySignature = null,
//   paymentMethod = null,
//   webhookVerified = false,
//   paidAt = null,
// }) => {
//   if (!razorpayOrderId) {
//     throw createError(400, "Razorpay order ID is required");
//   }

//   if (!razorpayPaymentId) {
//     throw createError(400, "Razorpay payment ID is required");
//   }

//   const finalPaidAt = normalizePaidAt(paidAt);

//   const payment = await Payment.findOne({
//     razorpayOrderId,
//   });

//   if (!payment) {
//     throw createError(404, "Payment record not found");
//   }

//   if (
//     payment.status === "SUCCESS" &&
//     payment.razorpayPaymentId &&
//     String(payment.razorpayPaymentId) !== String(razorpayPaymentId)
//   ) {
//     throw createError(
//       409,
//       "This order has already been completed using another payment",
//     );
//   }

//   const order = await Order.findById(payment.orderId);

//   if (!order) {
//     throw createError(404, "Order not found");
//   }

//   const asset = await Asset.findById(order.assetId);

//   if (!asset) {
//     throw createError(404, "Asset not found");
//   }

//   const existingPurchase = await findExistingPurchase({
//     orderId: order._id,
//     paymentId: payment._id,
//   });

//   if (payment.status === "SUCCESS" && existingPurchase) {
//     const existingPaidAt =
//       existingPurchase.paidAt || payment.paidAt || finalPaidAt;

//     const paymentUpdate = {};

//     if (!payment.paidAt) {
//       paymentUpdate.paidAt = existingPaidAt;
//     }

//     if (!payment.razorpayPaymentId) {
//       paymentUpdate.razorpayPaymentId = razorpayPaymentId;
//     }

//     if (razorpaySignature && !payment.razorpaySignature) {
//       paymentUpdate.razorpaySignature = razorpaySignature;
//     }

//     if (paymentMethod && !payment.paymentMethod) {
//       paymentUpdate.paymentMethod = paymentMethod;
//     }

//     if (webhookVerified && !payment.webhookVerified) {
//       paymentUpdate.webhookVerified = true;
//       paymentUpdate.webhookVerifiedAt = finalPaidAt;
//     }

//     if (Object.keys(paymentUpdate).length > 0) {
//       await Payment.updateOne(
//         {
//           _id: payment._id,
//         },
//         {
//           $set: paymentUpdate,
//         },
//       );
//     }

//     if (!existingPurchase.paidAt) {
//       await PurchaseHistory.updateOne(
//         {
//           _id: existingPurchase._id,
//           $or: [
//             {
//               paidAt: null,
//             },
//             {
//               paidAt: {
//                 $exists: false,
//               },
//             },
//           ],
//         },
//         {
//           $set: {
//             paidAt: existingPaidAt,
//           },
//         },
//       );
//     }

//     return {
//       success: true,
//       alreadyProcessed: true,
//       purchaseHistoryId: existingPurchase._id,
//       paymentId: payment._id,
//       orderId: order._id,
//       paidAt: existingPaidAt,
//     };
//   }

//   if (order.status === "EXPIRED") {
//     throw createError(
//       409,
//       "Order has expired. Successful payment requires manual reconciliation",
//     );
//   }

//   const session = await mongoose.startSession();

//   let purchaseHistory = null;

//   try {
//     await session.withTransaction(async () => {
//       const currentPayment = await Payment.findById(
//         payment._id,
//       ).session(session);

//       if (!currentPayment) {
//         throw createError(404, "Payment record not found");
//       }

//       const currentOrder = await Order.findById(
//         order._id,
//       ).session(session);

//       if (!currentOrder) {
//         throw createError(404, "Order not found");
//       }

//       const purchaseAlreadyExists = await findExistingPurchase({
//         orderId: currentOrder._id,
//         paymentId: currentPayment._id,
//         session,
//       });

//       if (purchaseAlreadyExists) {
//         const existingPaidAt =
//           purchaseAlreadyExists.paidAt ||
//           currentPayment.paidAt ||
//           finalPaidAt;

//         if (!purchaseAlreadyExists.paidAt) {
//           purchaseAlreadyExists.paidAt = existingPaidAt;

//           await purchaseAlreadyExists.save({
//             session,
//           });
//         }

//         currentPayment.status = "SUCCESS";
//         currentPayment.razorpayPaymentId = razorpayPaymentId;

//         if (razorpaySignature) {
//           currentPayment.razorpaySignature = razorpaySignature;
//         }

//         if (paymentMethod) {
//           currentPayment.paymentMethod = paymentMethod;
//         }

//         if (!currentPayment.paidAt) {
//           currentPayment.paidAt = existingPaidAt;
//         }

//         if (webhookVerified) {
//           currentPayment.webhookVerified = true;

//           currentPayment.webhookVerifiedAt =
//             currentPayment.webhookVerifiedAt || finalPaidAt;
//         }

//         await currentPayment.save({
//           session,
//         });

//         purchaseHistory = purchaseAlreadyExists;

//         return;
//       }

//       if (currentOrder.status === "EXPIRED") {
//         throw createError(
//           409,
//           "Order has expired. Successful payment requires manual reconciliation",
//         );
//       }

//       if (
//         !["PENDING_PAYMENT", "COMPLETED"].includes(
//           currentOrder.status,
//         )
//       ) {
//         throw createError(
//           409,
//           `Order cannot be completed from status ${currentOrder.status}`,
//         );
//       }

//       await allocateFractions({
//         assetId: currentOrder.assetId,
//         userId: currentOrder.userId,
//         fractions: currentOrder.fractions,
//         razorpayOrderId,
//         razorpayPaymentId,
//         session,
//       });

//       currentPayment.razorpayPaymentId = razorpayPaymentId;

//       if (razorpaySignature) {
//         currentPayment.razorpaySignature = razorpaySignature;
//       }

//       currentPayment.status = "SUCCESS";

//       currentPayment.paidAt =
//         currentPayment.paidAt || finalPaidAt;

//       if (paymentMethod) {
//         currentPayment.paymentMethod = paymentMethod;
//       }

//       if (webhookVerified) {
//         currentPayment.webhookVerified = true;

//         currentPayment.webhookVerifiedAt =
//           currentPayment.webhookVerifiedAt || finalPaidAt;
//       }

//       await currentPayment.save({
//         session,
//       });

//       if (currentOrder.status === "PENDING_PAYMENT") {
//         const assetUpdate = await Asset.updateOne(
//           {
//             _id: currentOrder.assetId,
//             reservedFractions: {
//               $gte: currentOrder.fractions,
//             },
//           },
//           {
//             $inc: {
//               reservedFractions: -Number(
//                 currentOrder.fractions,
//               ),
//             },
//           },
//           {
//             session,
//           },
//         );

//         if (assetUpdate.modifiedCount !== 1) {
//           throw createError(
//             409,
//             "Unable to finalize reserved fractions",
//           );
//         }
//       }

//       currentOrder.status = "COMPLETED";

//       await currentOrder.save({
//         session,
//       });

//       const currentAsset = await Asset.findById(
//         currentOrder.assetId,
//       ).session(session);

//       if (!currentAsset) {
//         throw createError(404, "Asset not found");
//       }

//       const assetSnapshot = buildAssetSnapshot(currentAsset);

//       const purchaseRecords = await PurchaseHistory.create(
//         [
//           {
//             userId: currentOrder.userId,
//             assetId: currentOrder.assetId,
//             orderId: currentOrder._id,
//             paymentId: currentPayment._id,

//             fractionsPurchased: Number(
//               currentOrder.fractions || 0,
//             ),

//             amountPerFraction: Number(
//               currentOrder.amountPerFraction ||
//                 currentAsset.amountPerFraction ||
//                 0,
//             ),

//             totalAmount: Number(
//               currentOrder.totalAmount ||
//                 currentPayment.amount ||
//                 0,
//             ),

//             paymentStatus: "SUCCESS",

//             razorpayOrderId,
//             razorpayPaymentId,

//             razorpaySignature: razorpaySignature || null,

//             transactionReference: razorpayPaymentId,

//             paidAt:
//               currentPayment.paidAt || finalPaidAt,

//             assetSnapshot,
//           },
//         ],
//         {
//           session,
//         },
//       );

//       purchaseHistory = purchaseRecords[0];
//     });

//     if (!purchaseHistory) {
//       purchaseHistory = await findExistingPurchase({
//         orderId: order._id,
//         paymentId: payment._id,
//       });
//     }

//     if (!purchaseHistory) {
//       throw createError(
//         500,
//         "Payment completed but purchase history could not be created",
//       );
//     }

//     return {
//       success: true,
//       alreadyProcessed: false,
//       purchaseHistoryId: purchaseHistory._id,
//       paymentId: payment._id,
//       orderId: order._id,
//       paidAt: purchaseHistory.paidAt || finalPaidAt,
//     };
//   } catch (error) {
//     console.error(
//       "FINALIZE SUCCESSFUL PAYMENT ERROR:",
//       error,
//     );

//     throw error;
//   } finally {
//     await session.endSession();
//   }
// };


import mongoose from "mongoose";

import Order from "../model/OrderModel.js";
import Payment from "../model/PaymentModel.js";
import Asset from "../model/coAssetModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";

import { allocateFractions } from "./ownerShipService.js";
import { sendPaymentWelcomeEmail } from "./paymentWelcomeEmail.service.js";

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizePaidAt = (paidAt) => {
  if (paidAt) {
    const date = new Date(paidAt);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
};

const buildAssetSnapshot = (asset, fractionsPurchased) => ({
  assetName: asset.assetName ?? null,
  assetCode: asset.assetCode ?? null,
  specification: asset.specification ?? null,
  assetCost: asset.assetCost ?? null,
  registeredLegalOwner: asset.registeredLegalOwner ?? null,
  totalFractions: asset.totalFractions ?? null,
  amountPerFraction: asset.amountPerFraction ?? null,
  rentalAmountPerFraction: asset.rentalAmountPerFraction ?? null,
  totalMonthlyRental:
    asset.rentalAmountPerFraction == null
      ? null
      : Number(asset.rentalAmountPerFraction) * Number(fractionsPurchased),
  durationMonths: asset.durationMonths ?? null,
  lockInMonths: asset.lockInMonths ?? null,
});

const findExistingPurchase = async ({
  orderId,
  paymentId,
  session = null,
}) => {
  let query = PurchaseHistory.findOne({
    $or: [{ orderId }, { paymentId }],
  });

  if (session) query = query.session(session);

  return query;
};

const getUserSnapshot = async (userId, session = null) => {
  const User = mongoose.model("User");

  let query = User.findById(userId)
    .select("name fullName email phone mobile fullPhone")
    .lean();

  if (session) query = query.session(session);

  const user = await query;

  return {
    name: user?.name || user?.fullName || null,
    email: user?.email || null,
    phone: user?.fullPhone || user?.phone || user?.mobile || null,
  };
};

const sendPurchaseConfirmation = async (purchaseHistoryId) => {
  const purchase = await PurchaseHistory.findOneAndUpdate(
    {
      _id: purchaseHistoryId,
      paymentStatus: "SUCCESS",
      $or: [
        { paymentEmailStatus: "PENDING" },
        { paymentEmailStatus: { $exists: false } },
      ],
    },
    {
      $set: {
        paymentEmailStatus: "SENDING",
        paymentEmailClaimedAt: new Date(),
      },
      $inc: { paymentEmailAttempts: 1 },
    },
    { new: true },
  );

  if (!purchase) return;

  try {
    const userSnapshot = purchase.userSnapshot || {};
    const assetSnapshot = purchase.assetSnapshot || {};

    let customerEmail = userSnapshot.email || null;
    let customerName = userSnapshot.name || null;

    if (!customerEmail || !customerName) {
      const user = await getUserSnapshot(purchase.userId);

      customerEmail = customerEmail || user.email;
      customerName = customerName || user.name;
    }

    if (!customerEmail) {
      throw new Error("Customer email not found");
    }

    customerName = customerName || "Customer";

    const asset = await Asset.findById(purchase.assetId)
      .select(
        "assetName assetCode registeredLegalOwner totalFractions assetCost rentalAmountPerFraction",
      )
      .lean();

    const fractionsPurchased = Number(purchase.fractionsPurchased || 0);

    const monthlyRentalPerFraction =
      assetSnapshot.rentalAmountPerFraction ??
      asset?.rentalAmountPerFraction ??
      null;

    const totalFixedMonthlyRental =
      assetSnapshot.totalMonthlyRental ??
      (monthlyRentalPerFraction == null
        ? null
        : Number(monthlyRentalPerFraction) * fractionsPurchased);

    const emailDetails = {
      email: customerEmail,
      name: customerName,

      assetName:
        assetSnapshot.assetName ??
        asset?.assetName ??
        null,

      assetCode:
        assetSnapshot.assetCode ??
        asset?.assetCode ??
        null,

      registeredLegalOwner: customerName,

      totalAssetValue:
        assetSnapshot.assetCost ??
        asset?.assetCost ??
        null,

      totalFractions:
        assetSnapshot.totalFractions ??
        asset?.totalFractions ??
        null,

      amountPerFraction: purchase.amountPerFraction,
      fractionsPurchased,
      totalAmountPaid: purchase.totalAmount,
      acquisitionDate: purchase.paidAt,
      monthlyRentalPerFraction,
      totalFixedMonthlyRental,

      transactionId:
        purchase.transactionReference ||
        purchase.razorpayPaymentId,
    };

    console.log("PAYMENT EMAIL DETAILS:", {
      purchaseHistoryId: String(purchase._id),
      assetName: emailDetails.assetName,
      assetCode: emailDetails.assetCode,
      registeredLegalOwner: emailDetails.registeredLegalOwner,
      totalAssetValue: emailDetails.totalAssetValue,
      totalFractions: emailDetails.totalFractions,
      amountPerFraction: emailDetails.amountPerFraction,
      fractionsPurchased: emailDetails.fractionsPurchased,
      totalAmountPaid: emailDetails.totalAmountPaid,
      acquisitionDate: emailDetails.acquisitionDate,
      monthlyRentalPerFraction: emailDetails.monthlyRentalPerFraction,
      totalFixedMonthlyRental: emailDetails.totalFixedMonthlyRental,
    });

    await sendPaymentWelcomeEmail(emailDetails);

    await PurchaseHistory.updateOne(
      {
        _id: purchase._id,
        paymentEmailStatus: "SENDING",
      },
      {
        $set: {
          paymentEmailStatus: "SENT",
          paymentEmailSentAt: new Date(),
        },
        $unset: {
          paymentEmailClaimedAt: "",
        },
      },
    );

    console.log(
      "PAYMENT SUCCESS EMAIL SENT:",
      purchase.razorpayPaymentId,
    );
  } catch (error) {
    console.error(
      "PAYMENT SUCCESS EMAIL FAILED:",
      purchaseHistoryId,
      error,
    );

    try {
      await PurchaseHistory.updateOne(
        {
          _id: purchase._id,
          paymentEmailStatus: "SENDING",
        },
        {
          $set: {
            paymentEmailStatus: "FAILED",
          },
          $unset: {
            paymentEmailClaimedAt: "",
          },
        },
      );
    } catch (updateError) {
      console.error(
        "PAYMENT EMAIL STATUS UPDATE FAILED:",
        updateError,
      );
    }
  }
};

export const finalizeSuccessfulPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature = null,
  paymentMethod = null,
  webhookVerified = false,
  paidAt = null,
}) => {
  if (!razorpayOrderId) {
    throw createError(400, "Razorpay order ID is required");
  }

  if (!razorpayPaymentId) {
    throw createError(400, "Razorpay payment ID is required");
  }

  const finalPaidAt = normalizePaidAt(paidAt);

  const payment = await Payment.findOne({ razorpayOrderId });

  if (!payment) {
    throw createError(404, "Payment record not found");
  }

  if (
    payment.status === "SUCCESS" &&
    payment.razorpayPaymentId &&
    String(payment.razorpayPaymentId) !== String(razorpayPaymentId)
  ) {
    throw createError(
      409,
      "This order has already been completed using another payment",
    );
  }

  const order = await Order.findById(payment.orderId);

  if (!order) {
    throw createError(404, "Order not found");
  }

  const asset = await Asset.findById(order.assetId);

  if (!asset) {
    throw createError(404, "Asset not found");
  }

  const existingPurchase = await findExistingPurchase({
    orderId: order._id,
    paymentId: payment._id,
  });

  if (payment.status === "SUCCESS" && existingPurchase) {
    const existingPaidAt =
      existingPurchase.paidAt ||
      payment.paidAt ||
      finalPaidAt;

    const paymentUpdate = {};

    if (!payment.paidAt) {
      paymentUpdate.paidAt = existingPaidAt;
    }

    if (!payment.razorpayPaymentId) {
      paymentUpdate.razorpayPaymentId = razorpayPaymentId;
    }

    if (razorpaySignature && !payment.razorpaySignature) {
      paymentUpdate.razorpaySignature = razorpaySignature;
    }

    if (paymentMethod && !payment.paymentMethod) {
      paymentUpdate.paymentMethod = paymentMethod;
    }

    if (webhookVerified && !payment.webhookVerified) {
      paymentUpdate.webhookVerified = true;
      paymentUpdate.webhookVerifiedAt = finalPaidAt;
    }

    if (Object.keys(paymentUpdate).length > 0) {
      await Payment.updateOne(
        { _id: payment._id },
        { $set: paymentUpdate },
      );
    }

    if (!existingPurchase.paidAt) {
      await PurchaseHistory.updateOne(
        {
          _id: existingPurchase._id,
          $or: [
            { paidAt: null },
            { paidAt: { $exists: false } },
          ],
        },
        {
          $set: {
            paidAt: existingPaidAt,
          },
        },
      );
    }

    return {
      success: true,
      alreadyProcessed: true,
      purchaseHistoryId: existingPurchase._id,
      paymentId: payment._id,
      orderId: order._id,
      paidAt: existingPaidAt,
    };
  }

  if (order.status === "EXPIRED") {
    throw createError(
      409,
      "Order has expired. Successful payment requires manual reconciliation",
    );
  }

  const session = await mongoose.startSession();

  let purchaseHistory = null;
  let createdPurchase = false;

  try {
    await session.withTransaction(async () => {
      const currentPayment = await Payment.findById(
        payment._id,
      ).session(session);

      if (!currentPayment) {
        throw createError(404, "Payment record not found");
      }

      const currentOrder = await Order.findById(
        order._id,
      ).session(session);

      if (!currentOrder) {
        throw createError(404, "Order not found");
      }

      const purchaseAlreadyExists = await findExistingPurchase({
        orderId: currentOrder._id,
        paymentId: currentPayment._id,
        session,
      });

      if (purchaseAlreadyExists) {
        const existingPaidAt =
          purchaseAlreadyExists.paidAt ||
          currentPayment.paidAt ||
          finalPaidAt;

        if (!purchaseAlreadyExists.paidAt) {
          purchaseAlreadyExists.paidAt = existingPaidAt;

          await purchaseAlreadyExists.save({ session });
        }

        currentPayment.status = "SUCCESS";
        currentPayment.razorpayPaymentId = razorpayPaymentId;

        if (razorpaySignature) {
          currentPayment.razorpaySignature = razorpaySignature;
        }

        if (paymentMethod) {
          currentPayment.paymentMethod = paymentMethod;
        }

        if (!currentPayment.paidAt) {
          currentPayment.paidAt = existingPaidAt;
        }

        if (webhookVerified) {
          currentPayment.webhookVerified = true;
          currentPayment.webhookVerifiedAt =
            currentPayment.webhookVerifiedAt || finalPaidAt;
        }

        await currentPayment.save({ session });

        purchaseHistory = purchaseAlreadyExists;
        createdPurchase = false;

        return;
      }

      if (currentOrder.status === "EXPIRED") {
        throw createError(
          409,
          "Order has expired. Successful payment requires manual reconciliation",
        );
      }

      if (
        !["PENDING_PAYMENT", "COMPLETED"].includes(
          currentOrder.status,
        )
      ) {
        throw createError(
          409,
          `Order cannot be completed from status ${currentOrder.status}`,
        );
      }

      await allocateFractions({
        assetId: currentOrder.assetId,
        userId: currentOrder.userId,
        fractions: currentOrder.fractions,
        razorpayOrderId,
        razorpayPaymentId,
        session,
      });

      currentPayment.razorpayPaymentId = razorpayPaymentId;

      if (razorpaySignature) {
        currentPayment.razorpaySignature = razorpaySignature;
      }

      currentPayment.status = "SUCCESS";
      currentPayment.paidAt =
        currentPayment.paidAt || finalPaidAt;

      if (paymentMethod) {
        currentPayment.paymentMethod = paymentMethod;
      }

      if (webhookVerified) {
        currentPayment.webhookVerified = true;
        currentPayment.webhookVerifiedAt =
          currentPayment.webhookVerifiedAt || finalPaidAt;
      }

      await currentPayment.save({ session });

      if (currentOrder.status === "PENDING_PAYMENT") {
        const assetUpdate = await Asset.updateOne(
          {
            _id: currentOrder.assetId,
            reservedFractions: {
              $gte: currentOrder.fractions,
            },
          },
          {
            $inc: {
              reservedFractions: -Number(
                currentOrder.fractions,
              ),
            },
          },
          { session },
        );

        if (assetUpdate.modifiedCount !== 1) {
          throw createError(
            409,
            "Unable to finalize reserved fractions",
          );
        }
      }

      currentOrder.status = "COMPLETED";

      await currentOrder.save({ session });

      const currentAsset = await Asset.findById(
        currentOrder.assetId,
      ).session(session);

      if (!currentAsset) {
        throw createError(404, "Asset not found");
      }

      const fractionsPurchased = Number(
        currentOrder.fractions || 0,
      );

      const assetSnapshot = buildAssetSnapshot(
        currentAsset,
        fractionsPurchased,
      );

      const userSnapshot = await getUserSnapshot(
        currentOrder.userId,
        session,
      );

      const purchaseRecords = await PurchaseHistory.create(
        [
          {
            userId: currentOrder.userId,
            assetId: currentOrder.assetId,
            orderId: currentOrder._id,
            paymentId: currentPayment._id,

            fractionsPurchased,

            amountPerFraction: Number(
              currentOrder.amountPerFraction ||
                currentAsset.amountPerFraction ||
                0,
            ),

            totalAmount: Number(
              currentOrder.totalAmount ||
                currentPayment.amount ||
                0,
            ),

            userSnapshot,
            assetSnapshot,

            paymentStatus: "SUCCESS",

            razorpayOrderId,
            razorpayPaymentId,

            razorpaySignature:
              razorpaySignature || null,

            paymentMethod:
              paymentMethod ||
              currentPayment.paymentMethod ||
              null,

            transactionReference: razorpayPaymentId,

            paidAt:
              currentPayment.paidAt || finalPaidAt,

            paymentEmailStatus: "PENDING",
            paymentEmailAttempts: 0,
            paymentEmailSentAt: null,
            paymentEmailClaimedAt: null,
          },
        ],
        { session },
      );

      purchaseHistory = purchaseRecords[0];
      createdPurchase = true;
    });

    if (!purchaseHistory) {
      purchaseHistory = await findExistingPurchase({
        orderId: order._id,
        paymentId: payment._id,
      });
    }

    if (!purchaseHistory) {
      throw createError(
        500,
        "Payment completed but purchase history could not be created",
      );
    }

    if (createdPurchase) {
      const confirmationPurchaseId = purchaseHistory._id;

      setImmediate(() => {
        void sendPurchaseConfirmation(
          confirmationPurchaseId,
        ).catch((error) => {
          console.error(
            "PAYMENT EMAIL PROCESSING ERROR:",
            error,
          );
        });
      });
    }

    return {
      success: true,
      alreadyProcessed: false,
      purchaseHistoryId: purchaseHistory._id,
      paymentId: payment._id,
      orderId: order._id,
      paidAt: purchaseHistory.paidAt || finalPaidAt,
    };
  } catch (error) {
    console.error(
      "FINALIZE SUCCESSFUL PAYMENT ERROR:",
      error,
    );

    throw error;
  } finally {
    await session.endSession();
  }
};
