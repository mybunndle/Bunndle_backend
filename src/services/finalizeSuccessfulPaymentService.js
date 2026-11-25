// import mongoose from "mongoose";

// import Order from "../model/OrderModel.js";
// import Payment from "../model/PaymentModel.js";
// import Asset from "../model/coAssetModel.js";
// import PurchaseHistory from "../model/purchaseHistoryModel.js";

// import { allocateFractions } from "./ownerShipService.js";
// import { sendPaymentWelcomeEmail } from "./paymentWelcomeEmail.service.js";

// const createError = (statusCode, message) => {
//   const error = new Error(message);
//   error.statusCode = statusCode;
//   return error;
// };

// const normalizePaidAt = (paidAt) => {
//   if (paidAt) {
//     const date = new Date(paidAt);
//     if (!Number.isNaN(date.getTime())) return date;
//   }
//   return new Date();
// };

// const buildAssetSnapshot = (asset, fractionsPurchased) => ({
//   assetName: asset.assetName ?? null,
//   assetCode: asset.assetCode ?? null,
//   specification: asset.specification ?? null,
//   assetCost: asset.assetCost ?? null,
//   registeredLegalOwner: asset.registeredLegalOwner ?? null,
//   totalFractions: asset.totalFractions ?? null,
//   amountPerFraction: asset.amountPerFraction ?? null,
//   rentalAmountPerFraction: asset.rentalAmountPerFraction ?? null,
//   totalMonthlyRental:
//     asset.rentalAmountPerFraction == null
//       ? null
//       : Number(asset.rentalAmountPerFraction) * Number(fractionsPurchased),
//   durationMonths: asset.durationMonths ?? null,
//   lockInMonths: asset.lockInMonths ?? null,
// });

// const findExistingPurchase = async ({ orderId, paymentId, session = null }) => {
//   let query = PurchaseHistory.findOne({
//     $or: [{ orderId }, { paymentId }],
//   });

//   if (session) query = query.session(session);

//   return query;
// };

// const getUserSnapshot = async (userId, session = null) => {
//   const User = mongoose.model("User");

//   let query = User.findById(userId)
//     .select("name fullName email phone mobile fullPhone")
//     .lean();

//   if (session) query = query.session(session);

//   const user = await query;

//   return {
//     name: user?.name || user?.fullName || null,
//     email: user?.email || null,
//     phone: user?.fullPhone || user?.phone || user?.mobile || null,
//   };
// };

// const sendPurchaseConfirmation = async (purchaseHistoryId) => {
//   const purchase = await PurchaseHistory.findOneAndUpdate(
//     {
//       _id: purchaseHistoryId,
//       paymentStatus: "SUCCESS",
//       $or: [
//         { paymentEmailStatus: "PENDING" },
//         { paymentEmailStatus: { $exists: false } },
//       ],
//     },
//     {
//       $set: {
//         paymentEmailStatus: "SENDING",
//         paymentEmailClaimedAt: new Date(),
//       },
//       $inc: { paymentEmailAttempts: 1 },
//     },
//     { new: true },
//   );

//   if (!purchase) return;

//   try {
//     const userSnapshot = purchase.userSnapshot || {};
//     const assetSnapshot = purchase.assetSnapshot || {};

//     let customerEmail = userSnapshot.email || null;
//     let customerName = userSnapshot.name || null;

//     if (!customerEmail || !customerName) {
//       const user = await getUserSnapshot(purchase.userId);

//       customerEmail = customerEmail || user.email;
//       customerName = customerName || user.name;
//     }

//     if (!customerEmail) {
//       throw new Error("Customer email not found");
//     }

//     customerName = customerName || "Customer";

//     const asset = await Asset.findById(purchase.assetId)
//       .select(
//         "assetName assetCode registeredLegalOwner totalFractions assetCost rentalAmountPerFraction",
//       )
//       .lean();

//     const fractionsPurchased = Number(purchase.fractionsPurchased || 0);

//     const monthlyRentalPerFraction =
//       assetSnapshot.rentalAmountPerFraction ??
//       asset?.rentalAmountPerFraction ??
//       null;

//     const totalFixedMonthlyRental =
//       assetSnapshot.totalMonthlyRental ??
//       (monthlyRentalPerFraction == null
//         ? null
//         : Number(monthlyRentalPerFraction) * fractionsPurchased);

//     const emailDetails = {
//       email: customerEmail,
//       name: customerName,

//       assetName: assetSnapshot.assetName ?? asset?.assetName ?? null,

//       assetCode: assetSnapshot.assetCode ?? asset?.assetCode ?? null,

//       registeredLegalOwner: customerName,

//       totalAssetValue: assetSnapshot.assetCost ?? asset?.assetCost ?? null,

//       totalFractions:
//         assetSnapshot.totalFractions ?? asset?.totalFractions ?? null,

//       amountPerFraction: purchase.amountPerFraction,
//       fractionsPurchased,
//       totalAmountPaid: purchase.totalAmount,
//       acquisitionDate: purchase.paidAt,
//       monthlyRentalPerFraction,
//       totalFixedMonthlyRental,

//       transactionId:
//         purchase.transactionReference || purchase.razorpayPaymentId,
//     };

//     console.log("PAYMENT EMAIL DETAILS:", {
//       purchaseHistoryId: String(purchase._id),
//       assetName: emailDetails.assetName,
//       assetCode: emailDetails.assetCode,
//       registeredLegalOwner: emailDetails.registeredLegalOwner,
//       totalAssetValue: emailDetails.totalAssetValue,
//       totalFractions: emailDetails.totalFractions,
//       amountPerFraction: emailDetails.amountPerFraction,
//       fractionsPurchased: emailDetails.fractionsPurchased,
//       totalAmountPaid: emailDetails.totalAmountPaid,
//       acquisitionDate: emailDetails.acquisitionDate,
//       monthlyRentalPerFraction: emailDetails.monthlyRentalPerFraction,
//       totalFixedMonthlyRental: emailDetails.totalFixedMonthlyRental,
//     });

//     await sendPaymentWelcomeEmail(emailDetails);

//     await PurchaseHistory.updateOne(
//       {
//         _id: purchase._id,
//         paymentEmailStatus: "SENDING",
//       },
//       {
//         $set: {
//           paymentEmailStatus: "SENT",
//           paymentEmailSentAt: new Date(),
//         },
//         $unset: {
//           paymentEmailClaimedAt: "",
//         },
//       },
//     );

//     console.log("PAYMENT SUCCESS EMAIL SENT:", purchase.razorpayPaymentId);
//   } catch (error) {
//     console.error("PAYMENT SUCCESS EMAIL FAILED:", purchaseHistoryId, error);

//     try {
//       await PurchaseHistory.updateOne(
//         {
//           _id: purchase._id,
//           paymentEmailStatus: "SENDING",
//         },
//         {
//           $set: {
//             paymentEmailStatus: "FAILED",
//           },
//           $unset: {
//             paymentEmailClaimedAt: "",
//           },
//         },
//       );
//     } catch (updateError) {
//       console.error("PAYMENT EMAIL STATUS UPDATE FAILED:", updateError);
//     }
//   }
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

//   const payment = await Payment.findOne({ razorpayOrderId });

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
//       await Payment.updateOne({ _id: payment._id }, { $set: paymentUpdate });
//     }

//     if (!existingPurchase.paidAt) {
//       await PurchaseHistory.updateOne(
//         {
//           _id: existingPurchase._id,
//           $or: [{ paidAt: null }, { paidAt: { $exists: false } }],
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
//   let createdPurchase = false;

//   try {
//     await session.withTransaction(async () => {
//       const currentPayment = await Payment.findById(payment._id).session(
//         session,
//       );

//       if (!currentPayment) {
//         throw createError(404, "Payment record not found");
//       }

//       const currentOrder = await Order.findById(order._id).session(session);

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
//           purchaseAlreadyExists.paidAt || currentPayment.paidAt || finalPaidAt;

//         if (!purchaseAlreadyExists.paidAt) {
//           purchaseAlreadyExists.paidAt = existingPaidAt;

//           await purchaseAlreadyExists.save({ session });
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

//         await currentPayment.save({ session });

//         purchaseHistory = purchaseAlreadyExists;
//         createdPurchase = false;

//         return;
//       }

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
//       currentPayment.paidAt = currentPayment.paidAt || finalPaidAt;

//       if (paymentMethod) {
//         currentPayment.paymentMethod = paymentMethod;
//       }

//       if (webhookVerified) {
//         currentPayment.webhookVerified = true;
//         currentPayment.webhookVerifiedAt =
//           currentPayment.webhookVerifiedAt || finalPaidAt;
//       }

//       await currentPayment.save({ session });

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
//           { session },
//         );

//         if (assetUpdate.modifiedCount !== 1) {
//           throw createError(409, "Unable to finalize reserved fractions");
//         }
//       }

//       currentOrder.status = "COMPLETED";

//       await currentOrder.save({ session });

//       const currentAsset = await Asset.findById(currentOrder.assetId).session(
//         session,
//       );

//       if (!currentAsset) {
//         throw createError(404, "Asset not found");
//       }

//       const fractionsPurchased = Number(currentOrder.fractions || 0);

//       const assetSnapshot = buildAssetSnapshot(
//         currentAsset,
//         fractionsPurchased,
//       );

//       const userSnapshot = await getUserSnapshot(currentOrder.userId, session);

//       const purchaseRecords = await PurchaseHistory.create(
//         [
//           {
//             userId: currentOrder.userId,
//             assetId: currentOrder.assetId,
//             orderId: currentOrder._id,
//             paymentId: currentPayment._id,

//             fractionsPurchased,

//             amountPerFraction: Number(
//               currentOrder.amountPerFraction ||
//                 currentAsset.amountPerFraction ||
//                 0,
//             ),

