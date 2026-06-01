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
  console.log("Fetching enquired assets for user:", req.user.id);
  try {
    // ✅ Logged-in user id
    const userId = req.user.id;

    // ✅ Find only user's enquired assets
    const assets = await Asset.find({
      userId,
       equiryStatus:"true"
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
      "approvedButNotInApp",

    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be approved, rejected, pending or approvedButNotInApp",
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
        "approvedButNotInApp"
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Status must be approved, rejected, pending or approvedButNotInApp",
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



// =====================================
// DASHBOARD STATS API
// =====================================



export const getDashboardStats =async (req, res) => {
  const userId =req.user?._id;

    try {
       // approved count
      const approvedCount =
        await Asset.countDocuments({
          userId:userId,
          isapproved: "approved",
        });

      //rejected count

      const rejectedCount =
        await Asset.countDocuments({
          userId:userId,
          status: "rejected",
        });

      // =========================
      // COUNT PENDING
      // =========================

      const pendingCount =
        await Asset.countDocuments({
          userId:userId,
          isapproved:"pending",
        });

      
      // TOTAL ASSETS

      const totalAssets =
        await Asset.countDocuments({
          userId:userId,
        });


      return res.status(200).json({
        success: true,

        data: {

          approved:approvedCount,

          rejected:rejectedCount,

          pending:pendingCount,

          totalAssets:totalAssets,

          recentAssets: await Asset.find({userId:userId}).sort({createdAt:-1}).limit(5).select("files"),
        },
      });

    } catch (error) {

      console.log(
        "DASHBOARD STATS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch dashboard stats",
        error:
          error.message,
      });
    }
  };

//delete asset with delete request by admin



//for user
export const requestAssetDeletion = async (req, res) => {
  try {

    const { id } = req.params;

    // validate id

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset id",
      });
    }

    // find asset

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }


    if (
      asset.userId.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this asset",
      });
    }

    // not-parooved?? delete directly

    if (asset.isapproved !== "approved") {
      // deleting from imagekit

      if (asset.files?.length > 0) {
        for (const file of asset.files) {

          if (file.fileId) {
            await deleteAssetFile(file.fileId);
          }

        }

      }

      // dlete asset

      await Asset.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message:
          "Asset deleted successfully",
      });

    }

    // =========================================
    // APPROVED ASSET
    // SEND REQUEST TO ADMIN
    // =========================================

    // =========================
    // ALREADY REQUESTED
    // =========================

    if (asset.deleteRequest) {
      return res.status(400).json({
        success: false,
        message:
          "Delete request already sent to admin",
      });
    }

    // =========================
    // SEND REQUEST
    // =========================

    asset.deleteRequest = true;

    asset.deleteRequestAt = new Date();

    await asset.save();

    return res.status(200).json({
      success: true,
      message:
        "Request sent to Admin to delete asset",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to process asset deletion",
      error: error.message,
    });
  }
 };

 //for admin
 export const approveAssetDeletion = async (req, res) => {
  try {

    const { id } = req.params;
    console.log(req.user)

    // =========================
    // CHECK ADMIN
    // =========================

    if (req.user.type !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admin can delete assets",
      });
    }

    // =========================
    // VALIDATE ID
    // =========================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset id",
      });
    }

    // find asset

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    // imagekit deletion

    if (asset.files?.length > 0) {

      for (const file of asset.files) {

        if (file.fileId) {
          await deleteAssetFile(file.fileId);
        }

      }

    }

    // deleting the asset

    await Asset.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Asset deleted successfully by Admin",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete asset",
      error: error.message,
    });

  }
};

export const getDeleteRequests = async (req, res) => {
  try {
      console.log(req.user)
    if (req.user.type !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const requests = await Asset.find({
      deleteRequest: true,
    })
      .populate("userId", "name email")
      .sort({ deleteRequestAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch delete requests",
      error: error.message,
    });

  }
};