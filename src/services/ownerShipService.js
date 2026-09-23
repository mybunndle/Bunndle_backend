import mongoose from "mongoose";

import Asset from "../model/coAssetModel.js";
import Ownership from "../model/ownerShipModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";




/**
 * Allocates purchased fractions to a user's ownership.
 *
 * IMPORTANT:
 * This service ONLY handles Ownership.
 * PurchaseHistory is created by the payment finalization service.
 */
export const allocateFractions = async ({
  assetId,
  userId,
  fractions,
  razorpayOrderId = null,
  razorpayPaymentId = null,

  // External MongoDB session
  session = null,
}) => {
  let localSession = null;

  /*
   * If caller doesn't provide a session,
   * this function remains usable independently.
   *
   * If payment finalization provides a session,
   * everything runs in the parent's transaction.
   */
  const activeSession =
    session ||
    (localSession =
      await mongoose.startSession());

  const executeAllocation =
    async () => {
      // =====================================
      // VALIDATION
      // =====================================

      const fractionCount =
        Number(fractions);

      if (
        !Number.isInteger(
          fractionCount
        ) ||
        fractionCount <= 0
      ) {
        throw new Error(
          "Invalid fraction count"
        );
      }

      // =====================================
      // ASSET
      // =====================================

      const asset =
        await Asset.findById(
          assetId
        ).session(activeSession);

      if (!asset) {
        throw new Error(
          "Asset not found"
        );
      }

      // =====================================
      // CALCULATE PURCHASE AMOUNT
      // =====================================

      const totalAmount =
        fractionCount *
        Number(
          asset.amountPerFraction
        );

      // =====================================
      // FIND EXISTING OWNERSHIP
      // =====================================

      let ownership =
        await Ownership.findOne({
          assetId,
          userId,
        }).session(activeSession);

      // =====================================
      // UPDATE EXISTING OWNERSHIP
      // =====================================

      if (ownership) {
        const previousFractions =
          Number(
            ownership.fractionsOwned ||
              0
          );

        /*
         * Keep your existing field name
         * investedAmount for compatibility.
         * No need to rename it right now.
         */
        const previousAmount =
          Number(
            ownership.investedAmount ||
              0
          );

        const newFractions =
          previousFractions +
          fractionCount;

        const newTotalAmount =
          previousAmount +
          totalAmount;

        ownership.fractionsOwned =
          newFractions;

        ownership.investedAmount =
          newTotalAmount;

        ownership.averagePurchasePrice =
          newFractions > 0
            ? newTotalAmount /
              newFractions
            : 0;

        /*
         * Only set these if fields exist
         * in your Ownership schema.
         */
        if (
          "razorpayOrderId" in
          ownership
        ) {
          ownership.razorpayOrderId =
            razorpayOrderId;
        }

        if (
          "razorpayPaymentId" in
          ownership
        ) {
          ownership.razorpayPaymentId =
            razorpayPaymentId;
        }

        await ownership.save({
          session:
            activeSession,
        });
      }

      // =====================================
      // CREATE NEW OWNERSHIP
      // =====================================

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
                  asset.amountPerFraction,
              },
            ],

            {
              session:
                activeSession,
            }
          );

        ownership =
          createdOwnerships[0];
      }

      // =====================================
      // RETURN OWNERSHIP
      // =====================================

      return {
        success: true,

        ownership,

        asset,

        fractionsPurchased:
          fractionCount,

        totalAmount,
      };
    };


  try {
    /*
     * Parent already controls transaction.
     */
    if (session) {
      return await executeAllocation();
    }

    /*
     * Backward compatibility:
     * if called standalone, create its own
     * transaction.
     */
    let result;

    await localSession.withTransaction(
      async () => {
        result =
          await executeAllocation();
      }
    );

    return result;

  } finally {
    /*
     * Never end a session owned by
     * the caller.
     */
    if (localSession) {
      await localSession.endSession();
    }
  }
};