//             totalAmount: Number(
//               currentOrder.totalAmount || currentPayment.amount || 0,
//             ),

//             userSnapshot,
//             assetSnapshot,

//             paymentStatus: "SUCCESS",

//             razorpayOrderId,
//             razorpayPaymentId,

//             razorpaySignature: razorpaySignature || null,

//             paymentMethod:
//               paymentMethod || currentPayment.paymentMethod || null,

//             transactionReference: razorpayPaymentId,

//             paidAt: currentPayment.paidAt || finalPaidAt,

//             paymentEmailStatus: "PENDING",
//             paymentEmailAttempts: 0,
//             paymentEmailSentAt: null,
//             paymentEmailClaimedAt: null,
//           },
//         ],
//         { session },
//       );

//       purchaseHistory = purchaseRecords[0];
//       createdPurchase = true;
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

//     if (createdPurchase) {
//       const confirmationPurchaseId = purchaseHistory._id;

//       setImmediate(() => {
//         void sendPurchaseConfirmation(confirmationPurchaseId).catch((error) => {
//           console.error("PAYMENT EMAIL PROCESSING ERROR:", error);
//         });
//       });
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
// import { sendPaymentWelcomeEmail } from "./paymentWelcomeEmail.service.js";

// // ============================================================
// // HELPERS
// // ============================================================

// const createError = (statusCode, message) => {
//   const error = new Error(message);
//   error.statusCode = statusCode;
//   return error;
// };

// const normalizePaidAt = (paidAt) => {
//   if (paidAt) {
//     const date = new Date(paidAt);

//     if (!Number.isNaN(date.getTime())) {
//       return date;
//     }
//   }

//   return new Date();
// };

// // ============================================================
// // ASSET SNAPSHOT
// // ============================================================

// const buildAssetSnapshot = (asset, fractionsPurchased) => ({
//   assetName: asset.assetName ?? null,
//   assetCode: asset.assetCode ?? null,
//   specification: asset.specification ?? null,
//   assetCost: asset.assetCost ?? null,
//   registeredLegalOwner: asset.registeredLegalOwner ?? null,
//   totalFractions: asset.totalFractions ?? null,
//   amountPerFraction: asset.amountPerFraction ?? null,
//   rentalAmountPerFraction: asset.rentalAmountPerFraction ?? null,

//   totalMonthlyRental:
//     asset.rentalAmountPerFraction == null
//       ? null
//       : Number(asset.rentalAmountPerFraction) *
//         Number(fractionsPurchased),

//   durationMonths: asset.durationMonths ?? null,
//   lockInMonths: asset.lockInMonths ?? null,
// });

// // ============================================================
// // FIND EXISTING PURCHASE
// // ============================================================

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

// // ============================================================
// // USER SNAPSHOT
// // ============================================================

// const getUserSnapshot = async (userId, session = null) => {
//   const User = mongoose.model("User");

//   let query = User.findById(userId)
//     .select("name fullName email phone mobile fullPhone")
//     .lean();

//   if (session) {
//     query = query.session(session);
//   }

//   const user = await query;

//   return {
//     name: user?.name || user?.fullName || null,
//     email: user?.email || null,
//     phone:
//       user?.fullPhone ||
//       user?.phone ||
//       user?.mobile ||
//       null,
//   };
// };

// // ============================================================
// // PAYMENT CONFIRMATION EMAIL
// // ============================================================

// const sendPurchaseConfirmation = async (purchaseHistoryId) => {
//   const purchase = await PurchaseHistory.findOneAndUpdate(
//     {
//       _id: purchaseHistoryId,

//       paymentStatus: "SUCCESS",

//       $or: [
//         { paymentEmailStatus: "PENDING" },
//         { paymentEmailStatus: { $exists: false } },
//       ],
//     },
//     {
//       $set: {
//         paymentEmailStatus: "SENDING",
//         paymentEmailClaimedAt: new Date(),
//       },

//       $inc: {
//         paymentEmailAttempts: 1,
//       },
//     },
//     {
//       new: true,
//     },
//   );

//   if (!purchase) return;

//   try {
//     const userSnapshot = purchase.userSnapshot || {};
//     const assetSnapshot = purchase.assetSnapshot || {};

//     let customerEmail = userSnapshot.email || null;
//     let customerName = userSnapshot.name || null;

//     if (!customerEmail || !customerName) {
//       const user = await getUserSnapshot(purchase.userId);

//       customerEmail = customerEmail || user.email;
//       customerName = customerName || user.name;
//     }

//     if (!customerEmail) {
//       throw new Error("Customer email not found");
//     }

//     customerName = customerName || "Customer";

//     const asset = await Asset.findById(purchase.assetId)
//       .select(
//         "assetName assetCode registeredLegalOwner totalFractions assetCost rentalAmountPerFraction",
//       )
//       .lean();

//     const fractionsPurchased = Number(
//       purchase.fractionsPurchased || 0,
//     );

//     const monthlyRentalPerFraction =
//       assetSnapshot.rentalAmountPerFraction ??
//       asset?.rentalAmountPerFraction ??
//       null;

//     const totalFixedMonthlyRental =
//       assetSnapshot.totalMonthlyRental ??
//       (monthlyRentalPerFraction == null
//         ? null
//         : Number(monthlyRentalPerFraction) *
//           fractionsPurchased);

//     // ========================================================
//     // COMMON EMAIL DETAILS - RAZORPAY + CASHFREE
//     // ========================================================

//     const emailDetails = {
//       email: customerEmail,

//       name: customerName,

//       assetName:
//         assetSnapshot.assetName ??
//         asset?.assetName ??
//         null,

//       assetCode:
//         assetSnapshot.assetCode ??
//         asset?.assetCode ??
//         null,

//       registeredLegalOwner: customerName,

//       totalAssetValue:
//         assetSnapshot.assetCost ??
//         asset?.assetCost ??
//         null,

//       totalFractions:
//         assetSnapshot.totalFractions ??
//         asset?.totalFractions ??
//         null,

//       amountPerFraction: purchase.amountPerFraction,

//       fractionsPurchased,

//       totalAmountPaid: purchase.totalAmount,

//       acquisitionDate: purchase.paidAt,

//       monthlyRentalPerFraction,

//       totalFixedMonthlyRental,

//       transactionId:
//         purchase.transactionReference ||
//         purchase.cashfreePaymentId ||
//         purchase.razorpayPaymentId,
//     };

//     console.log("PAYMENT EMAIL DETAILS:", {
//       purchaseHistoryId: String(purchase._id),
//       assetName: emailDetails.assetName,
//       assetCode: emailDetails.assetCode,
//       registeredLegalOwner: emailDetails.registeredLegalOwner,
//       totalAssetValue: emailDetails.totalAssetValue,
//       totalFractions: emailDetails.totalFractions,
//       amountPerFraction: emailDetails.amountPerFraction,
//       fractionsPurchased: emailDetails.fractionsPurchased,
//       totalAmountPaid: emailDetails.totalAmountPaid,
//       acquisitionDate: emailDetails.acquisitionDate,
//       monthlyRentalPerFraction:
//         emailDetails.monthlyRentalPerFraction,
//       totalFixedMonthlyRental:
//         emailDetails.totalFixedMonthlyRental,
//     });

//     await sendPaymentWelcomeEmail(emailDetails);

//     await PurchaseHistory.updateOne(
//       {
//         _id: purchase._id,
//         paymentEmailStatus: "SENDING",
//       },
//       {
//         $set: {
//           paymentEmailStatus: "SENT",
//           paymentEmailSentAt: new Date(),
//         },

//         $unset: {
//           paymentEmailClaimedAt: "",
//         },
//       },
//     );

//     console.log(
//       "PAYMENT SUCCESS EMAIL SENT:",
//       purchase.transactionReference,
//     );
//   } catch (error) {
//     console.error(
//       "PAYMENT SUCCESS EMAIL FAILED:",
//       purchaseHistoryId,
//       error,
//     );

//     try {
//       await PurchaseHistory.updateOne(
//         {
//           _id: purchase._id,
//           paymentEmailStatus: "SENDING",
//         },
//         {
//           $set: {
//             paymentEmailStatus: "FAILED",
//           },

//           $unset: {
//             paymentEmailClaimedAt: "",
//           },
//         },
//       );
//     } catch (updateError) {
//       console.error(
//         "PAYMENT EMAIL STATUS UPDATE FAILED:",
//         updateError,
//       );
//     }
//   }
// };

// // ============================================================
// // FINALIZE SUCCESSFUL PAYMENT
// // SUPPORTS RAZORPAY + CASHFREE
// //
// // IMPORTANT:
// // Caller must verify gateway payment status,
// // amount, currency and order ownership first.
// // ============================================================

// export const finalizeSuccessfulPayment = async ({
//   paymentGateway = "RAZORPAY",

//   // RAZORPAY
//   razorpayOrderId = null,
//   razorpayPaymentId = null,
//   razorpaySignature = null,

//   // CASHFREE
//   cashfreeOrderId = null,
//   cashfreePaymentId = null,

//   // COMMON
//   paymentMethod = null,
//   webhookVerified = false,
//   paidAt = null,
// }) => {
//   // ========================================================
//   // 1. VALIDATION
//   // ========================================================

//   if (
//     !["RAZORPAY", "CASHFREE"].includes(paymentGateway)
//   ) {
//     throw createError(400, "Invalid payment gateway");
//   }

//   if (paymentGateway === "RAZORPAY") {
//     if (!razorpayOrderId) {
//       throw createError(
//         400,
//         "Razorpay order ID is required",
//       );
//     }

//     if (!razorpayPaymentId) {
//       throw createError(
//         400,
//         "Razorpay payment ID is required",
//       );
//     }
//   }

