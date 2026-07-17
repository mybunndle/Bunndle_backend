
import WebAsset from "../model/web_asset_model.js";
import {
  uploadAssetFile,
  deleteAssetFile,
} from "../services/imageStorageService.js";

export const addWebAsset = async (req, res) => {
  let uploadedFiles = [];

  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    const {
      model,
      brand,
      price,
      assetName,
      category,
      subCategory,
      purchaseYear,
    } = req.body;

   
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one asset image is required.",
      });
    }

    uploadedFiles = await Promise.all(
      req.files.map((file) => uploadAssetFile(file))
    );

    const asset = await WebAsset.create({
      userId,
      model,
      brand,
      price,
      assetName,
      category,
      subCategory,
      purchaseYear,
      files: uploadedFiles,
    });

    return res.status(201).json({
      success: true,
      message: "Web asset added successfully.",
      data: asset,
    });
  } catch (error) {
    console.error("ADD WEB ASSET ERROR:", error);

    if (uploadedFiles.length > 0) {
      await Promise.allSettled(
        uploadedFiles.map((file) => deleteAssetFile(file.fileId))
      );
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to add web asset.",
    });
  }
};

export const getAllWebAssets = async (req, res) => {
  try {
    const assets = await WebAsset.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Web assets fetched successfully.",
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    console.error("GET ALL WEB ASSETS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to fetch web assets.",
    });
  }
};