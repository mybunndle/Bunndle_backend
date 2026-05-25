// controllers/asset.controller.js
import Asset from "../model/assetModel.js";
import { uploadAssetFile, deleteAssetFile } from "../services/imageStorageService.js";
import mongoose from "mongoose";


// ✅ Create Asset (Upload + Save)
// export const add_Asset = async (req, res) => {
//   try {
//     const { model, brand, category, purchaseYear, price } = req.body;
    

//     // 🔴 Validation
//     if (!model || !category || !purchaseYear) {
//       return res.status(400).json({
//         success: false,
//         message: "Model, Category, and Purchase Year are required"
//       });
//     }

//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "At least 1 file is required"
//       });
//     }

//     // ⚡ Upload all files in parallel
//     const uploadedFiles = await Promise.all(
//       req.files.map(file => uploadAssetFile(file))
//     );

//     // ✅ Save in DB
//     const asset = await Asset.create({
//       userId: req.user.id,   // from auth middleware
//       model,
//       brand,
//       category,
//       price,
//       purchaseYear,
//       files: uploadedFiles
//     });
//     return res.status(201).json({
//       success: true,
//       message: "Asset created successfully",
//       data: asset
//     });

//   } catch (error) {
//     console.error("Create Asset Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


export const add_Asset = async (req, res) => {
  try {
    const {
      model,
      brand,
      category,
      subCategory,
      assetName,
      purchaseYear,
      price,
    } = req.body;
    
     const user = req.user; 
    
    if (!user.isKycVerified) {
      return res.status(403).json({
        success: false,
        message: "Only verified users can add assets"
      });
    }

    // 🔴 Required field validation
    if (!model || !category || !purchaseYear) {
      return res.status(400).json({
        success: false,
        message: "Model, Category, and Purchase Year are required",
      });
    }

    // 🔴 File validation
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least 1 file is required",
      });
    }

    // ⚡ Upload all files in parallel
    const uploadedFiles = await Promise.all(
      req.files.map((file) => uploadAssetFile(file))
    );

    // ✅ Create asset object
    const assetData = {
      userId: req.user.id,
      model,
      brand,
      category,
      purchaseYear,
      price,
      files: uploadedFiles,
    };

    // ✅ Add optional fields only if provided
    if (assetName) {
      assetData.assetName = assetName;
    }

    if (subCategory) {
      assetData.subCategory = subCategory;
    }

    // ✅ Save in DB
    const asset = await Asset.create(assetData);

    return res.status(201).json({
      success: true,
      message: "Asset created successfully",
      data: asset,
    });
  } catch (error) {
    console.error("Create Asset Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
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
      count: assets.length,
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
      asset.files.map(file => deleteAssetFile(file.fileId))
    );

    // 🗑️ Delete DB record
    await asset.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Asset deleted successfully"
    });

  }catch (error) {
    console.error("Delete Asset Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAssetsByCategory = async (req, res) => {

  try {
    const { category } = req.params;
    
    // ✅ Find only approved assets
    const assets = await Asset.find({
      category,
      isapproved:"approved"
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assets.length,
      data: assets
    });

  } catch (error) {
    console.error("Get Assets Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAssetsByCategoryAndSubCategory = async (req, res) => {
  try {
    const { category, subCategory } = req.params;

    // ✅ Find approved assets by category + subCategory
    const assets = await Asset.find({
      category: {
        $regex: new RegExp(category, "i"),
      },
      subCategory: {
        $regex: new RegExp(subCategory, "i"),
      },
      isapproved: "approved",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assets.length,
      data: assets,
    });

  } catch (error) {
    console.error("Get Assets Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




export const toggleEnquiryStatus = async (req, res) => {
  try {

    const { id } = req.params;
    
    const user = req.user; 
    
    if (!user.isKycVerified) {
      return res.status(403).json({
        success: false,
        message: "Only verified users can add assets"
      });
    }

    // ✅ Find asset
    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    // ✅ Toggle status
    asset.equiryStatus =
      asset.equiryStatus === "true"
        ? "false"
        : "true";

    await asset.save();

    return res.status(200).json({
      success: true,
      message: "Enquiry status toggled successfully",
      data: asset
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMyEnquiredAssets = async (req, res) => {
  try {
    // ✅ Logged-in user id
    const userId = req.user.id;

    // ✅ Find only user's enquired assets
    const assets = await Asset.find({
      userId,
      equiryStatus: "true"
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: assets.length,
      data: assets
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




export const getAllAssetsForAdmin = async (req, res) => {
  try {
    const { status } = req.query;

    // ✅ Build filter object
    const filter = {};

    // Optional status filter
    if (status) {
      filter.isapproved = status;
    }

    // ✅ Latest assets first
    const assets = await Asset.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assets.length,
      data: assets,
    });

  } catch (error) {
    console.error("Get Admin Assets Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





export const updateAssetApprovalStatus = async (req, res) => {
  try {
    const { id: assetId } = req.params;
    const { status } = req.body;

    // ✅ Validate Mongo ID
    if (!mongoose.isValidObjectId(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Asset ID",
      });
    }

    // ✅ Allowed statuses
    const validStatuses = [
      "approved",
      "rejected",
      "pending",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be approved, rejected or pending",
      });
    }

    // ✅ Find asset
    const asset = await Asset.findById(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    // ✅ Update
    asset.isapproved = status;

    await asset.save();

    return res.status(200).json({
      success: true,
      message: `Asset ${status} successfully`,
      data: asset,
    });

  } catch (error) {
    console.error("Update Asset Status Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// export const updateAssetApprovalStatus = async (req, res) => {
//   try {
//     const { assetId } = req.params;
//     const { status } = req.body;

//     // ✅ Validate ObjectId
//     if (!mongoose.Types.ObjectId.isValid(assetId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Asset ID",
//       });
//     }

//     // ✅ Allowed statuses
//     const validStatuses = [
//       "approved",
//       "rejected",
//       "pending",
//     ];

//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Status must be approved, rejected or pending",
//       });
//     }

//     // ✅ Find asset
//     const asset = await Asset.findById(assetId);

//     if (!asset) {
//       return res.status(404).json({
//         success: false,
//         message: "Asset not found",
//       });
//     }

//     // ✅ Update status
//     asset.isapproved = status;

//     await asset.save();

//     return res.status(200).json({
//       success: true,
//       message: `Asset ${status} successfully`,
//       data: asset,
//     });

//   } catch (error) {
//     console.error("Update Status Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };





export const updateAssetStatusAndPrice = async (req, res) => {
  try {
    const { id: assetId } = req.params;
    const { status, price } = req.body;

    // ✅ Validate Mongo ID
    if (!mongoose.isValidObjectId(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Asset ID",
      });
    }

    // ✅ Find asset
    const asset = await Asset.findById(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    // ✅ Update Status (optional)
    if (status !== undefined) {
      const validStatuses = [
        "approved",
        "rejected",
        "pending",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Status must be approved, rejected or pending",
        });
      }

      asset.isapproved = status;
    }

    // ✅ Update Price (optional)
    if (price !== undefined) {

      if (price < 0) {
        return res.status(400).json({
          success: false,
          message: "Price cannot be negative",
        });
      }

      asset.price = price;
    }

    // ✅ Save changes
    await asset.save();

    return res.status(200).json({
      success: true,
      message: "Asset updated successfully",
      data: asset,
    });

  } catch (error) {
    console.error("Update Asset Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};