//   if (paymentGateway === "CASHFREE") {
//     if (!cashfreeOrderId) {
//       throw createError(
//         400,
//         "Cashfree order ID is required",
//       );
//     }

//     if (!cashfreePaymentId) {
//       throw createError(
//         400,
//         "Cashfree payment ID is required",
//       );
//     }
//   }

//   const finalPaidAt = normalizePaidAt(paidAt);

//   // ========================================================
//   // 2. FIND PAYMENT
//   // ========================================================

//   const paymentQuery =
//     paymentGateway === "CASHFREE"
//       ? {
//           paymentGateway: "CASHFREE",
//           cashfreeOrderId,
//         }
//       : {
//           razorpayOrderId,
//         };

//   const payment = await Payment.findOne(paymentQuery);

//   if (!payment) {
//     throw createError(
//       404,
//       "Payment record not found",
//     );
//   }

//   // ========================================================
//   // 3. VERIFY GATEWAY MATCH
//   // ========================================================

//   if (
//     (payment.paymentGateway || "RAZORPAY") !==
//     paymentGateway
//   ) {
//     throw createError(
//       409,
//       "Payment gateway mismatch",
//     );
//   }

//   // ========================================================
//   // 4. CHECK EXISTING TRANSACTION
//   // ========================================================

//   const gatewayPaymentId =
//     paymentGateway === "CASHFREE"
//       ? String(cashfreePaymentId)
//       : String(razorpayPaymentId);

//   const existingGatewayPaymentId =
//     paymentGateway === "CASHFREE"
//       ? payment.cashfreePaymentId
//       : payment.razorpayPaymentId;

//   if (
//     payment.status === "SUCCESS" &&
//     existingGatewayPaymentId &&
//     String(existingGatewayPaymentId) !== gatewayPaymentId
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

//   if (
//     (order.paymentGateway || "RAZORPAY") !==
//     paymentGateway
//   ) {
//     throw createError(
//       409,
//       "Order payment gateway mismatch",
//     );
//   }

//   // ========================================================
//   // 6. FIND ASSET
//   // ========================================================

//   const asset = await Asset.findById(order.assetId);

//   if (!asset) {
//     throw createError(404, "Asset not found");
//   }

//   // ========================================================
//   // 7. CHECK EXISTING PURCHASE
//   // ========================================================

//   const existingPurchase = await findExistingPurchase({
//     orderId: order._id,
//     paymentId: payment._id,
//   });

//   if (
//     payment.status === "SUCCESS" &&
//     existingPurchase
//   ) {
//     const existingPaidAt =
//       existingPurchase.paidAt ||
//       payment.paidAt ||
//       finalPaidAt;

//     const paymentUpdate = {};

//     if (!payment.paidAt) {
//       paymentUpdate.paidAt = existingPaidAt;
//     }

//     if (paymentGateway === "RAZORPAY") {
//       if (!payment.razorpayPaymentId) {
//         paymentUpdate.razorpayPaymentId =
//           razorpayPaymentId;
//       }

//       if (
//         razorpaySignature &&
//         !payment.razorpaySignature
//       ) {
//         paymentUpdate.razorpaySignature =
//           razorpaySignature;
//       }
//     } else {
//       if (!payment.cashfreePaymentId) {
//         paymentUpdate.cashfreePaymentId =
//           String(cashfreePaymentId);
//       }
//     }

//     if (
//       paymentMethod &&
//       !payment.paymentMethod
//     ) {
//       paymentUpdate.paymentMethod =
//         paymentMethod;
//     }

//     if (
//       webhookVerified &&
//       !payment.webhookVerified
//     ) {
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
//             { paidAt: null },
//             { paidAt: { $exists: false } },
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

//   // ========================================================
//   // 8. EXPIRED ORDER CHECK
//   // ========================================================

//   if (order.status === "EXPIRED") {
//     throw createError(
//       409,
//       "Order has expired. Successful payment requires manual reconciliation",
//     );
//   }

//   // ========================================================
//   // 9. START TRANSACTION
//   // ========================================================

//   const session = await mongoose.startSession();

//   let purchaseHistory = null;
//   let createdPurchase = false;

//   try {
//     await session.withTransaction(async () => {
//       const currentPayment =
//         await Payment.findById(
//           payment._id,
//         ).session(session);

//       if (!currentPayment) {
//         throw createError(
//           404,
//           "Payment record not found",
//         );
//       }

//       const currentOrder =
//         await Order.findById(
//           order._id,
//         ).session(session);

//       if (!currentOrder) {
//         throw createError(
//           404,
//           "Order not found",
//         );
//       }

//       // ====================================================
//       // CHECK EXISTING PURCHASE INSIDE TRANSACTION
//       // ====================================================

//       const purchaseAlreadyExists =
//         await findExistingPurchase({
//           orderId: currentOrder._id,
//           paymentId: currentPayment._id,
//           session,
//         });

//       if (purchaseAlreadyExists) {
//         const existingPaidAt =
//           purchaseAlreadyExists.paidAt ||
//           currentPayment.paidAt ||
//           finalPaidAt;

//         if (!purchaseAlreadyExists.paidAt) {
//           purchaseAlreadyExists.paidAt =
//             existingPaidAt;

//           await purchaseAlreadyExists.save({
//             session,
//           });
//         }

//         currentPayment.status = "SUCCESS";

//         if (paymentGateway === "RAZORPAY") {
//           currentPayment.razorpayPaymentId =
//             razorpayPaymentId;

//           if (razorpaySignature) {
//             currentPayment.razorpaySignature =
//               razorpaySignature;
//           }
//         } else {
//           currentPayment.cashfreePaymentId =
//             String(cashfreePaymentId);
//         }

//         if (paymentMethod) {
//           currentPayment.paymentMethod =
//             paymentMethod;
//         }

//         if (!currentPayment.paidAt) {
//           currentPayment.paidAt =
//             existingPaidAt;
//         }

//         if (webhookVerified) {
//           currentPayment.webhookVerified = true;

//           currentPayment.webhookVerifiedAt =
//             currentPayment.webhookVerifiedAt ||
//             finalPaidAt;
//         }

//         await currentPayment.save({
//           session,
//         });

//         purchaseHistory = purchaseAlreadyExists;
//         createdPurchase = false;

//         return;
//       }

//       // ====================================================
//       // EXPIRED ORDER CHECK
//       // ====================================================

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

//       // ====================================================
//       // ALLOCATE FRACTIONS
//       // ====================================================

//       await allocateFractions({
//         assetId: currentOrder.assetId,

//         userId: currentOrder.userId,

//         fractions: currentOrder.fractions,

//         razorpayOrderId:
//           paymentGateway === "RAZORPAY"
//             ? razorpayOrderId
//             : null,

//         razorpayPaymentId:
//           paymentGateway === "RAZORPAY"
//             ? razorpayPaymentId
//             : null,

//         session,
//       });

//       // ====================================================
//       // UPDATE PAYMENT
//       // ====================================================

//       if (paymentGateway === "RAZORPAY") {
//         currentPayment.razorpayPaymentId =
//           razorpayPaymentId;

//         if (razorpaySignature) {
//           currentPayment.razorpaySignature =
//             razorpaySignature;
//         }
//       } else {
//         currentPayment.cashfreePaymentId =
//           String(cashfreePaymentId);
//       }

//       currentPayment.status = "SUCCESS";

//       currentPayment.paidAt =
//         currentPayment.paidAt ||
//         finalPaidAt;

//       if (paymentMethod) {
//         currentPayment.paymentMethod =
//           paymentMethod;
//       }

//       if (webhookVerified) {
//         currentPayment.webhookVerified = true;

//         currentPayment.webhookVerifiedAt =
//           currentPayment.webhookVerifiedAt ||
//           finalPaidAt;
//       }

//       await currentPayment.save({
//         session,
//       });

//       // ====================================================
//       // UPDATE RESERVED FRACTIONS
//       // ====================================================

//       if (
//         currentOrder.status === "PENDING_PAYMENT"
//       ) {
//         const assetUpdate =
//           await Asset.updateOne(
//             {
//               _id: currentOrder.assetId,

//               reservedFractions: {
//                 $gte: currentOrder.fractions,
//               },
//             },
//             {
//               $inc: {
//                 reservedFractions: -Number(
//                   currentOrder.fractions,
//                 ),
//               },
//             },
//             {
//               session,
//             },
//           );

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

//       // ====================================================
//       // CURRENT ASSET
//       // ====================================================

//       const currentAsset =
//         await Asset.findById(
//           currentOrder.assetId,
//         ).session(session);

//       if (!currentAsset) {
//         throw createError(
//           404,
//           "Asset not found",
//         );
//       }

//       const fractionsPurchased = Number(
//         currentOrder.fractions || 0,
//       );

//       const assetSnapshot =
//         buildAssetSnapshot(
//           currentAsset,
//           fractionsPurchased,
//         );

//       const userSnapshot =
//         await getUserSnapshot(
//           currentOrder.userId,
//           session,
//         );

//       // ====================================================
//       // CREATE PURCHASE HISTORY
//       // ====================================================

//       const purchaseRecords =
//         await PurchaseHistory.create(
//           [
//             {
//               userId: currentOrder.userId,

//               assetId: currentOrder.assetId,

//               orderId: currentOrder._id,

//               paymentId: currentPayment._id,

//               paymentGateway,

//               fractionsPurchased,

//               amountPerFraction: Number(
//                 currentOrder.amountPerFraction ||
//                   currentAsset.amountPerFraction ||
//                   0,
//               ),

//               totalAmount: Number(
//                 currentOrder.totalAmount ||
//                   currentPayment.amount ||
//                   0,
//               ),

//               userSnapshot,

//               assetSnapshot,

//               paymentStatus: "SUCCESS",

//               // ==================================
//               // RAZORPAY DETAILS
//               // ==================================

