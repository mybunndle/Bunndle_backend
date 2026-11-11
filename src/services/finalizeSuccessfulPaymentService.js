
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






import mongoose from "mongoose";

import Order from "../model/OrderModel.js";
import Payment from "../model/PaymentModel.js";
import Asset from "../model/coAssetModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";

import { allocateFractions } from "./ownerShipService.js";
import { sendPaymentWelcomeEmail } from "./paymentWelcomeEmail.service.js";

// ============================================================
// HELPERS
// ============================================================

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

const getUserSnapshot = async (userId, session = null) => {
  const User = mongoose.model("User");

  let query = User.findById(userId)
    .select("name fullName email phone mobile fullPhone")
    .lean();

  if (session) {
    query = query.session(session);
  }

  const user = await query;

  return {
    name: user?.name || user?.fullName || null,
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

      $inc: {
        paymentEmailAttempts: 1,
      },
    },
    {
      new: true,
    },
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

    const fractionsPurchased = Number(
      purchase.fractionsPurchased || 0,
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

    // ========================================================
    // COMMON EMAIL DETAILS - RAZORPAY + CASHFREE
    // ========================================================

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
        purchase.cashfreePaymentId ||
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
      monthlyRentalPerFraction:
        emailDetails.monthlyRentalPerFraction,
      totalFixedMonthlyRental:
        emailDetails.totalFixedMonthlyRental,
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
      purchase.transactionReference,
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

// ============================================================
// FINALIZE SUCCESSFUL PAYMENT
// SUPPORTS RAZORPAY + CASHFREE
//
// IMPORTANT:
// Caller must verify gateway payment status,
// amount, currency and order ownership first.
// ============================================================

export const finalizeSuccessfulPayment = async ({
  paymentGateway = "RAZORPAY",

  // RAZORPAY
  razorpayOrderId = null,
  razorpayPaymentId = null,
  razorpaySignature = null,

  // CASHFREE
  cashfreeOrderId = null,
  cashfreePaymentId = null,

  // COMMON
  paymentMethod = null,
  webhookVerified = false,
  paidAt = null,
}) => {
  // ========================================================
  // 1. VALIDATION
  // ========================================================

  if (
    !["RAZORPAY", "CASHFREE"].includes(paymentGateway)
  ) {
    throw createError(400, "Invalid payment gateway");
  }

  if (paymentGateway === "RAZORPAY") {
    if (!razorpayOrderId) {
      throw createError(
        400,
        "Razorpay order ID is required",
      );
    }

    if (!razorpayPaymentId) {
      throw createError(
        400,
        "Razorpay payment ID is required",
      );
    }
  }

  if (paymentGateway === "CASHFREE") {
    if (!cashfreeOrderId) {
      throw createError(
        400,
        "Cashfree order ID is required",
      );
    }

    if (!cashfreePaymentId) {
      throw createError(
        400,
        "Cashfree payment ID is required",
      );
    }
  }

  const finalPaidAt = normalizePaidAt(paidAt);

  // ========================================================
  // 2. FIND PAYMENT
  // ========================================================

  const paymentQuery =
    paymentGateway === "CASHFREE"
      ? {
          paymentGateway: "CASHFREE",
          cashfreeOrderId,
        }
      : {
          razorpayOrderId,
        };

  const payment = await Payment.findOne(paymentQuery);

  if (!payment) {
    throw createError(
      404,
      "Payment record not found",
    );
  }

  // ========================================================
  // 3. VERIFY GATEWAY MATCH
  // ========================================================

  if (
    (payment.paymentGateway || "RAZORPAY") !==
    paymentGateway
  ) {
    throw createError(
      409,
      "Payment gateway mismatch",
    );
  }

  // ========================================================
  // 4. CHECK EXISTING TRANSACTION
  // ========================================================

  const gatewayPaymentId =
    paymentGateway === "CASHFREE"
      ? String(cashfreePaymentId)
      : String(razorpayPaymentId);

  const existingGatewayPaymentId =
    paymentGateway === "CASHFREE"
      ? payment.cashfreePaymentId
      : payment.razorpayPaymentId;

  if (
    payment.status === "SUCCESS" &&
    existingGatewayPaymentId &&
    String(existingGatewayPaymentId) !== gatewayPaymentId
  ) {
    throw createError(
      409,
      "This order has already been completed using another payment",
    );
  }

  // ========================================================
  // 5. FIND ORDER
  // ========================================================

  const order = await Order.findById(payment.orderId);

  if (!order) {
    throw createError(404, "Order not found");
  }

  if (
    (order.paymentGateway || "RAZORPAY") !==
    paymentGateway
  ) {
    throw createError(
      409,
      "Order payment gateway mismatch",
    );
  }

  // ========================================================
  // 6. FIND ASSET
  // ========================================================

  const asset = await Asset.findById(order.assetId);

  if (!asset) {
    throw createError(404, "Asset not found");
  }

  // ========================================================
  // 7. CHECK EXISTING PURCHASE
  // ========================================================

  const existingPurchase = await findExistingPurchase({
    orderId: order._id,
    paymentId: payment._id,
  });

  if (
    payment.status === "SUCCESS" &&
    existingPurchase
  ) {
    const existingPaidAt =
      existingPurchase.paidAt ||
      payment.paidAt ||
      finalPaidAt;

    const paymentUpdate = {};

    if (!payment.paidAt) {
      paymentUpdate.paidAt = existingPaidAt;
    }

    if (paymentGateway === "RAZORPAY") {
      if (!payment.razorpayPaymentId) {
        paymentUpdate.razorpayPaymentId =
          razorpayPaymentId;
      }

      if (
        razorpaySignature &&
        !payment.razorpaySignature
      ) {
        paymentUpdate.razorpaySignature =
          razorpaySignature;
      }
    } else {
      if (!payment.cashfreePaymentId) {
        paymentUpdate.cashfreePaymentId =
          String(cashfreePaymentId);
      }
    }

    if (
      paymentMethod &&
      !payment.paymentMethod
    ) {
      paymentUpdate.paymentMethod =
        paymentMethod;
    }

    if (
      webhookVerified &&
      !payment.webhookVerified
    ) {
      paymentUpdate.webhookVerified = true;
      paymentUpdate.webhookVerifiedAt = finalPaidAt;
    }

    if (Object.keys(paymentUpdate).length > 0) {
      await Payment.updateOne(
        {
          _id: payment._id,
        },
        {
          $set: paymentUpdate,
        },
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

  // ========================================================
  // 8. EXPIRED ORDER CHECK
  // ========================================================

  if (order.status === "EXPIRED") {
    throw createError(
      409,
      "Order has expired. Successful payment requires manual reconciliation",
    );
  }

  // ========================================================
  // 9. START TRANSACTION
  // ========================================================

  const session = await mongoose.startSession();

  let purchaseHistory = null;
  let createdPurchase = false;

  try {
    await session.withTransaction(async () => {
      const currentPayment =
        await Payment.findById(
          payment._id,
        ).session(session);

      if (!currentPayment) {
        throw createError(
          404,
          "Payment record not found",
        );
      }

      const currentOrder =
        await Order.findById(
          order._id,
        ).session(session);

      if (!currentOrder) {
        throw createError(
          404,
          "Order not found",
        );
      }

      // ====================================================
      // CHECK EXISTING PURCHASE INSIDE TRANSACTION
      // ====================================================

      const purchaseAlreadyExists =
        await findExistingPurchase({
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
          purchaseAlreadyExists.paidAt =
            existingPaidAt;

          await purchaseAlreadyExists.save({
            session,
          });
        }

        currentPayment.status = "SUCCESS";

        if (paymentGateway === "RAZORPAY") {
          currentPayment.razorpayPaymentId =
            razorpayPaymentId;

          if (razorpaySignature) {
            currentPayment.razorpaySignature =
              razorpaySignature;
          }
        } else {
          currentPayment.cashfreePaymentId =
            String(cashfreePaymentId);
        }

        if (paymentMethod) {
          currentPayment.paymentMethod =
            paymentMethod;
        }

        if (!currentPayment.paidAt) {
          currentPayment.paidAt =
            existingPaidAt;
        }

        if (webhookVerified) {
          currentPayment.webhookVerified = true;

          currentPayment.webhookVerifiedAt =
            currentPayment.webhookVerifiedAt ||
            finalPaidAt;
        }

        await currentPayment.save({
          session,
        });

        purchaseHistory = purchaseAlreadyExists;
        createdPurchase = false;

        return;
      }

      // ====================================================
      // EXPIRED ORDER CHECK
      // ====================================================

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

      // ====================================================
      // ALLOCATE FRACTIONS
      // ====================================================

      await allocateFractions({
        assetId: currentOrder.assetId,

        userId: currentOrder.userId,

        fractions: currentOrder.fractions,

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

      // ====================================================
      // UPDATE PAYMENT
      // ====================================================

      if (paymentGateway === "RAZORPAY") {
        currentPayment.razorpayPaymentId =
          razorpayPaymentId;

        if (razorpaySignature) {
          currentPayment.razorpaySignature =
            razorpaySignature;
        }
      } else {
        currentPayment.cashfreePaymentId =
          String(cashfreePaymentId);
      }

      currentPayment.status = "SUCCESS";

      currentPayment.paidAt =
        currentPayment.paidAt ||
        finalPaidAt;

      if (paymentMethod) {
        currentPayment.paymentMethod =
          paymentMethod;
      }

      if (webhookVerified) {
        currentPayment.webhookVerified = true;

        currentPayment.webhookVerifiedAt =
          currentPayment.webhookVerifiedAt ||
          finalPaidAt;
      }

      await currentPayment.save({
        session,
      });

      // ====================================================
      // UPDATE RESERVED FRACTIONS
      // ====================================================

      if (
        currentOrder.status === "PENDING_PAYMENT"
      ) {
        const assetUpdate =
          await Asset.updateOne(
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
            {
              session,
            },
          );

        if (assetUpdate.modifiedCount !== 1) {
          throw createError(
            409,
            "Unable to finalize reserved fractions",
          );
        }
      }

      currentOrder.status = "COMPLETED";

      await currentOrder.save({
        session,
      });

      // ====================================================
      // CURRENT ASSET
      // ====================================================

      const currentAsset =
        await Asset.findById(
          currentOrder.assetId,
        ).session(session);

      if (!currentAsset) {
        throw createError(
          404,
          "Asset not found",
        );
      }

      const fractionsPurchased = Number(
        currentOrder.fractions || 0,
      );

      const assetSnapshot =
        buildAssetSnapshot(
          currentAsset,
          fractionsPurchased,
        );

      const userSnapshot =
        await getUserSnapshot(
          currentOrder.userId,
          session,
        );

      // ====================================================
      // CREATE PURCHASE HISTORY
      // ====================================================

      const purchaseRecords =
        await PurchaseHistory.create(
          [
            {
              userId: currentOrder.userId,

              assetId: currentOrder.assetId,

              orderId: currentOrder._id,

              paymentId: currentPayment._id,

              paymentGateway,

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

              // ==================================
              // RAZORPAY DETAILS
              // ==================================

              razorpayOrderId:
                paymentGateway === "RAZORPAY"
                  ? razorpayOrderId
                  : null,

              razorpayPaymentId:
                paymentGateway === "RAZORPAY"
                  ? razorpayPaymentId
                  : null,

              razorpaySignature:
                paymentGateway === "RAZORPAY"
                  ? razorpaySignature || null
                  : null,

              // ==================================
              // CASHFREE DETAILS
              // ==================================

              cashfreeOrderId:
                paymentGateway === "CASHFREE"
                  ? cashfreeOrderId
                  : null,

              cashfreeCfOrderId:
                paymentGateway === "CASHFREE"
                  ? currentPayment.cashfreeCfOrderId
                  : null,

              cashfreePaymentId:
                paymentGateway === "CASHFREE"
                  ? String(cashfreePaymentId)
                  : null,

              // ==================================
              // COMMON PAYMENT DETAILS
              // ==================================

              paymentMethod:
                paymentMethod ||
                currentPayment.paymentMethod ||
                null,

              transactionReference:
                paymentGateway === "CASHFREE"
                  ? String(cashfreePaymentId)
                  : razorpayPaymentId,

              paidAt:
                currentPayment.paidAt ||
                finalPaidAt,

              paymentEmailStatus: "PENDING",

              paymentEmailAttempts: 0,

              paymentEmailSentAt: null,

              paymentEmailClaimedAt: null,
            },
          ],
          {
            session,
          },
        );

      purchaseHistory = purchaseRecords[0];

      createdPurchase = true;
    });

    // ========================================================
    // FIND PURCHASE AFTER TRANSACTION
    // ========================================================

    if (!purchaseHistory) {
      purchaseHistory =
        await findExistingPurchase({
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

    // ========================================================
    // SEND PAYMENT CONFIRMATION EMAIL
    // ========================================================

    if (createdPurchase) {
      const confirmationPurchaseId =
        purchaseHistory._id;

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

    // ========================================================
    // RESPONSE
    // ========================================================

    return {
      success: true,

      alreadyProcessed: !createdPurchase,

      purchaseHistoryId: purchaseHistory._id,

      paymentId: payment._id,

      orderId: order._id,

      paidAt:
        purchaseHistory.paidAt ||
        finalPaidAt,
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
