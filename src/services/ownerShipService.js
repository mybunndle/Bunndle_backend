import mongoose from "mongoose";

import Asset from "../model/coAssetModel.js";
import Ownership from "../model/ownerShipModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";

export const allocateFractions = async ({
  assetId,
  userId,
  fractions,
  razorpayOrderId = null,
  razorpayPaymentId = null,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate fractions
    if (!fractions || fractions <= 0) {
      throw new Error("Invalid fraction count");
    }

    // Prevent duplicate processing
    if (razorpayPaymentId) {
      const existingPurchase =
        await PurchaseHistory.findOne({
          razorpayPaymentId,
        }).session(session);

      if (existingPurchase) {
        throw new Error(
          "Payment already processed"
        );
      }
    }

    // Get Asset
    const asset = await Asset.findById(
      assetId
    ).session(session);

    if (!asset) {
      throw new Error("Asset not found");
    }

    // Check available fractions
    if (
      asset.availableFractions < fractions
    ) {
      throw new Error(
        "Not enough fractions available"
      );
    }

    // Calculate amount
    const totalAmount =
      fractions * asset.amountPerFraction;

    // Reduce available fractions
    asset.availableFractions -= fractions;

    if (
      asset.availableFractions === 0
    ) {
      asset.status = "SOLD_OUT";
    }

    await asset.save({ session });

    // Check existing ownership
    const ownership =
      await Ownership.findOne({
        assetId,
        userId,
      }).session(session);

    if (ownership) {
      const previousFractions =
        ownership.fractionsOwned;

      const previousInvestment =
        ownership.investedAmount;

      ownership.fractionsOwned +=
        fractions;

      ownership.investedAmount +=
        totalAmount;

      ownership.averagePurchasePrice =
        (previousInvestment +
          totalAmount) /
        (previousFractions +
          fractions);

      await ownership.save({
        session,
      });
    } else {
      await Ownership.create(
        [
          {
            assetId,
            userId,
            fractionsOwned:
              fractions,
            investedAmount:
              totalAmount,
            averagePurchasePrice:
              asset.amountPerFraction,
          },
        ],
        { session }
      );
    }

    // Create Purchase History
    await PurchaseHistory.create(
      [
        {
          assetId,
          userId,

          fractionsPurchased:
            fractions,

          amountPerFraction:
            asset.amountPerFraction,

          totalAmount,

          paymentStatus:
            "SUCCESS",

          razorpayOrderId,

          razorpayPaymentId,

          transactionReference:
            razorpayPaymentId,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      assetId,
      userId,
      fractionsPurchased:
        fractions,
      totalAmount,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};