//               razorpayOrderId:
//                 paymentGateway === "RAZORPAY"
//                   ? razorpayOrderId
//                   : null,

//               razorpayPaymentId:
//                 paymentGateway === "RAZORPAY"
//                   ? razorpayPaymentId
//                   : null,

//               razorpaySignature:
//                 paymentGateway === "RAZORPAY"
//                   ? razorpaySignature || null
//                   : null,

//               // ==================================
//               // CASHFREE DETAILS
//               // ==================================

//               cashfreeOrderId:
//                 paymentGateway === "CASHFREE"
//                   ? cashfreeOrderId
//                   : null,

//               cashfreeCfOrderId:
//                 paymentGateway === "CASHFREE"
//                   ? currentPayment.cashfreeCfOrderId
//                   : null,

//               cashfreePaymentId:
//                 paymentGateway === "CASHFREE"
//                   ? String(cashfreePaymentId)
//                   : null,

//               // ==================================
//               // COMMON PAYMENT DETAILS
//               // ==================================

//               paymentMethod:
//                 paymentMethod ||
//                 currentPayment.paymentMethod ||
//                 null,

//               transactionReference:
//                 paymentGateway === "CASHFREE"
//                   ? String(cashfreePaymentId)
//                   : razorpayPaymentId,

//               paidAt:
//                 currentPayment.paidAt ||
//                 finalPaidAt,

//               paymentEmailStatus: "PENDING",

//               paymentEmailAttempts: 0,

//               paymentEmailSentAt: null,

//               paymentEmailClaimedAt: null,
//             },
//           ],
//           {
//             session,
//           },
//         );

//       purchaseHistory = purchaseRecords[0];

//       createdPurchase = true;
//     });

//     // ========================================================
//     // FIND PURCHASE AFTER TRANSACTION
//     // ========================================================

//     if (!purchaseHistory) {
//       purchaseHistory =
//         await findExistingPurchase({
//           orderId: order._id,

//           paymentId: payment._id,
//         });
//     }

//     if (!purchaseHistory) {
//       throw createError(
//         500,
//         "Payment completed but purchase history could not be created",
//       );
//     }

//     // ========================================================
//     // SEND PAYMENT CONFIRMATION EMAIL
//     // ========================================================

//     if (createdPurchase) {
//       const confirmationPurchaseId =
//         purchaseHistory._id;

//       setImmediate(() => {
//         void sendPurchaseConfirmation(
//           confirmationPurchaseId,
//         ).catch((error) => {
//           console.error(
//             "PAYMENT EMAIL PROCESSING ERROR:",
//             error,
//           );
//         });
//       });
//     }

//     // ========================================================
//     // RESPONSE
//     // ========================================================

//     return {
//       success: true,

//       alreadyProcessed: !createdPurchase,

//       purchaseHistoryId: purchaseHistory._id,

//       paymentId: payment._id,

//       orderId: order._id,

//       paidAt:
//         purchaseHistory.paidAt ||
//         finalPaidAt,
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

// import mongoose from "mongoose";

// import Order from "../model/OrderModel.js";
// import Payment from "../model/PaymentModel.js";
// import Asset from "../model/coAssetModel.js";
// import PurchaseHistory from "../model/purchaseHistoryModel.js";

// import { allocateFractions } from "./ownerShipService.js";
// import { sendPaymentWelcomeEmail } from "./paymentWelcomeEmail.service.js";
// import {
//   getExpectedPaymentAmount,
// } from "../utils/payment_charges.js";

// // ============================================================
// // HELPERS
// // ============================================================

// const createError = (statusCode, message) => {
//   const error = new Error(message);
//   error.statusCode = statusCode;
//   return error;
// };

// const normalizePaidAt = (paidAt) => {
//   if (paidAt) {
//     const date = new Date(paidAt);

//     if (!Number.isNaN(date.getTime())) {
//       return date;
//     }
//   }

//   return new Date();
// };

// // ============================================================
// // ASSET SNAPSHOT
// // ============================================================

// const buildAssetSnapshot = (asset, fractionsPurchased) => ({
//   assetName: asset.assetName ?? null,
//   assetCode: asset.assetCode ?? null,
//   specification: asset.specification ?? null,
//   assetCost: asset.assetCost ?? null,
//   registeredLegalOwner: asset.registeredLegalOwner ?? null,
//   totalFractions: asset.totalFractions ?? null,
//   amountPerFraction: asset.amountPerFraction ?? null,
//   rentalAmountPerFraction: asset.rentalAmountPerFraction ?? null,

//   totalMonthlyRental:
//     asset.rentalAmountPerFraction == null
//       ? null
//       : Number(asset.rentalAmountPerFraction) * Number(fractionsPurchased),

//   durationMonths: asset.durationMonths ?? null,
//   lockInMonths: asset.lockInMonths ?? null,
// });

// // ============================================================
// // FIND EXISTING PURCHASE
// // ============================================================

// const findExistingPurchase = async ({ orderId, paymentId, session = null }) => {
//   let query = PurchaseHistory.findOne({
//     $or: [{ orderId }, { paymentId }],
//   });

//   if (session) {
//     query = query.session(session);
//   }

//   return query;
// };

// // ============================================================
// // USER SNAPSHOT
// // ============================================================

// const getUserSnapshot = async (userId, session = null) => {
//   const User = mongoose.model("User");

//   let query = User.findById(userId)
//     .select("name fullName email phone mobile fullPhone")
//     .lean();

//   if (session) {
//     query = query.session(session);
//   }

//   const user = await query;

//   return {
//     name: user?.name || user?.fullName || null,
//     email: user?.email || null,
//     phone: user?.fullPhone || user?.phone || user?.mobile || null,
//   };
// };

// // ============================================================
// // PAYMENT CONFIRMATION EMAIL
// // ============================================================

// const sendPurchaseConfirmation = async (purchaseHistoryId) => {
//   const purchase = await PurchaseHistory.findOneAndUpdate(
//     {
//       _id: purchaseHistoryId,

//       paymentStatus: "SUCCESS",

//       $or: [
//         { paymentEmailStatus: "PENDING" },
//         { paymentEmailStatus: { $exists: false } },
//       ],
//     },
//     {
//       $set: {
//         paymentEmailStatus: "SENDING",
//         paymentEmailClaimedAt: new Date(),
//       },

//       $inc: {
//         paymentEmailAttempts: 1,
//       },
//     },
//     {
//       new: true,
//     },
//   );

//   if (!purchase) return;

//   try {
//     const userSnapshot = purchase.userSnapshot || {};
//     const assetSnapshot = purchase.assetSnapshot || {};

//     let customerEmail = userSnapshot.email || null;
//     let customerName = userSnapshot.name || null;

//     if (!customerEmail || !customerName) {
//       const user = await getUserSnapshot(purchase.userId);

//       customerEmail = customerEmail || user.email;
//       customerName = customerName || user.name;
//     }

//     if (!customerEmail) {
//       throw new Error("Customer email not found");
//     }

//     customerName = customerName || "Customer";

//     const asset = await Asset.findById(purchase.assetId)
//       .select(
//         "assetName assetCode registeredLegalOwner totalFractions assetCost rentalAmountPerFraction",
//       )
//       .lean();

//     const fractionsPurchased = Number(purchase.fractionsPurchased || 0);

//     const monthlyRentalPerFraction =
//       assetSnapshot.rentalAmountPerFraction ??
//       asset?.rentalAmountPerFraction ??
//       null;

//     const totalFixedMonthlyRental =
//       assetSnapshot.totalMonthlyRental ??
//       (monthlyRentalPerFraction == null
//         ? null
//         : Number(monthlyRentalPerFraction) * fractionsPurchased);

//     // ========================================================
//     // COMMON EMAIL DETAILS - ALL GATEWAYS
//     // ========================================================

//     const emailDetails = {
//       email: customerEmail,

//       name: customerName,

//       assetName: assetSnapshot.assetName ?? asset?.assetName ?? null,

//       assetCode: assetSnapshot.assetCode ?? asset?.assetCode ?? null,

//       registeredLegalOwner: customerName,

//       totalAssetValue: assetSnapshot.assetCost ?? asset?.assetCost ?? null,

//       totalFractions:
//         assetSnapshot.totalFractions ?? asset?.totalFractions ?? null,

//       amountPerFraction: purchase.amountPerFraction,

//       fractionsPurchased,

//       totalAmountPaid: purchase.totalAmount,

//       acquisitionDate: purchase.paidAt,

//       monthlyRentalPerFraction,

//       totalFixedMonthlyRental,

//       transactionId:
//         purchase.transactionReference ||
//         purchase.cashfreePaymentId ||
//         purchase.razorpayPaymentId,
//     };

//     console.log("PAYMENT EMAIL DETAILS:", {
//       purchaseHistoryId: String(purchase._id),
//       assetName: emailDetails.assetName,
//       assetCode: emailDetails.assetCode,
//       registeredLegalOwner: emailDetails.registeredLegalOwner,
//       totalAssetValue: emailDetails.totalAssetValue,
//       totalFractions: emailDetails.totalFractions,
//       amountPerFraction: emailDetails.amountPerFraction,
//       fractionsPurchased: emailDetails.fractionsPurchased,
//       totalAmountPaid: emailDetails.totalAmountPaid,
//       acquisitionDate: emailDetails.acquisitionDate,
//       monthlyRentalPerFraction: emailDetails.monthlyRentalPerFraction,
//       totalFixedMonthlyRental,
//     });

//     await sendPaymentWelcomeEmail(emailDetails);

//     await PurchaseHistory.updateOne(
//       {
//         _id: purchase._id,
//         paymentEmailStatus: "SENDING",
//       },
//       {
//         $set: {
//           paymentEmailStatus: "SENT",
//           paymentEmailSentAt: new Date(),
//         },

