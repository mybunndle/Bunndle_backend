import mongoose from "mongoose";

import Payment from "../model/PaymentModel.js";
import Order from "../model/OrderModel.js";
import Asset from "../model/coAssetModel.js";
import User from "../model/userModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";

import {
  allocateFractions,
} from "./ownerShipService.js";

const getIndianTime = () => {
  const istOffset =
    5.5 * 60 * 60 * 1000;

  return new Date(
    Date.now() + istOffset
  );
};


const generateTransactionReference =
  (purchaseId) => {
    const suffix =
      purchaseId
        .toString()
        .slice(-10)
        .toUpperCase();

    return `BND-TXN-${suffix}`;
  };


export const finalizeSuccessfulPayment =
  async ({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature = null,
    paymentMethod = null,
    webhookVerified = false,
  }) => {
    const session =
      await mongoose.startSession();

    let purchaseHistoryId =
      null;

    try {
      await session.withTransaction(
        async () => {
          // ==================================
          // 1. FIND PAYMENT
          // ==================================

          const payment =
            await Payment.findOne({
              razorpayOrderId,
            })
              .select(
                "+razorpaySignature"
              )
              .session(session);


          if (!payment) {
            const error =
              new Error(
                "Payment record not found"
              );

            error.statusCode = 404;

            throw error;
          }


          // ==================================
          // 2. IDEMPOTENCY
          // ==================================

          if (
            payment.status ===
              "SUCCESS" &&
            payment.purchaseHistoryId
          ) {
            if (
              razorpaySignature
            ) {
              payment.razorpaySignature =
                razorpaySignature;

              payment.signatureVerified =
                true;
            }

            if (
              paymentMethod
            ) {
              payment.paymentMethod =
                paymentMethod;
            }

            if (
              webhookVerified
            ) {
              payment.webhookVerified =
                true;
            }

            if (
              !payment.razorpayPaymentId
            ) {
              payment.razorpayPaymentId =
                razorpayPaymentId;
            }

            await payment.save({
              session,
            });

            purchaseHistoryId =
              payment.purchaseHistoryId;

            return;
          }


          // ==================================
          // 3. FIND ORDER
          // ==================================

          const order =
            await Order.findById(
              payment.orderId
            ).session(session);


          if (!order) {
            const error =
              new Error(
                "Order not found"
              );

            error.statusCode = 404;

            throw error;
          }


          if (
            order.status !==
            "PENDING_PAYMENT"
          ) {
            const error =
              new Error(
                `Order status is ${order.status}. Payment cannot be finalized.`
              );

            error.statusCode = 409;

            throw error;
          }


          // ==================================
          // 4. FIND USER + ASSET
          // ==================================

          const [
            user,
            asset,
          ] =
            await Promise.all([
              User.findById(
                order.userId
              ).session(session),

              Asset.findById(
                order.assetId
              ).session(session),
            ]);


          if (!user) {
            throw new Error(
              "User not found"
            );
          }


          if (!asset) {
            throw new Error(
              "Asset not found"
            );
          }


          // ==================================
          // 5. ALLOCATE OWNERSHIP
          // ==================================

          const ownershipResult =
            await allocateFractions({
              assetId:
                order.assetId,

              userId:
                order.userId,

              fractions:
                order.fractions,

              razorpayOrderId,

              razorpayPaymentId,

              session,
            });


          if (
            !ownershipResult?.ownership
          ) {
            throw new Error(
              "Unable to allocate ownership"
            );
          }


          // ==================================
          // 6. FINALIZE RESERVED FRACTIONS
          // ==================================

          /*
           * createOrder already did:
           *
           * availableFractions -= fractions
           * reservedFractions += fractions
           *
           * Successful payment therefore ONLY:
           *
           * reservedFractions -= fractions
           */

          const assetUpdate =
            await Asset.updateOne(
              {
                _id:
                  order.assetId,

                reservedFractions: {
                  $gte:
                    order.fractions,
                },
              },

              {
                $inc: {
                  reservedFractions:
                    -order.fractions,
                },
              },

              {
                session,
              }
            );


          if (
            assetUpdate.modifiedCount !==
            1
          ) {
            throw new Error(
              "Unable to finalize reserved fractions"
            );
          }


          // ==================================
          // 7. CHECK EXISTING PURCHASE
          // ==================================

          let purchase =
            await PurchaseHistory.findOne({
              orderId:
                order._id,
            }).session(session);


          // ==================================
          // 8. CREATE PURCHASE HISTORY
          // ==================================

          if (!purchase) {
            const totalMonthlyRental =
              Number(
                asset.rentalAmountPerFraction ||
                  0
              ) *
              Number(
                order.fractions
              );


            const createdPurchases =
              await PurchaseHistory.create(
                [
                  {
                    // THESE WERE MISSING
                    // IN YOUR OLD FLOW
                    orderId:
                      order._id,

                    paymentId:
                      payment._id,


                    assetId:
                      order.assetId,

                    userId:
                      order.userId,


                    // =======================
                    // PURCHASE DETAILS
                    // =======================

                    fractionsPurchased:
                      order.fractions,

                    amountPerFraction:
                      order.amountPerFraction,

                    totalAmount:
                      order.totalAmount,


                    // =======================
                    // USER SNAPSHOT
                    // =======================

                    userSnapshot: {
                      name:
                        user.name ||
                        user.fullName ||
                        null,

                      email:
                        user.email ||
                        null,

                      phone:
                        user.phone ||
                        user.mobile ||
                        null,
                    },


                    // =======================
                    // ASSET SNAPSHOT
                    // =======================

                    assetSnapshot: {
                      assetName:
                        asset.assetName ||
                        null,

                      assetCode:
                        asset.assetCode ||
                        null,

                      specification:
                        asset.specification ||
                        null,

                      assetCost:
                        asset.assetCost ??
                        null,

                      rentalAmountPerFraction:
                        asset.rentalAmountPerFraction ??
                        null,

                      totalMonthlyRental,

                      durationMonths:
                        asset.durationMonths ??
                        null,

                      lockInMonths:
                        asset.lockInMonths ??
                        null,
                    },


                    // =======================
                    // PAYMENT SNAPSHOT
                    // =======================

                    paymentStatus:
                      "SUCCESS",

                    razorpayOrderId,

                    razorpayPaymentId,

                    razorpaySignature,

                    paymentMethod,

                    currency:
                      "INR",

                    paidAt:
                      getIndianTime(),


                    // PDF later
                    documentGenerationStatus:
                      "NOT_STARTED",
                  },
                ],

                {
                  session,
                }
              );


            purchase =
              createdPurchases[0];


            purchase.transactionReference =
              generateTransactionReference(
                purchase._id
              );


            await purchase.save({
              session,
            });
          }


          // ==================================
          // 9. UPDATE PAYMENT
          // ==================================

          payment.razorpayPaymentId =
            razorpayPaymentId;


          if (
            razorpaySignature
          ) {
            payment.razorpaySignature =
              razorpaySignature;

            payment.signatureVerified =
              true;
          }


          if (
            paymentMethod
          ) {
            payment.paymentMethod =
              paymentMethod;
          }


          if (
            webhookVerified
          ) {
            payment.webhookVerified =
              true;
          }


          payment.status =
            "SUCCESS";


          payment.paidAt =
            payment.paidAt ||
            getIndianTime();


          payment.purchaseHistoryId =
            purchase._id;


          await payment.save({
            session,
          });


          // ==================================
          // 10. COMPLETE ORDER
          // ==================================

          order.status =
            "COMPLETED";


          await order.save({
            session,
          });


          purchaseHistoryId =
            purchase._id;
        }
      );


      return {
        success: true,

        purchaseHistoryId,
      };

    } catch (error) {

      /*
       * Protection for simultaneous
       * Flutter verify + webhook execution.
       */
      if (
        error?.code === 11000
      ) {
        const existingPurchase =
          await PurchaseHistory.findOne({
            razorpayPaymentId,
          });

        if (
          existingPurchase
        ) {
          return {
            success: true,

            purchaseHistoryId:
              existingPurchase._id,
          };
        }
      }

      throw error;

    } finally {
      await session.endSession();
    }
  };