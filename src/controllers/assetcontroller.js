// controllers/asset.controller.js

import Asset from "../model/assetModel.js";
import { uploadAssetFile, deleteFile } from "../services/imageStorageService.js";


// ✅ Create Asset (Upload + Save)
export const add_Asset = async (req, res) => {
  try {
    const { model, brand, category } = req.body;

    // 🔴 Validation
    if (!model || !category) {
      return res.status(400).json({
        success: false,
        message: "Model and Category are required"
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least 1 file is required"
      });
    }

    // ⚡ Upload all files in parallel
    const uploadedFiles = await Promise.all(
      req.files.map(file => uploadAssetFile(file))
    );

    // ✅ Save in DB
    const asset = await Asset.create({
      userId: req.user.id,   // from auth middleware
      model,
      brand,
      category,
      files: uploadedFiles
    });

    return res.status(201).json({
      success: true,
      message: "Asset created successfully",
      data: asset
    });

  } catch (error) {
    console.error("Create Asset Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// ✅ Get All Assets (for logged-in user)
export const getMyAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: assets
    });

  } catch (error) {
    console.error("Fetch Assets Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// ✅ Get Single Asset
export const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: asset
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// ✅ Delete Asset + Images
export const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    // 🔐 Optional: check ownership
    if (asset.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // 🗑️ Delete images from ImageKit
    await Promise.all(
      asset.files.map(file => deleteFile(file.fileId))
    );

    // 🗑️ Delete DB record
    await asset.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Asset deleted successfully"
    });

  } catch (error) {
    console.error("Delete Asset Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};