//         $unset: {
//           paymentEmailClaimedAt: "",
//         },
//       },
//     );

//     console.log("PAYMENT SUCCESS EMAIL SENT:", purchase.transactionReference);
//   } catch (error) {
//     console.error("PAYMENT SUCCESS EMAIL FAILED:", purchaseHistoryId, error);

//     try {
//       await PurchaseHistory.updateOne(
//         {
//           _id: purchase._id,
//           paymentEmailStatus: "SENDING",
//         },
//         {
//           $set: {
//             paymentEmailStatus: "FAILED",
//           },

//           $unset: {
//             paymentEmailClaimedAt: "",
//           },
//         },
//       );
//     } catch (updateError) {
//       console.error("PAYMENT EMAIL STATUS UPDATE FAILED:", updateError);
//     }
//   }
// };

// // ============================================================
// // FINALIZE SUCCESSFUL PAYMENT
// // RAZORPAY + CASHFREE + PAYU
// //
// // IMPORTANT:
// // Call ONLY after independent gateway verification
// // of success, amount, currency and transaction ID.
// // ============================================================

// export const finalizeSuccessfulPayment = async ({
//   paymentGateway = "RAZORPAY",

//   // ==========================================
//   // RAZORPAY
//   // ==========================================

//   razorpayOrderId = null,
//   razorpayPaymentId = null,
//   razorpaySignature = null,

//   // ==========================================
//   // CASHFREE
//   // ==========================================

//   cashfreeOrderId = null,
//   cashfreePaymentId = null,

//   // ==========================================
//   // PAYU
//   // ==========================================

//   payuTxnId = null,
//   payuMihpayId = null,

//   // ==========================================
//   // COMMON
//   // ==========================================

//   paymentMethod = null,
//   webhookVerified = false,
//   paidAt = null,
// }) => {
//   // ========================================================
//   // 1. VALIDATION
//   // ========================================================

//   const allowedGateways = ["RAZORPAY", "CASHFREE", "PAYU"];

//   if (!allowedGateways.includes(paymentGateway)) {
//     throw createError(400, "Invalid payment gateway");
//   }

//   if (paymentGateway === "RAZORPAY") {
//     if (!razorpayOrderId || !razorpayPaymentId) {
//       throw createError(400, "Razorpay order ID and payment ID are required");
//     }
//   }

//   if (paymentGateway === "CASHFREE") {
//     if (!cashfreeOrderId || !cashfreePaymentId) {
//       throw createError(400, "Cashfree order ID and payment ID are required");
//     }
//   }

//   if (paymentGateway === "PAYU") {
//     if (!payuTxnId || !payuMihpayId) {
//       throw createError(400, "PayU transaction ID and mihpayid are required");
//     }
//   }

//   const finalPaidAt = normalizePaidAt(paidAt);

//   // ========================================================
//   // 2. FIND PAYMENT
//   // ========================================================

//   const paymentQuery =
//     paymentGateway === "RAZORPAY"
//       ? {
//           razorpayOrderId,
//           paymentGateway: "RAZORPAY",
//         }
//       : paymentGateway === "CASHFREE"
//         ? {
//             cashfreeOrderId,
//             paymentGateway: "CASHFREE",
//           }
//         : {
//             payuTxnId,
//             paymentGateway: "PAYU",
//           };

//   const gatewayPaymentId = String(
//     paymentGateway === "RAZORPAY"
//       ? razorpayPaymentId
//       : paymentGateway === "CASHFREE"
//         ? cashfreePaymentId
//         : payuMihpayId,
//   );

//   const paymentIdField =
//     paymentGateway === "RAZORPAY"
//       ? "razorpayPaymentId"
//       : paymentGateway === "CASHFREE"
//         ? "cashfreePaymentId"
//         : "payuMihpayId";

//   const payment = await Payment.findOne(paymentQuery);

//   if (!payment) {
//     throw createError(404, "Payment record not found");
//   }

//   // ========================================================
//   // 3. FIND ORDER
//   // ========================================================

//   const order = await Order.findById(payment.orderId);

//   if (!order) {
//     throw createError(404, "Order not found");
//   }

//   if (order.paymentGateway !== paymentGateway) {
//     throw createError(409, "Order payment gateway mismatch");
//   }

//   if (String(order.userId) !== String(payment.userId)) {
//     throw createError(409, "Order and payment customer mismatch");
//   }

//   if (
//     paymentGateway === "PAYU" &&
//     String(order.payuTxnId) !== String(payuTxnId)
//   ) {
//     throw createError(409, "PayU transaction does not match order");
//   }

//   // ========================================================
//   // 4. VERIFY STORED PAYMENT AMOUNT
//   // ========================================================

//   const orderAmount = Math.round(Number(order.totalAmount) * 100);

//   const paymentAmount = Math.round(Number(payment.amount) * 100);

//   if (orderAmount !== paymentAmount) {
//     throw createError(409, "Stored order and payment amount mismatch");
//   }

//   if (String(payment.currency || "INR").toUpperCase() !== "INR") {
//     throw createError(409, "Unexpected payment currency");
//   }

//   // ========================================================
//   // 5. PREVENT DUPLICATE GATEWAY PAYMENT REFERENCE
//   // ========================================================

//   const reusedPayment = await Payment.findOne({
//     _id: { $ne: payment._id },
//     [paymentIdField]: gatewayPaymentId,
//   });

//   if (reusedPayment) {
//     throw createError(409, "Gateway payment reference already used");
//   }

//   if (
//     payment[paymentIdField] &&
//     String(payment[paymentIdField]) !== gatewayPaymentId
//   ) {
//     throw createError(
//       409,
//       "Order already associated with a different gateway payment",
//     );
//   }

//   // ========================================================
//   // 6. START DATABASE TRANSACTION
//   // ========================================================

//   let purchaseHistory = null;
//   let createdPurchase = false;

//   const session = await mongoose.startSession();

//   try {
//     await session.withTransaction(async () => {
//       const currentPayment = await Payment.findById(payment._id).session(
//         session,
//       );

//       const currentOrder = await Order.findById(order._id).session(session);

//       if (!currentPayment || !currentOrder) {
//         throw createError(404, "Order or payment record not found");
//       }

//       // ====================================================
//       // VERIFY GATEWAY MATCH
//       // ====================================================

//       if (
//         currentPayment.paymentGateway !== paymentGateway ||
//         currentOrder.paymentGateway !== paymentGateway
//       ) {
//         throw createError(409, "Gateway mismatch during finalization");
//       }

//       if (
//         currentPayment[paymentIdField] &&
//         String(currentPayment[paymentIdField]) !== gatewayPaymentId
//       ) {
//         throw createError(409, "Gateway payment reference mismatch");
//       }

//       // ====================================================
//       // CHECK EXISTING PURCHASE INSIDE TRANSACTION
//       // ====================================================

//       const existing = await findExistingPurchase({
//         orderId: currentOrder._id,
//         paymentId: currentPayment._id,
//         session,
//       });

//       if (existing) {
//         if (currentOrder.status !== "COMPLETED") {
//           throw createError(
//             409,
//             "Purchase exists but order is not completed; reconciliation required",
//           );
//         }

//         if (
//           String(existing.orderId) !== String(currentOrder._id) ||
//           String(existing.paymentId) !== String(currentPayment._id)
//         ) {
//           throw createError(
//             409,
//             "Existing purchase belongs to another order/payment",
//           );
//         }

//         if (
//           existing.transactionReference &&
//           String(existing.transactionReference) !== gatewayPaymentId
//         ) {
//           throw createError(
//             409,
//             "Existing purchase has a different transaction reference",
//           );
//         }

//         // ==============================================
//         // ALREADY PROCESSED PAYMENT
//         // ==============================================

//         currentPayment[paymentIdField] = gatewayPaymentId;

//         if (paymentGateway === "RAZORPAY" && razorpaySignature) {
//           currentPayment.razorpaySignature = razorpaySignature;
//         }

//         currentPayment.status = "SUCCESS";

//         currentPayment.paidAt ||= existing.paidAt || finalPaidAt;

//         if (paymentMethod && !currentPayment.paymentMethod) {
//           currentPayment.paymentMethod = paymentMethod;
//         }

//         if (webhookVerified) {
//           currentPayment.webhookVerified = true;
//         }

//         await currentPayment.save({ session });

//         if (!existing.paidAt) {
//           existing.paidAt = currentPayment.paidAt;

//           await existing.save({ session });
//         }

//         purchaseHistory = existing;
//         createdPurchase = false;

//         return;
//       }

//       // ====================================================
//       // CHECK EXISTING STATUS
//       // ====================================================

//       if (
//         currentPayment.status === "SUCCESS" ||
//         currentOrder.status === "COMPLETED"
//       ) {
//         throw createError(
//           409,
//           "Payment/order marked complete without purchase; manual reconciliation required",
//         );
//       }

//       if (
//         currentOrder.status !== "PENDING_PAYMENT" ||
//         currentPayment.status !== "PENDING"
//       ) {
//         throw createError(
//           409,
//           "Order or payment is no longer pending; manual reconciliation required",
//         );
//       }

//       // ====================================================
//       // ORDER EXPIRATION
//       // ====================================================

//       if (new Date(currentOrder.expiresAt).getTime() <= Date.now()) {
//         throw createError(
//           409,
//           "Order reservation expired; payment requires manual reconciliation",
//         );
//       }

//       // ====================================================
//       // 7. ALLOCATE OWNERSHIP FRACTIONS
//       // ====================================================

//       await allocateFractions({
//         assetId: currentOrder.assetId,

//         userId: currentOrder.userId,

//         fractions: currentOrder.fractions,

//         razorpayOrderId: paymentGateway === "RAZORPAY" ? razorpayOrderId : null,

