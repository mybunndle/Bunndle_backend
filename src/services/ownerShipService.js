
import mongoose from "mongoose";

import Asset from "../model/coAssetModel.js";
import Ownership from "../model/ownerShipModel.js";

// ============================================================
// ALLOCATE FRACTIONS
// SUPPORTS RAZORPAY + CASHFREE + PAYU
//
// IMPORTANT:
// - Only handles Ownership.
// - PurchaseHistory is created by payment finalization.
// - Uses parent's MongoDB transaction when supplied.
// - Uses order's purchase price when provided.
// ============================================================

export const allocateFractions = async ({
  assetId,
  userId,
  fractions,

  // ORDER PURCHASE PRICE
  amountPerFraction = null,

  // EXISTING RAZORPAY FIELDS
  razorpayOrderId = null,
  razorpayPaymentId = null,

  // EXTERNAL MONGODB SESSION
  session = null,
}) => {
  let localSession = null;

  // ==========================================================
  // 1. SESSION MANAGEMENT
  // ==========================================================

  const activeSession =
    session ||
    (localSession = await mongoose.startSession());

  const executeAllocation = async () => {
    // ========================================================
    // 2. VALIDATE INPUT
    // ========================================================

    if (
      !mongoose.isValidObjectId(assetId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      throw new Error("Invalid asset or user ID");
    }

    const fractionCount = Number(fractions);

    if (
      !Number.isSafeInteger(fractionCount) ||
      fractionCount <= 0
    ) {
      throw new Error("Invalid fraction count");
    }

    // ========================================================
    // 3. FIND ASSET
    // ========================================================

    const asset = await Asset.findById(
      assetId
    ).session(activeSession);

    if (!asset) {
      throw new Error("Asset not found");
    }

    // ========================================================
    // 4. DETERMINE PURCHASE PRICE
    // ========================================================
    //
    // Payment finalization must pass the price
    // stored in the original Order.
    //
    // Existing standalone callers can continue
    // using the current asset price.
    // ========================================================

    const purchasePrice =
      amountPerFraction == null
        ? Number(asset.amountPerFraction)
        : Number(amountPerFraction);

    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice <= 0
    ) {
      throw new Error("Invalid purchase price");
    }

    // ========================================================
    // 5. CALCULATE TOTAL INVESTMENT
    // ========================================================

    const totalAmount =
      Math.round(
        fractionCount * purchasePrice * 100
      ) / 100;

    if (
      !Number.isSafeInteger(
        Math.round(totalAmount * 100)
      ) ||
      totalAmount <= 0
    ) {
      throw new Error("Invalid investment amount");
    }

    // ========================================================
    // 6. FIND EXISTING OWNERSHIP
    // ========================================================

    let ownership = await Ownership.findOne({
      assetId,
      userId,
    }).session(activeSession);

    // ========================================================
    // 7. UPDATE EXISTING OWNERSHIP
    // ========================================================

    if (ownership) {
      const previousFractions = Number(
        ownership.fractionsOwned || 0
      );

      const previousAmount = Number(
        ownership.investedAmount || 0
      );

      if (
        !Number.isSafeInteger(previousFractions) ||
        previousFractions < 0 ||
        !Number.isFinite(previousAmount) ||
        previousAmount < 0
      ) {
        throw new Error(
          "Existing ownership data is invalid"
        );
      }

      const newFractions =
        previousFractions + fractionCount;

      const newTotalAmount =
        Math.round(
          (previousAmount + totalAmount) * 100
        ) / 100;

      if (
        !Number.isSafeInteger(newFractions) ||
        !Number.isFinite(newTotalAmount)
      ) {
        throw new Error(
          "Ownership calculation overflow"
        );
      }

      ownership.fractionsOwned =
        newFractions;

      ownership.investedAmount =
        newTotalAmount;

      ownership.averagePurchasePrice =
        newTotalAmount / newFractions;

      // Backward compatibility with older
      // Ownership schemas containing these fields.

      if (
        ownership.schema.path("razorpayOrderId") &&
        razorpayOrderId
      ) {
        ownership.razorpayOrderId =
          razorpayOrderId;
      }

      if (
        ownership.schema.path("razorpayPaymentId") &&
        razorpayPaymentId
      ) {
        ownership.razorpayPaymentId =
          razorpayPaymentId;
      }

      await ownership.save({
        session: activeSession,
      });
    }

    // ========================================================
    // 8. CREATE NEW OWNERSHIP
    // ========================================================

    else {
      const createdOwnerships =
        await Ownership.create(
          [
            {
              assetId,

              userId,

              fractionsOwned:
                fractionCount,

              investedAmount:
                totalAmount,

              averagePurchasePrice:
                purchasePrice,
            },
          ],
          {
            session: activeSession,
          }
        );

      ownership = createdOwnerships[0];
    }

    // ========================================================
    // 9. RETURN RESULT
    // ========================================================

    return {
      success: true,

      ownership,

      asset,

      fractionsPurchased:
        fractionCount,

      amountPerFraction:
        purchasePrice,

      totalAmount,
    };
  };

  try {
    // ========================================================
    // 10. USE PARENT TRANSACTION
    // ========================================================

    if (session) {
      return await executeAllocation();
    }

    // ========================================================
    // 11. STANDALONE TRANSACTION
    // ========================================================

    let result;

    await localSession.withTransaction(
      async () => {
        result = await executeAllocation();
      }
    );

    return result;
  } finally {
    // ========================================================
    // 12. END ONLY LOCALLY OWNED SESSION
    // ========================================================

    if (localSession) {
      await localSession.endSession();
    }
  }
};
