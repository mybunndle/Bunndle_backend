import mongoose from "mongoose";
import Asset from "../model/coAssetModel.js";
import {
  uploadCoAssetFile,
  deleteCoAssetFile,
} from "../services/imageStorageService.js";

import Ownership from "../model/ownerShipModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";
import paymentModel from "../model/PaymentModel.js";

export const createCoAsset = async (req, res) => {
  console.log("BODY =>", req.body);
  console.log("FILES =>", req.files);
  try {
    const {
      assetName,
      assetCode,
      description,
      specification,
      assetCost,
      totalFractions,
      rentalAmountPerFraction,
      durationMonths,
      lockInMonths,
    } = req.body;

    const existingAsset = await Asset.findOne({
      assetCode,
    });

    if (existingAsset) {
      return res.status(400).json({
        success: false,
        message: "Asset code already exists",
      });
    }

    if (!assetName || !assetCode || !assetCost || !totalFractions) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    if (Number(totalFractions) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fraction count",
      });
    }

    // Upload Images To ImageKit
    const images = [];

    if (req.files?.length) {
      for (const file of req.files) {
        const uploadedFile = await uploadCoAssetFile(file);

        images.push({
          url: uploadedFile.url,
          fileId: uploadedFile.fileId,
          filename: uploadedFile.filename,
        });
      }
    }

    const amountPerFraction = Math.ceil(
      Number(assetCost) / Number(totalFractions),
    );

    const asset = await Asset.create({
      assetName,
      assetCode,
      description,
      specification,
      assetCost: Number(assetCost),

      totalFractions: Number(totalFractions),

      availableFractions: Number(totalFractions),

      amountPerFraction,

      rentalAmountPerFraction: Number(rentalAmountPerFraction),

      durationMonths: Number(durationMonths),

      lockInMonths: Number(lockInMonths),

      images,

      createdBy: req.user._id,

      status: "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Co-Asset created successfully",
      data: asset,
    });
  } catch (error) {
    console.error("Create Co Asset Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// export const getCoAssets = async (req, res) => {
//   try {
//     const assets = await Asset.find({
//       status: "ACTIVE",
//     }).sort({
//        amountPerFraction: 1,
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Co-Assets retrieved successfully",
//       count: assets.length,
//       data: assets,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const getCoAssets = async (req, res) => {
  try {
    const assets = await Asset.find({
      status: "ACTIVE",
    })
      .sort({
        amountPerFraction: 1,
      })
      .lean();

    const updatedAssets = assets.map((asset) => {
      // Maximum 80% users ke liye
      const publicLimit = Math.floor(
        asset.totalFractions * 0.8
      );

      // Already sold/reserved fractions
      const usedFractions =
        asset.totalFractions -
        asset.availableFractions;

      // Actual fractions jo abhi users buy kar sakte hain
      const publicAvailableFractions = Math.max(
        0,
        publicLimit - usedFractions
      );

      return {
        ...asset,

        // Original DB value ko response me replace kar rahe hain
        availableFractions:
          publicAvailableFractions,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Co-Assets retrieved successfully",
      count: updatedAssets.length,
      data: updatedAssets,
    });
  } catch (error) {
    console.error("Get Co-Assets Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getCoAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// export const getPurchaseHistory = async (req, res) => {
//   try {
//     const purchases = await PurchaseHistory.find({
//       userId: req.user._id,
//       paymentStatus: "SUCCESS",
//     })
//       .populate("assetId", "assetName assetCode images specification amountPerFraction documents.url")
//       .sort({
//         createdAt: -1,
//       })
//       .lean();

//     const formattedPurchases = purchases.map((purchase) => ({
//       id: purchase._id,

//       asset: purchase.assetId,

//       fractionsPurchased: purchase.fractionsPurchased,

//       amountPerFraction: purchase.amountPerFraction,

//       totalAmount: purchase.totalAmount,
      
//       paymentStatus: purchase.paymentStatus,

//       purchaseDate: purchase.createdAt.toLocaleDateString("en-IN"),


//       purchaseTime: purchase.createdAt.toLocaleTimeString("en-IN", {
//         hour: "2-digit",
//         minute: "2-digit",
//       }),

//       createdAt: purchase.createdAt,
//     }));

//     return res.status(200).json({
//       success: true,
//       count: formattedPurchases.length,
//       data: formattedPurchases,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export const getMyOwnerships = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const ownerships = await Ownership.find({
//       userId,
//     })
//       .populate({
//         path: "assetId",
//         select:
//           "assetName assetCode images amountPerFraction totalFractions availableFractions status rentalAmountPerFraction assetCost specification durationMonths lockInMonths",
//       })
//       .sort({
//         createdAt: -1,
//       });

//     return res.status(200).json({
//       success: true,
//       count: ownerships.length,
//       data: ownerships,
//     });
//   } catch (error) {
//     console.log(error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


//admin controller

// export const getAssetInvestors = async (req, res) => {
//   console.log("Asset ID:", req.params.assetId);
//   try {
//     const investors = await Ownership.find({
//       assetId: req.params.assetId,
//     }).populate("userId", "name email phone fractionsOwned totalFractions rentalAmountPerFraction");

//     return res.status(200).json({
//       success: true,
//       count: investors.length,
//       data: investors,

//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


export const getPurchaseHistory = async (req, res) => {
  try {
    const purchases = await PurchaseHistory.find({
      userId: req.user._id,
      paymentStatus: "SUCCESS",
    })
      .populate(
        "assetId",
        "assetName assetCode images specification amountPerFraction"
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    const formattedPurchases = purchases.map((purchase) => ({
      id: purchase._id,

      asset: purchase.assetId,

      fractionsPurchased:
        purchase.fractionsPurchased,

      amountPerFraction:
        purchase.amountPerFraction,

      totalAmount:
        purchase.totalAmount,

      paymentStatus:
        purchase.paymentStatus,

      purchaseDate:
        new Date(
          purchase.createdAt
        ).toLocaleDateString(
          "en-IN",
          {
            timeZone:
              "Asia/Kolkata",
          }
        ),

      purchaseTime:
        new Date(
          purchase.createdAt
        ).toLocaleTimeString(
          "en-IN",
          {
            hour:
              "2-digit",

            minute:
              "2-digit",

            hour12:
              true,

            timeZone:
              "Asia/Kolkata",
          }
        ),

      // =====================================================
      // DOCUMENT URLS
      // =====================================================

      agreementUrl:
        purchase.documents
          ?.digitalAgreement
          ?.url ||
        null,

      paymentReceiptUrl:
        purchase.documents
          ?.paymentReceipt
          ?.url ||
        null,

      createdAt:
        purchase.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count:
        formattedPurchases.length,
      data:
        formattedPurchases,
    });

  } catch (error) {
    console.error(
      "Get Purchase History Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};


export const getMyOwnerships = async (req, res) => {
  try {
    const userId =
      req.user._id ||
      req.user.id;

    // ========================================================
    // GET USER OWNERSHIPS
    // ========================================================

    const ownerships =
      await Ownership.find({
        userId,
      })
        .populate({
          path:
            "assetId",

          select:
            "assetName assetCode images amountPerFraction totalFractions availableFractions status rentalAmountPerFraction assetCost specification durationMonths lockInMonths",
        })
        .sort({
          createdAt: -1,
        })
        .lean();


    if (
      ownerships.length === 0
    ) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }


    // ========================================================
    // COLLECT ASSET IDS
    // ========================================================

    const assetIds =
      ownerships
        .map(
          (ownership) =>
            ownership
              .assetId
              ?._id
        )
        .filter(Boolean);


    // ========================================================
    // GET PURCHASE HISTORIES IN ONE QUERY
    //
    // Avoids N+1 queries.
    // ========================================================

    const purchases =
      await PurchaseHistory.find({
        userId,

        assetId: {
          $in:
            assetIds,
        },

        paymentStatus:
          "SUCCESS",
      })
        .select(
          `
          assetId
          documents.digitalAgreement.url
          documents.paymentReceipt.url
          createdAt
          `
        )
        .sort({
          createdAt: -1,
        })
        .lean();


    // ========================================================
    // MAP PURCHASE BY ASSET
    //
    // Since purchases are sorted newest first,
    // the first purchase found for an asset is used.
    // ========================================================

    const purchaseMap =
      new Map();


    for (
      const purchase
      of purchases
    ) {
      const assetId =
        purchase.assetId
          ?.toString();


      if (
        assetId &&
        !purchaseMap.has(
          assetId
        )
      ) {
        purchaseMap.set(
          assetId,
          purchase
        );
      }
    }


    // ========================================================
    // FORMAT OWNERSHIPS
    // ========================================================

    const formattedOwnerships =
      ownerships.map(
        (ownership) => {
          const assetId =
            ownership
              .assetId
              ?._id
              ?.toString();


          const purchase =
            assetId
              ? purchaseMap.get(
                  assetId
                )
              : null;


          return {
            ...ownership,

            agreementUrl:
              purchase
                ?.documents
                ?.digitalAgreement
                ?.url ||
              null,

            paymentReceiptUrl:
              purchase
                ?.documents
                ?.paymentReceipt
                ?.url ||
              null,
          };
        }
      );


    return res.status(200).json({
      success: true,

      count:
        formattedOwnerships.length,

      data:
        formattedOwnerships,
    });

  } catch (error) {
    console.error(
      "Get My Ownerships Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};


export const getAssetInvestors = async (req, res) => {
  try {
    const { assetId } = req.params;

    

    if (!assetId) {
      return res.status(400).json({
        success: false,
        message: "Asset ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID",
      });
    }

    const asset = await Asset.findById(assetId).lean();

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const rentalAmountPerFraction = Number(asset.rentalAmountPerFraction || 0);

    const investors = await Ownership.find({
      assetId: assetId,
    })
      .populate("userId", "name email phone")
      .lean();

    const investorsWithRentalAmount = investors.map((investor) => {
      const fractionsOwned = Number(investor.fractionsOwned || 0);

      const rentalAmountPerMonth =
        fractionsOwned * rentalAmountPerFraction;

      return {
        ...investor,
        rentalAmountPerMonth,
      };
    });

    return res.status(200).json({
      success: true,
      count: investorsWithRentalAmount.length,
      data: investorsWithRentalAmount,
    });
  } catch (error) {
    console.error("Get Asset Investors Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const delete_co_own = async (req, res) => {
  try {
    const asset_id = req.params.id;

    // validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(asset_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset id",
      });
    }

    // check asset exists or not
    const asset = await Asset.findById(asset_id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    // check if any ownership exists for this asset
    const ownership = await Ownership.findOne({
      assetId: asset_id,
    });

    if (ownership) {
      return res.status(403).json({
        success: false,
        message: "This asset has owners, so admin cannot delete it",
      });
    }

    // delete asset only if no ownership exists
    await Asset.findByIdAndDelete(asset_id);

    return res.status(200).json({
      success: true,
      message: "Asset deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// export const getPurchaseHistoryByUserId = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "User ID is required",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid user ID",
//       });
//     }

//     const purchaseHistory = await PurchaseHistory.find({
//       userId: userId,
//     })
//       .select(
//         "userId assetId totalAmount createdAt paymentStatus fractionsPurchased razorpayOrderId razorpayPaymentId  transactionReference"
//       )
//       .populate("userId", "name")
//       .populate("assetId", "assetName assetCode model specification assetCode documents.url")
//       .sort({ createdAt: -1 })
//       .lean();

//     const formattedHistory = await Promise.all(
//       purchaseHistory.map(async (purchase) => {
//         const paymentDateTime = new Date(purchase.createdAt);

//         const paymentData = await paymentModel
//           .findOne({
//             userId: userId,
//             $or: [
//               { razorpayOrderId: purchase.razorpayOrderId },
//               { razorpayPaymentId: purchase.razorpayPaymentId },
//             ],
//           })
//           .select("razorpayOrderId  razorpayPaymentId amount status createdAt")
//           .lean();

//         return {
//           username: purchase.userId?.name || "N/A",

//           assetName: purchase.assetId?.assetName || "N/A",

//           model:
//             purchase.assetId?.model ||
//             purchase.assetId?.specification ||
//             "N/A",

//           orderId:
//             paymentData?.razorpayOrderId ||
//             purchase.razorpayOrderId ||
//             "N/A",

//           paymentDate: paymentDateTime.toLocaleDateString("en-IN", {
//             day: "2-digit",
//             month: "short",
//             year: "numeric",
//             timeZone: "Asia/Kolkata",
//           }),

//           paymentTime: paymentDateTime.toLocaleTimeString("en-IN", {
//             hour: "2-digit",
//             minute: "2-digit",
//             hour12: true,
//             timeZone: "Asia/Kolkata",
//           }),

//           amount: purchase.totalAmount || paymentData?.amount || 0,

//           fractionsPurchased: purchase.fractionsPurchased || 0,
//         };
//       })
//     );

//     return res.status(200).json({
//       success: true,
//       message: "User purchase history fetched successfully",
//       count: formattedHistory.length,
//       data: formattedHistory,
//     });
//   } catch (error) {
//     console.error("Admin Get User Purchase History Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



// export const getPurchaseHistoryByUserId = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "User ID is required",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid user ID",
//       });
//     }

//     const purchaseHistory = await PurchaseHistory.find({
//       userId: userId,
//     })
//       .select(
//         `
//         userId
//         assetId
//         totalAmount
//         createdAt
//         paymentStatus
//         fractionsPurchased
//         razorpayOrderId
//         razorpayPaymentId
//         transactionReference
//         documents.digitalAgreement.url
//         documents.paymentReceipt.url
//         `
//       )
//       .populate(
//         "userId",
//         "name"
//       )
//       .populate(
//         "assetId",
//         "assetName assetCode model specification"
//       )
//       .sort({
//         createdAt: -1,
//       })
//       .lean();

//     const formattedHistory = await Promise.all(
//       purchaseHistory.map(async (purchase) => {
//         const paymentDateTime =
//           new Date(purchase.createdAt);

//         const paymentData =
//           await paymentModel
//             .findOne({
//               userId: userId,

//               $or: [
//                 {
//                   razorpayOrderId:
//                     purchase.razorpayOrderId,
//                 },
//                 {
//                   razorpayPaymentId:
//                     purchase.razorpayPaymentId,
//                 },
//               ],
//             })
//             .select(
//               `
//               razorpayOrderId
//               razorpayPaymentId
//               amount
//               status
//               createdAt
//               `
//             )
//             .lean();

//         return {
//           username:
//             purchase.userId?.name ||
//             "N/A",

//           assetName:
//             purchase.assetId?.assetName ||
//             "N/A",

//           assetCode:
//             purchase.assetId?.assetCode ||
//             "N/A",

//           model:
//             purchase.assetId?.model ||
//             purchase.assetId?.specification ||
//             "N/A",

//           orderId:
//             paymentData?.razorpayOrderId ||
//             purchase.razorpayOrderId ||
//             "N/A",

//           paymentDate:
//             paymentDateTime.toLocaleDateString(
//               "en-IN",
//               {
//                 day: "2-digit",
//                 month: "short",
//                 year: "numeric",
//                 timeZone: "Asia/Kolkata",
//               }
//             ),

//           paymentTime:
//             paymentDateTime.toLocaleTimeString(
//               "en-IN",
//               {
//                 hour: "2-digit",
//                 minute: "2-digit",
//                 hour12: true,
//                 timeZone: "Asia/Kolkata",
//               }
//             ),

//           amount:
//             purchase.totalAmount ||
//             paymentData?.amount ||
//             0,

//           fractionsPurchased:
//             purchase.fractionsPurchased ||
//             0,

//           // Agreement PDF URL
//           agreementUrl:
//             purchase.documents
//               ?.digitalAgreement
//               ?.url ||
//             null,

//           // Payment Receipt PDF URL
//           paymentReceiptUrl:
//             purchase.documents
//               ?.paymentReceipt
//               ?.url ||
//             null,
//         };
//       })
//     );

//     return res.status(200).json({
//       success: true,
//       message:
//         "User purchase history fetched successfully",
//       count:
//         formattedHistory.length,
//       data:
//         formattedHistory,
//     });
//   } catch (error) {
//     console.error(
//       "Admin Get User Purchase History Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };




export const getPurchaseHistoryByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // =========================================================
    // VALIDATE USER ID
    // =========================================================

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // =========================================================
    // FETCH PURCHASE HISTORY
    // =========================================================

    const purchaseHistory = await PurchaseHistory.find({
      userId: userId,
    })
      .select(
        `
        userId
        assetId
        totalAmount
        createdAt
        paidAt
        paymentStatus
        fractionsPurchased
        razorpayOrderId
        razorpayPaymentId
        transactionReference
        documents.digitalAgreement.url
        documents.paymentReceipt.url
        `
      )
      .populate(
        "userId",
        "name"
      )
      .populate(
        "assetId",
        "assetName assetCode model specification"
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    // =========================================================
    // FORMAT RESPONSE
    // =========================================================

    const formattedHistory = await Promise.all(
      purchaseHistory.map(async (purchase) => {

        // =====================================================
        // PAYMENT / PURCHASE DATE TIME
        //
        // First preference:
        // PurchaseHistory.paidAt
        //
        // Fallback:
        // createdAt
        // =====================================================

        const purchaseDateSource =
          purchase.paidAt ||
          purchase.createdAt;

        const paymentDateTime =
          purchaseDateSource
            ? new Date(purchaseDateSource)
            : null;

        // =====================================================
        // FETCH PAYMENT DATA
        // =====================================================

        const paymentData =
          await paymentModel
            .findOne({
              userId: userId,

              $or: [
                {
                  razorpayOrderId:
                    purchase.razorpayOrderId,
                },
                {
                  razorpayPaymentId:
                    purchase.razorpayPaymentId,
                },
              ],
            })
            .select(
              `
              razorpayOrderId
              razorpayPaymentId
              amount
              status
              createdAt
              `
            )
            .lean();

        // =====================================================
        // INDIAN DATE
        // =====================================================

        const paymentDate =
          paymentDateTime
            ? new Intl.DateTimeFormat(
                "en-IN",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  timeZone: "Asia/Kolkata",
                }
              ).format(paymentDateTime)
            : null;

        // =====================================================
        // INDIAN TIME
        // =====================================================

        const paymentTime =
          paymentDateTime
            ? new Intl.DateTimeFormat(
                "en-IN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "Asia/Kolkata",
                }
              )
                .format(paymentDateTime)
                .toLowerCase()
            : null;

        // =====================================================
        // RESPONSE ITEM
        // =====================================================

        return {
          username:
            purchase.userId?.name ||
            "N/A",

          assetName:
            purchase.assetId?.assetName ||
            "N/A",

          assetCode:
            purchase.assetId?.assetCode ||
            "N/A",

          model:
            purchase.assetId?.model ||
            purchase.assetId?.specification ||
            "N/A",

          orderId:
            paymentData?.razorpayOrderId ||
            purchase.razorpayOrderId ||
            "N/A",

          paymentDate,

          paymentTime,

          amount:
            purchase.totalAmount ||
            paymentData?.amount ||
            0,

          fractionsPurchased:
            purchase.fractionsPurchased ||
            0,

          paymentStatus:
            purchase.paymentStatus ||
            paymentData?.status ||
            "N/A",

          transactionReference:
            purchase.transactionReference ||
            null,

          // ===============================================
          // AGREEMENT PDF URL
          // ===============================================

          agreementUrl:
            purchase.documents
              ?.digitalAgreement
              ?.url ||
            null,

          // ===============================================
          // PAYMENT RECEIPT PDF URL
          // ===============================================

          paymentReceiptUrl:
            purchase.documents
              ?.paymentReceipt
              ?.url ||
            null,
        };
      })
    );

    // =========================================================
    // SUCCESS RESPONSE
    // =========================================================

    return res.status(200).json({
      success: true,

      message:
        "User purchase history fetched successfully",

      count:
        formattedHistory.length,

      data:
        formattedHistory,
    });

  } catch (error) {
    console.error(
      "Admin Get User Purchase History Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Unable to fetch purchase history",
    });
  }
};