//         razorpayPaymentId:
//           paymentGateway === "RAZORPAY" ? razorpayPaymentId : null,

//         session,
//       });

//       // ====================================================
//       // 8. UPDATE RESERVED FRACTIONS
//       // ====================================================

//       const assetUpdate = await Asset.updateOne(
//         {
//           _id: currentOrder.assetId,

//           reservedFractions: {
//             $gte: currentOrder.fractions,
//           },
//         },
//         {
//           $inc: {
//             reservedFractions: -Number(currentOrder.fractions),
//           },
//         },
//         {
//           session,
//         },
//       );

//       if (assetUpdate.modifiedCount !== 1) {
//         throw createError(409, "Unable to finalize reserved fractions");
//       }

//       // ====================================================
//       // 9. UPDATE PAYMENT DETAILS
//       // ====================================================

//       currentPayment[paymentIdField] = gatewayPaymentId;

//       if (paymentGateway === "RAZORPAY" && razorpaySignature) {
//         currentPayment.razorpaySignature = razorpaySignature;
//       }

//       currentPayment.status = "SUCCESS";

//       if (!currentPayment.paidAt) {
//         currentPayment.paidAt = finalPaidAt;
//       }

//       if (paymentMethod) {
//         currentPayment.paymentMethod = paymentMethod;
//       }

//       if (webhookVerified) {
//         currentPayment.webhookVerified = true;
//       }

//       await currentPayment.save({ session });

//       // ====================================================
//       // 10. UPDATE ORDER STATUS
//       // ====================================================

//       currentOrder.status = "COMPLETED";

//       await currentOrder.save({ session });

//       // ====================================================
//       // 11. GET ASSET DETAILS
//       // ====================================================

//       const currentAsset = await Asset.findById(currentOrder.assetId).session(
//         session,
//       );

//       if (!currentAsset) {
//         throw createError(404, "Asset not found");
//       }

//       const fractionsPurchased = Number(currentOrder.fractions);

//       // ====================================================
//       // 12. CREATE PURCHASE HISTORY
//       // ====================================================

//       const records = await PurchaseHistory.create(
//         [
//           {
//             userId: currentOrder.userId,

//             assetId: currentOrder.assetId,

//             orderId: currentOrder._id,

//             paymentId: currentPayment._id,

//             paymentGateway,

//             fractionsPurchased,

//             amountPerFraction: Number(currentOrder.amountPerFraction),

//             totalAmount: Number(currentOrder.totalAmount),

//             userSnapshot: await getUserSnapshot(currentOrder.userId, session),

//             assetSnapshot: buildAssetSnapshot(currentAsset, fractionsPurchased),

//             paymentStatus: "SUCCESS",

//             // ==================================
//             // RAZORPAY DETAILS
//             // ==================================

//             razorpayOrderId:
//               paymentGateway === "RAZORPAY" ? razorpayOrderId : null,

//             razorpayPaymentId:
//               paymentGateway === "RAZORPAY" ? razorpayPaymentId : null,

//             razorpaySignature:
//               paymentGateway === "RAZORPAY" ? razorpaySignature || null : null,

//             // ==================================
//             // CASHFREE DETAILS
//             // ==================================

//             cashfreeOrderId:
//               paymentGateway === "CASHFREE" ? cashfreeOrderId : null,

//             cashfreeCfOrderId:
//               paymentGateway === "CASHFREE"
//                 ? currentPayment.cashfreeCfOrderId
//                 : null,

//             cashfreePaymentId:
//               paymentGateway === "CASHFREE" ? gatewayPaymentId : null,

//             // ==================================
//             // PAYU DETAILS
//             // ==================================

//             payuTxnId: paymentGateway === "PAYU" ? payuTxnId : null,

//             payuMihpayId: paymentGateway === "PAYU" ? gatewayPaymentId : null,

//             // ==================================
//             // COMMON PAYMENT DETAILS
//             // ==================================

//             paymentMethod:
//               paymentMethod || currentPayment.paymentMethod || null,

//             transactionReference: gatewayPaymentId,

//             paidAt: currentPayment.paidAt,

//             paymentEmailStatus: "PENDING",

//             paymentEmailAttempts: 0,

//             paymentEmailSentAt: null,

//             paymentEmailClaimedAt: null,
//           },
//         ],
//         {
//           session,
//         },
//       );

//       purchaseHistory = records[0];
//       createdPurchase = true;
//     });

//     // ========================================================
//     // 13. FIND PURCHASE HISTORY AFTER TRANSACTION
//     // ========================================================

//     if (!purchaseHistory) {
//       purchaseHistory = await findExistingPurchase({
//         orderId: order._id,
//         paymentId: payment._id,
//       });
//     }

//     if (!purchaseHistory) {
//       throw createError(
//         500,
//         "Payment committed but purchase history not found",
//       );
//     }

//     // ========================================================
//     // 14. SEND PAYMENT CONFIRMATION EMAIL
//     // ========================================================

//     if (createdPurchase) {
//       const id = purchaseHistory._id;

//       setImmediate(() => {
//         void sendPurchaseConfirmation(id).catch((error) => {
//           console.error("PAYMENT EMAIL PROCESSING ERROR:", error);
//         });
//       });
//     }

//     // ========================================================
//     // 15. SUCCESS RESPONSE
//     // ========================================================

//     return {
//       success: true,

//       alreadyProcessed: !createdPurchase,

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








import mongoose from "mongoose";

import Order from "../model/OrderModel.js";
import Payment from "../model/PaymentModel.js";
import Asset from "../model/coAssetModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";

import { allocateFractions } from "./ownerShipService.js";
import { sendPaymentWelcomeEmail } from "./paymentWelcomeEmail.service.js";

import {
  getExpectedPaymentAmount,
} from "../utils/payment_charges.js";
// ============================================================
// HELPERS
// ============================================================

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toStoredPaise = (amount) => {
  if (
    amount === null ||
    amount === undefined ||
    amount === ""
  ) {
    throw createError(409, "Payment amount is missing");
  }

  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw createError(409, "Invalid stored payment amount");
  }

  const paise = Math.round(value * 100);

  if (!Number.isSafeInteger(paise)) {
    throw createError(409, "Invalid payment amount precision");
  }

  return paise;
};

const validateStoredPaymentAmount = (order, payment) => {
  // New online orders use totalPayableAmount.
  // Historical orders fall back to totalAmount.
  //
  // getExpectedPaymentAmount returns paise.

  const expectedPaymentPaise =
    getExpectedPaymentAmount(order);

  const storedPaymentPaise =
    toStoredPaise(payment.amount);

  if (expectedPaymentPaise !== storedPaymentPaise) {
    console.error("PAYMENT AMOUNT MISMATCH:", {
      orderId: String(order._id),
      paymentId: String(payment._id),
      gateway: order.paymentGateway,
      baseAmount: order.totalAmount,
      processingFee: order.processingFee,
      totalPayableAmount: order.totalPayableAmount,
      storedPaymentAmount: payment.amount,
      expectedPaymentPaise,
      storedPaymentPaise,
    });

    throw createError(
      409,
      "Stored order and payment amount mismatch"
    );
  }

  if (
    String(payment.currency || "INR").toUpperCase() !==
    "INR"
  ) {
    throw createError(409, "Unexpected payment currency");
  }

  return expectedPaymentPaise;
};

