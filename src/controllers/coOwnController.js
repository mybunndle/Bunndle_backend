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
export const getCoAssets = async (req, res) => {
  try {
    const assets = await Asset.find({
      status: "ACTIVE",
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Co-Assets retrieved successfully",
      count: assets.length,
      data: assets,
    });
  } catch (error) {
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
export const getPurchaseHistory = async (req, res) => {
  try {
    const purchases = await PurchaseHistory.find({
      userId: req.user._id,
      paymentStatus: "SUCCESS",
    })
      .populate("assetId", "assetName assetCode images specification")
      .sort({
        createdAt: -1,
      })
      .lean();

    const formattedPurchases = purchases.map((purchase) => ({
      id: purchase._id,

      asset: purchase.assetId,

      fractionsPurchased: purchase.fractionsPurchased,

      amountPerFraction: purchase.amountPerFraction,

      totalAmount: purchase.totalAmount,

      paymentStatus: purchase.paymentStatus,

      purchaseDate: purchase.createdAt.toLocaleDateString("en-IN"),

      purchaseTime: purchase.createdAt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),

      createdAt: purchase.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: formattedPurchases.length,
      data: formattedPurchases,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyOwnerships = async (req, res) => {
  try {
    const userId = req.user.id;

    const ownerships = await Ownership.find({
      userId,
    })
      .populate({
        path: "assetId",
        select:
          "assetName assetCode images amountPerFraction totalFractions availableFractions status rentalAmountPerFraction assetCost specification durationMonths lockInMonths",
      })
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: ownerships.length,
      data: ownerships,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

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








export const getPurchaseHistoryByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

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

    const purchaseHistory = await PurchaseHistory.find({
      userId: userId,
    })
      .select(
        "userId assetId totalAmount createdAt paymentStatus fractionsPurchased razorpayOrderId razorpayPaymentId transactionReference"
      )
      .populate("userId", "name")
      .populate("assetId", "assetName model specification assetCode")
      .sort({ createdAt: -1 })
      .lean();

    const formattedHistory = await Promise.all(
      purchaseHistory.map(async (purchase) => {
        const paymentDateTime = new Date(purchase.createdAt);

        const paymentData = await paymentModel
          .findOne({
            userId: userId,
            $or: [
              { razorpayOrderId: purchase.razorpayOrderId },
              { razorpayPaymentId: purchase.razorpayPaymentId },
            ],
          })
          .select("razorpayOrderId razorpayPaymentId amount status createdAt")
          .lean();

        return {
          username: purchase.userId?.name || "N/A",

          assetName: purchase.assetId?.assetName || "N/A",

          model:
            purchase.assetId?.model ||
            purchase.assetId?.specification ||
            "N/A",

          orderId:
            paymentData?.razorpayOrderId ||
            purchase.razorpayOrderId ||
            "N/A",

          paymentDate: paymentDateTime.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          }),

          paymentTime: paymentDateTime.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          }),

          amount: purchase.totalAmount || paymentData?.amount || 0,

          fractionsPurchased: purchase.fractionsPurchased || 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "User purchase history fetched successfully",
      count: formattedHistory.length,
      data: formattedHistory,
    });
  } catch (error) {
    console.error("Admin Get User Purchase History Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};