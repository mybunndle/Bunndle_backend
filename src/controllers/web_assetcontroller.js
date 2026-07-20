
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



export const updateWebAsset = async (req, res) => {
      let uploadedFiles = [];

      try  {
        const assetId = req.params.id;
        const userId = req.user?._id || req.user?.id;
        console.log("User ID:", userId);

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized user.",
          });
        }

        console.log("Asset ID:", assetId);
        const asset = await WebAsset.findById({ _id: assetId});

        if (!asset) {
          return res.status(404).json({
            success: false,
            message: "Web asset not found.",
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


        const updatedData = {};

          if (model !== undefined) updatedData.model = model;
          if (brand !== undefined) updatedData.brand = brand;
          if (price !== undefined) updatedData.price = price;
          if (assetName !== undefined) updatedData.assetName = assetName;
          if (category !== undefined) updatedData.category = category;
          if (subCategory !== undefined) updatedData.subCategory = subCategory;
          if (purchaseYear !== undefined) updatedData.purchaseYear = purchaseYear;

          if(req.files && req.files.length > 0) {
            uploadedFiles = await Promise.all(
              req.files.map((file) => uploadAssetFile(file))
            );

            if(asset.files && asset.files.length > 0) {
              await Promise.allSettled(
                asset.files.map((file) => deleteAssetFile(file.fileId))
              );
            }
            updatedData.files = uploadedFiles;
          }
          console.log("Updated Data:", updatedData);
        
          const updatedAsset = await WebAsset.findOneAndUpdate(
            { _id: assetId },
            { $set: updatedData },
            { new: true , runValidators: true}
          );
          console.log("Updated Asset in db:", updatedAsset);

          return res.status(200).json({
            success: true,
            message: "Web asset updated successfully.",
            data: updatedAsset,
          });
      } catch (error) {
        console.error("UPDATE WEB ASSET ERROR:", error);

        if (uploadedFiles.length > 0) {
          await Promise.allSettled(
            uploadedFiles.map((file) => deleteAssetFile(file.fileId))
          );
        }

        return res.status(500).json({
          success: false,
          message: error.message || "Unable to update web asset.",
          });
      }
}

export const deleteWebAsset = async (req,res) => {
  try {
    const assetId = req.params.id;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    const asset = await WebAsset.findOne({ _id: assetId});

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Web asset not found.",
      });
    }

    if (asset.files && asset.files.length > 0) {
      await Promise.allSettled(
        asset.files.map((file) => deleteAssetFile(file.fileId))
      );
    }

    await WebAsset.findByIdAndDelete(assetId);

    return res.status(200).json({
      success: true,
      message: "Web asset deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE WEB ASSET ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to delete web asset.",
    });
  }
}