const normalizePaidAt = (paidAt) => {
  if (paidAt) {
    const date = new Date(paidAt);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
};

// ============================================================
// ASSET SNAPSHOT
// ============================================================

const buildAssetSnapshot = (
  asset,
  fractionsPurchased
) => ({
  assetName: asset.assetName ?? null,

  assetCode: asset.assetCode ?? null,

  specification: asset.specification ?? null,

  assetCost: asset.assetCost ?? null,

  registeredLegalOwner:
    asset.registeredLegalOwner ?? null,

  totalFractions: asset.totalFractions ?? null,

  amountPerFraction:
    asset.amountPerFraction ?? null,

  rentalAmountPerFraction:
    asset.rentalAmountPerFraction ?? null,

  totalMonthlyRental:
    asset.rentalAmountPerFraction == null
      ? null
      : Number(asset.rentalAmountPerFraction) *
        Number(fractionsPurchased),

  durationMonths: asset.durationMonths ?? null,

  lockInMonths: asset.lockInMonths ?? null,
});

// ============================================================
// FIND EXISTING PURCHASE
// ============================================================

const findExistingPurchase = async ({
  orderId,
  paymentId,
  session = null,
}) => {
  let query = PurchaseHistory.findOne({
    $or: [{ orderId }, { paymentId }],
  });

  if (session) {
    query = query.session(session);
  }

  return query;
};

// ============================================================
// USER SNAPSHOT
// ============================================================

const getUserSnapshot = async (
  userId,
  session = null
) => {
  const User = mongoose.model("User");

  let query = User.findById(userId)
    .select(
      "name fullName email phone mobile fullPhone"
    )
    .lean();

  if (session) {
    query = query.session(session);
  }

  const user = await query;

  return {
    name:
      user?.name ||
      user?.fullName ||
      null,

    email: user?.email || null,

    phone:
      user?.fullPhone ||
      user?.phone ||
      user?.mobile ||
      null,
  };
};

// ============================================================
// PAYMENT CONFIRMATION EMAIL
// ============================================================

const sendPurchaseConfirmation = async (
  purchaseHistoryId
) => {
  const purchase = await PurchaseHistory.findOneAndUpdate(
    {
      _id: purchaseHistoryId,

      paymentStatus: "SUCCESS",

      $or: [
        { paymentEmailStatus: "PENDING" },
        {
          paymentEmailStatus: {
            $exists: false,
          },
        },
      ],
    },
    {
      $set: {
        paymentEmailStatus: "SENDING",
        paymentEmailClaimedAt: new Date(),
      },

      $inc: {
        paymentEmailAttempts: 1,
      },
    },
    {
      new: true,
    }
  );

  if (!purchase) return;

  try {
    const userSnapshot =
      purchase.userSnapshot || {};

    const assetSnapshot =
      purchase.assetSnapshot || {};

    let customerEmail =
      userSnapshot.email || null;

    let customerName =
      userSnapshot.name || null;

    if (!customerEmail || !customerName) {
      const user = await getUserSnapshot(
        purchase.userId
      );

      customerEmail =
        customerEmail || user.email;

      customerName =
        customerName || user.name;
    }

    if (!customerEmail) {
      throw new Error(
        "Customer email not found"
      );
    }

    customerName =
      customerName || "Customer";

    const asset = await Asset.findById(
      purchase.assetId
    )
      .select(
        "assetName assetCode registeredLegalOwner totalFractions assetCost rentalAmountPerFraction"
      )
      .lean();

    const fractionsPurchased = Number(
      purchase.fractionsPurchased || 0
    );

    const monthlyRentalPerFraction =
      assetSnapshot.rentalAmountPerFraction ??
      asset?.rentalAmountPerFraction ??
      null;

    const totalFixedMonthlyRental =
      assetSnapshot.totalMonthlyRental ??
      (monthlyRentalPerFraction == null
        ? null
        : Number(monthlyRentalPerFraction) *
          fractionsPurchased);

    // PurchaseHistory.totalAmount is ownership
    // value excluding processing fee.
    //
    // This preserves the existing email format.

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

      amountPerFraction:
        purchase.amountPerFraction,

      fractionsPurchased,

      totalAmountPaid:
        purchase.totalAmount,

      acquisitionDate:
        purchase.paidAt,

      monthlyRentalPerFraction,

      totalFixedMonthlyRental,

      transactionId:
        purchase.transactionReference ||
        purchase.cashfreePaymentId ||
        purchase.razorpayPaymentId ||
        purchase.payuMihpayId,
    };

    console.log(
      "PAYMENT EMAIL DETAILS:",
      {
        purchaseHistoryId:
          String(purchase._id),

        assetName:
          emailDetails.assetName,

        amountPerFraction:
          emailDetails.amountPerFraction,

        fractionsPurchased,

        totalAmountPaid:
          emailDetails.totalAmountPaid,
      }
    );

    await sendPaymentWelcomeEmail(
      emailDetails
    );

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
      }
    );

    console.log(
      "PAYMENT SUCCESS EMAIL SENT:",
      purchase.transactionReference
    );
  } catch (error) {
    console.error(
      "PAYMENT SUCCESS EMAIL FAILED:",
      purchaseHistoryId,
      error
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
        }
      );
    } catch (updateError) {
      console.error(
        "PAYMENT EMAIL STATUS UPDATE FAILED:",
        updateError
      );
    }
  }
};

// ============================================================
// FINALIZE SUCCESSFUL PAYMENT
// RAZORPAY + CASHFREE + PAYU
//
// IMPORTANT:
// Caller must independently verify:
// 1. Gateway success
// 2. Exact paid amount
// 3. Currency
// 4. Gateway transaction reference
//
// This function verifies stored order/payment consistency.
// ============================================================

