import mongoose from "mongoose";
import Asset from "../model/coAssetModel.js";

import Ownership from "../model/ownerShipModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";

export const createCoAsset = async (req, res) => {
  console.log(req.body);
  try {
    const {
      assetName,
      assetCode,
      description,
      assetCost,
      totalFractions,
      rentalAmountPerFraction,
      durationMonths,
      lockInMonths,
    } = req.body;

    const existingAsset = await Asset.findOne({ assetCode });

    if (existingAsset) {
      return res.status(400).json({
        success: false,
        message: "Asset code already exists",
      });
    }

    const amountPerFraction = assetCost / totalFractions;

    const asset = await Asset.create({
      assetName,
      assetCode,
      description,
      assetCost,
      totalFractions,
      availableFractions: totalFractions,
      amountPerFraction,
      rentalAmountPerFraction,
      durationMonths,
      lockInMonths,
      createdBy: req.user._id,
      status: "ACTIVE",
    });

    return res.status(201).json({
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

export const getCoAssets = async (req, res) => {
  try {
    const assets = await Asset.find({
      status: "ACTIVE",
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
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
    })
      .populate("assetId", "assetName assetCode")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const buyFractions = async (req, res) => {
  const session = await mongoose.startSession();
   console.log(req.user);
  try {
    session.startTransaction();

    const { assetId } = req.params;
    const { fractions } = req.body;

    const asset = await Asset.findById(assetId).session(session);

    if (!asset) {
      throw new Error("Asset not found");
    }

    if (fractions <= 0) {
      throw new Error("Invalid fraction count");
    }

    if (asset.availableFractions < fractions) {
      throw new Error("Not enough fractions available");
    }

    const totalAmount = fractions * asset.amountPerFraction;

    asset.availableFractions -= fractions;

    if (asset.availableFractions === 0) {
      asset.status = "SOLD_OUT";
    }

    await asset.save({ session });

    const ownership = await Ownership.findOne({
      assetId,
      userId: req.user._id,
    }).session(session);

    if (ownership) {
      ownership.fractionsOwned += fractions;

      ownership.investedAmount += totalAmount;

      ownership.averagePurchasePrice =
        ownership.investedAmount / ownership.fractionsOwned;

      await ownership.save({
        session,
      });
    } else {
      await Ownership.create(
        [
          {
            assetId,
            userId: req.user._id,
            fractionsOwned: fractions,
            investedAmount: totalAmount,
            averagePurchasePrice: asset.amountPerFraction,
          },
        ],
        { session },
      );
    }

    await PurchaseHistory.create(
      [
        {
          assetId,
          userId: req.user._id,
          fractionsPurchased: fractions,
          amountPerFraction: asset.amountPerFraction,
          totalAmount,
          paymentStatus: "SUCCESS",
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Fractions purchased successfully",
      totalAmount,
    });
  } catch (error) {
    await session.abortTransaction();

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};



//admin controller

export const getAssetInvestors = async (req, res) => {
  try {
    const investors = await Ownership.find({
      assetId: req.params.assetId,
    }).populate("userId", "name email phone");

    return res.status(200).json({
      success: true,
      count: investors.length,
      data: investors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