export const finalizeSuccessfulPayment = async ({
  paymentGateway = "RAZORPAY",

  // ==========================================================
  // RAZORPAY
  // ==========================================================

  razorpayOrderId = null,
  razorpayPaymentId = null,
  razorpaySignature = null,

  // ==========================================================
  // CASHFREE
  // ==========================================================

  cashfreeOrderId = null,
  cashfreePaymentId = null,

  // ==========================================================
  // PAYU
  // ==========================================================

  payuTxnId = null,
  payuMihpayId = null,

  // ==========================================================
  // COMMON
  // ==========================================================

  paymentMethod = null,
  webhookVerified = false,
  paidAt = null,
}) => {
  // ========================================================
  // 1. VALIDATION
  // ========================================================

  const allowedGateways = [
    "RAZORPAY",
    "CASHFREE",
    "PAYU",
  ];

  if (!allowedGateways.includes(paymentGateway)) {
    throw createError(
      400,
      "Invalid payment gateway"
    );
  }

  if (paymentGateway === "RAZORPAY") {
    if (
      !razorpayOrderId ||
      !razorpayPaymentId
    ) {
      throw createError(
        400,
        "Razorpay order ID and payment ID are required"
      );
    }
  }

  if (paymentGateway === "CASHFREE") {
    if (
      !cashfreeOrderId ||
      !cashfreePaymentId
    ) {
      throw createError(
        400,
        "Cashfree order ID and payment ID are required"
      );
    }
  }

  if (paymentGateway === "PAYU") {
    if (
      !payuTxnId ||
      !payuMihpayId
    ) {
      throw createError(
        400,
        "PayU transaction ID and mihpayid are required"
      );
    }
  }

  const finalPaidAt = normalizePaidAt(
    paidAt
  );

  // ========================================================
  // 2. FIND PAYMENT
  // ========================================================

  const paymentQuery =
    paymentGateway === "RAZORPAY"
      ? {
          razorpayOrderId,
          paymentGateway: "RAZORPAY",
        }
      : paymentGateway === "CASHFREE"
        ? {
            cashfreeOrderId,
            paymentGateway: "CASHFREE",
          }
        : {
            payuTxnId,
            paymentGateway: "PAYU",
          };

  const gatewayPaymentId = String(
    paymentGateway === "RAZORPAY"
      ? razorpayPaymentId
      : paymentGateway === "CASHFREE"
        ? cashfreePaymentId
        : payuMihpayId
  );

  const paymentIdField =
    paymentGateway === "RAZORPAY"
      ? "razorpayPaymentId"
      : paymentGateway === "CASHFREE"
        ? "cashfreePaymentId"
        : "payuMihpayId";

  const payment = await Payment.findOne(
    paymentQuery
  );

  if (!payment) {
    throw createError(
      404,
      "Payment record not found"
    );
  }

  // ========================================================
  // 3. FIND ORDER
  // ========================================================

  const order = await Order.findById(
    payment.orderId
  );

  if (!order) {
    throw createError(
      404,
      "Order not found"
    );
  }

  if (
    order.paymentGateway !==
    paymentGateway
  ) {
    throw createError(
      409,
      "Order payment gateway mismatch"
    );
  }

  if (
    String(order.userId) !==
    String(payment.userId)
  ) {
    throw createError(
      409,
      "Order and payment customer mismatch"
    );
  }

  if (
    paymentGateway === "PAYU" &&
    String(order.payuTxnId) !==
      String(payuTxnId)
  ) {
    throw createError(
      409,
      "PayU transaction does not match order"
    );
  }

  // ========================================================
  // 4. VERIFY STORED PAYMENT AMOUNT
  // UPDATED: NOW INCLUDES 0.5% PROCESSING FEE
  // ========================================================

  const expectedPaymentPaise =
    validateStoredPaymentAmount(
      order,
      payment
    );

  console.log("PAYMENT AMOUNT VERIFIED:", {
    orderId: String(order._id),

    paymentGateway,

    ownershipAmount:
      order.totalAmount,

    processingFeePercentage:
      order.processingFeePercentage ?? 0,

    processingFee:
      order.processingFee ?? 0,

    totalPayableAmount:
      order.totalPayableAmount ??
      order.totalAmount,

    paymentAmount:
      payment.amount,

    expectedPaymentPaise,
  });

  // ========================================================
  // 5. PREVENT DUPLICATE GATEWAY PAYMENT REFERENCE
  // ========================================================

  const reusedPayment =
    await Payment.findOne({
      _id: {
        $ne: payment._id,
      },

      [paymentIdField]:
        gatewayPaymentId,
    });

  if (reusedPayment) {
    throw createError(
      409,
      "Gateway payment reference already used"
    );
  }

  if (
    payment[paymentIdField] &&
    String(payment[paymentIdField]) !==
      gatewayPaymentId
  ) {
    throw createError(
      409,
      "Order already associated with a different gateway payment"
    );
  }

  // ========================================================
  // 6. START DATABASE TRANSACTION
  // ========================================================

  let purchaseHistory = null;
  let createdPurchase = false;

  const session =
    await mongoose.startSession();

  try {
    await session.withTransaction(
      async () => {
        const currentPayment =
          await Payment.findById(
            payment._id
          ).session(session);

        const currentOrder =
          await Order.findById(
            order._id
          ).session(session);

        if (
          !currentPayment ||
          !currentOrder
        ) {
          throw createError(
            404,
            "Order or payment record not found"
          );
        }

        // ==================================================
        // 6.1 VERIFY GATEWAY MATCH
        // ==================================================

        if (
          currentPayment.paymentGateway !==
            paymentGateway ||
          currentOrder.paymentGateway !==
            paymentGateway
        ) {
          throw createError(
            409,
            "Gateway mismatch during finalization"
          );
        }

        if (
          String(currentOrder.userId) !==
          String(currentPayment.userId)
        ) {
          throw createError(
            409,
            "Customer mismatch during finalization"
          );
        }

        if (
          paymentGateway === "PAYU" &&
          String(currentOrder.payuTxnId) !==
            String(payuTxnId)
        ) {
          throw createError(
            409,
            "PayU transaction mismatch during finalization"
          );
        }

        if (
          currentPayment[paymentIdField] &&
          String(
            currentPayment[paymentIdField]
          ) !== gatewayPaymentId
        ) {
          throw createError(
            409,
            "Gateway payment reference mismatch"
          );
        }

        // ==================================================
        // 6.2 RECHECK AMOUNT INSIDE TRANSACTION
        // ==================================================

        validateStoredPaymentAmount(
          currentOrder,
          currentPayment
        );

        // ==================================================
        // 6.3 CHECK EXISTING PURCHASE
        // ==================================================

        const existing =
          await findExistingPurchase({
            orderId:
              currentOrder._id,

            paymentId:
              currentPayment._id,

            session,
          });

        if (existing) {
          if (
            currentOrder.status !==
            "COMPLETED"
          ) {
            throw createError(
              409,
              "Purchase exists but order is not completed; reconciliation required"
            );
          }

          if (
            String(existing.orderId) !==
              String(currentOrder._id) ||
            String(existing.paymentId) !==
              String(currentPayment._id)
          ) {
            throw createError(
              409,
              "Existing purchase belongs to another order/payment"
            );
          }

          if (
            existing.transactionReference &&
            String(
              existing.transactionReference
            ) !== gatewayPaymentId
          ) {
            throw createError(
              409,
              "Existing purchase has a different transaction reference"
            );
          }

          // ================================================
          // ALREADY PROCESSED — IDEMPOTENT RETURN
          // ================================================

          currentPayment[paymentIdField] =
            gatewayPaymentId;

          if (
            paymentGateway === "RAZORPAY" &&
            razorpaySignature
          ) {
            currentPayment.razorpaySignature =
              razorpaySignature;
          }

          currentPayment.status =
            "SUCCESS";

          currentPayment.paidAt ||=
            existing.paidAt ||
            finalPaidAt;

          if (
            paymentMethod &&
            !currentPayment.paymentMethod
          ) {
            currentPayment.paymentMethod =
              paymentMethod;
          }

          if (webhookVerified) {
            currentPayment.webhookVerified =
              true;
          }

          await currentPayment.save({
            session,
          });

          if (!existing.paidAt) {
            existing.paidAt =
              currentPayment.paidAt;

            await existing.save({
              session,
            });
          }

          purchaseHistory = existing;
          createdPurchase = false;

          return;
        }

        // ==================================================
        // 6.4 CHECK EXISTING PAYMENT STATUS
        // ==================================================

        if (
          currentPayment.status ===
            "SUCCESS" ||
          currentOrder.status ===
            "COMPLETED"
        ) {
          throw createError(
            409,
            "Payment/order marked complete without purchase; manual reconciliation required"
          );
        }

        if (
          currentOrder.status !==
            "PENDING_PAYMENT" ||
          currentPayment.status !==
            "PENDING"
        ) {
          throw createError(
            409,
            "Order or payment is no longer pending; manual reconciliation required"
          );
        }

        // ==================================================
        // 6.5 ORDER EXPIRATION
        // ==================================================

        if (
          new Date(
            currentOrder.expiresAt
          ).getTime() <= Date.now()
        ) {
          throw createError(
            409,
            "Order reservation expired; payment requires manual reconciliation"
          );
        }

        // ==================================================
        // 7. ALLOCATE OWNERSHIP FRACTIONS
        // ==================================================

        // Existing reservation was created
        // when createOrder() ran.
        //
        // allocateFractions must use the same
        // transaction session and must not
        // decrement availableFractions again.

        await allocateFractions({
          assetId:
            currentOrder.assetId,

          userId:
            currentOrder.userId,

          fractions:
            currentOrder.fractions,

          razorpayOrderId:
            paymentGateway === "RAZORPAY"
              ? razorpayOrderId
              : null,

          razorpayPaymentId:
            paymentGateway === "RAZORPAY"
              ? razorpayPaymentId
              : null,

          session,
        });

        // ==================================================
        // 8. UPDATE RESERVED FRACTIONS
        // ==================================================

        const assetUpdate =
          await Asset.updateOne(
            {
              _id:
                currentOrder.assetId,

              reservedFractions: {
                $gte:
                  currentOrder.fractions,
              },
            },
            {
              $inc: {
                reservedFractions:
                  -Number(
                    currentOrder.fractions
                  ),
              },
            },
            {
              session,
            }
          );

        if (
          assetUpdate.modifiedCount !== 1
        ) {
          throw createError(
            409,
            "Unable to finalize reserved fractions"
          );
        }

        // ==================================================
        // 9. UPDATE PAYMENT DETAILS
        // ==================================================

        currentPayment[paymentIdField] =
          gatewayPaymentId;

        if (
          paymentGateway === "RAZORPAY" &&
          razorpaySignature
        ) {
          currentPayment.razorpaySignature =
            razorpaySignature;
        }

        currentPayment.status =
          "SUCCESS";

        if (!currentPayment.paidAt) {
          currentPayment.paidAt =
            finalPaidAt;
        }

        if (paymentMethod) {
          currentPayment.paymentMethod =
            paymentMethod;
        }

        if (webhookVerified) {
          currentPayment.webhookVerified =
            true;
        }

        // Do not replace Payment.amount
        // with order.totalAmount.
        //
        // Payment.amount already includes
        // the 0.5% processing fee.

        await currentPayment.save({
          session,
        });

        // ==================================================
        // 10. COMPLETE ORDER
        // ==================================================

        currentOrder.status =
          "COMPLETED";

        await currentOrder.save({
          session,
        });

        // ==================================================
        // 11. GET ASSET DETAILS
        // ==================================================

        const currentAsset =
          await Asset.findById(
            currentOrder.assetId
          ).session(session);

        if (!currentAsset) {
          throw createError(
            404,
            "Asset not found"
          );
        }

        const fractionsPurchased =
          Number(
            currentOrder.fractions
          );

        // ==================================================
        // 12. CREATE PURCHASE HISTORY
        // ==================================================

        const records =
          await PurchaseHistory.create(
            [
              {
                userId:
                  currentOrder.userId,

                assetId:
                  currentOrder.assetId,

                orderId:
                  currentOrder._id,

                paymentId:
                  currentPayment._id,

                paymentGateway,

                fractionsPurchased,

                amountPerFraction:
                  Number(
                    currentOrder.amountPerFraction
                  ),

                // Asset ownership amount only.
                // Processing fee is excluded.
                totalAmount:
                  Number(
                    currentOrder.totalAmount
                  ),

                userSnapshot:
                  await getUserSnapshot(
                    currentOrder.userId,
                    session
                  ),

                assetSnapshot:
                  buildAssetSnapshot(
                    currentAsset,
                    fractionsPurchased
                  ),

                paymentStatus:
                  "SUCCESS",

                // ======================================
                // RAZORPAY
                // ======================================

                razorpayOrderId:
                  paymentGateway ===
                  "RAZORPAY"
                    ? razorpayOrderId
                    : null,

                razorpayPaymentId:
                  paymentGateway ===
                  "RAZORPAY"
                    ? razorpayPaymentId
                    : null,

                razorpaySignature:
                  paymentGateway ===
                  "RAZORPAY"
                    ? razorpaySignature ||
                      null
                    : null,

                // ======================================
                // CASHFREE
                // ======================================

                cashfreeOrderId:
                  paymentGateway ===
                  "CASHFREE"
                    ? cashfreeOrderId
                    : null,

                cashfreeCfOrderId:
                  paymentGateway ===
                  "CASHFREE"
                    ? currentPayment
                        .cashfreeCfOrderId
                    : null,

                cashfreePaymentId:
                  paymentGateway ===
                  "CASHFREE"
                    ? gatewayPaymentId
                    : null,

                // ======================================
                // PAYU
                // ======================================

                payuTxnId:
                  paymentGateway ===
                  "PAYU"
                    ? payuTxnId
                    : null,

                payuMihpayId:
                  paymentGateway ===
                  "PAYU"
                    ? gatewayPaymentId
                    : null,

                // ======================================
                // COMMON PAYMENT DETAILS
                // ======================================

                paymentMethod:
                  paymentMethod ||
                  currentPayment
                    .paymentMethod ||
                  null,

                transactionReference:
                  gatewayPaymentId,

                paidAt:
                  currentPayment.paidAt,

                paymentEmailStatus:
                  "PENDING",

                paymentEmailAttempts: 0,

                paymentEmailSentAt: null,

                paymentEmailClaimedAt: null,
              },
            ],
            {
              session,
            }
          );

        purchaseHistory = records[0];
        createdPurchase = true;
      }
    );

    // ========================================================
    // 13. FIND PURCHASE AFTER COMMIT
    // ========================================================

    if (!purchaseHistory) {
      purchaseHistory =
        await findExistingPurchase({
          orderId:
            order._id,

          paymentId:
            payment._id,
        });
    }

    if (!purchaseHistory) {
      throw createError(
        500,
        "Payment committed but purchase history not found"
      );
    }

    // ========================================================
    // 14. SEND PAYMENT CONFIRMATION EMAIL
    // ========================================================

    if (createdPurchase) {
      const purchaseId =
        purchaseHistory._id;

      setImmediate(() => {
        void sendPurchaseConfirmation(
          purchaseId
        ).catch((error) => {
          console.error(
            "PAYMENT EMAIL PROCESSING ERROR:",
            error
          );
        });
      });
    }

    // ========================================================
    // 15. SUCCESS RESPONSE
    // ========================================================

    return {
      success: true,

      alreadyProcessed:
        !createdPurchase,

      purchaseHistoryId:
        purchaseHistory._id,

      paymentId:
        payment._id,

      orderId:
        order._id,

      paidAt:
        purchaseHistory.paidAt ||
        finalPaidAt,

      // Ownership amount excluding processing fee.
      ownershipAmount:
        Number(order.totalAmount),

      // Fee charged on the order.
      processingFee:
        Number(order.processingFee || 0),

      // Total amount paid through gateway.
      totalPayableAmount:
        Number(
          order.totalPayableAmount ??
          order.totalAmount
        ),
    };
  } catch (error) {
    console.error(
      "FINALIZE SUCCESSFUL PAYMENT ERROR:",
      error
    );

    throw error;
  } finally {
    await session.endSession();
  }
};
