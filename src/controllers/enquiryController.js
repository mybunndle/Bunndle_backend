import AssetEnquiry from "../model/assetEnquiryModel.js";
import Asset from "../model/assetModel.js";
import User from "../model/userModel.js";
import mongoose from "mongoose";

export const toggleEnquiry = async (req, res) => {
  try {
    const { assetId } = req.params;
    const userId = req.user._id;

    // Check if enquiry exists
    const existing = await AssetEnquiry.findOne({
      assetId,
      userId,
    });

    // Remove enquiry if it exists
    if (existing) {
      await AssetEnquiry.findOneAndDelete({
        assetId,
        userId,
      });

      return res.status(200).json({
        success: true,
        message: "Enquiry removed successfully",
      });
    }

    // Create enquiry
    const enquiry = await AssetEnquiry.create({
      assetId,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Enquiry added successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyEnquiredAssets = async (req, res) => {
  try {
    console.log("Fetching my enquired assets for user:", req.user._id);
    const userId = req.user._id;
    const enquiries = await AssetEnquiry.find({
      userId,
    })
      .populate("assetId")
      .sort({
        createdAt: -1,
      });

    const assets = enquiries.map((item) => item.assetId);

    return res.status(200).json({
      success: true,
      total: assets.length,
      data: assets,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllEnquiries = async (req, res) => {
  try {
    const assets = await Asset.find()

      .populate("userId", "name email phone")
      .sort({
        createdAt: -1,
      });

    const assetsWithEnquiries = await Promise.all(
      assets.map(async (asset) => {
        // get enquiries
        const enquiries = await AssetEnquiry.find({
          assetId: asset._id,
        })

          // enquiry user
          .populate("userId", "name email phone");

        return {
          assetId: asset._id,

          model: asset.model,

          brand: asset.brand,

          category: asset.category,

          purchaseYear: asset.purchaseYear,

          files: asset.files,

          assetOwner: asset.userId,

          totalEnquiries: enquiries.length,

          enquiries: enquiries.map((item) => ({
            enquiryId: item._id,

            user: item.userId,

            remarks: item.adminRemarks,
             

            createdAt: item.createdAt,
          })),
        };
      }),
    );

    // =========================
    // RESPONSE
    // =========================

    return res.status(200).json({
      success: true,

      totalAssets: assetsWithEnquiries.length,

      data: assetsWithEnquiries,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

export const getMyEnquiryAssetIds = async (req, res) => {
  const userId = req.user._id;
  const enquiries = await AssetEnquiry.find({
    userId,
  })
    .populate("assetId")
    .sort({
      createdAt: -1,
    });

  if (!enquiries) {
    return res.status(404).json({
      success: false,
      message: "No enquiries found",
    });
  }

  const assetIds = enquiries.map((item) => item.assetId._id);

  return res.status(200).json({
    success: true,
    total: enquiries.length,
    data: assetIds,
  });
};

// export const updateAdminRemark = async (req, res) => {
//   try {
//     const { enquiryId } = req.params;
//     const { adminRemarks } = req.body;
    
//     const adminId = req.user?._id || req.user?.id;
//     console.log("Adding admin remark for enquiry:", enquiryId, adminRemarks);
//     if (!adminId) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Unauthorized admin" });
//     }
//     if (!mongoose.Types.ObjectId.isValid(enquiryId)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid enquiry id" });
//     }
//     if (!adminRemarks || adminRemarks.trim() === "") {
//       return res
//         .status(400)
//         .json({ success: false, message: "Admin remark is required" });
//     }
//     if (adminRemarks.trim().length > 500) {
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: "Admin remark should not exceed 500 characters",
//         });
//     }
//     const updatedEnquiry = await AssetEnquiry.findByIdAndUpdate(
//       enquiryId,
//       {
//         $push: {
//           adminRemarks: {
//             remark: adminRemarks.trim(),
//             updatedBy: adminId,
            
//             updatedAt: new Date(),
//           },
//         },
//       },
//       { new: true, runValidators: true },
//     )
//       .populate("userId", "name email phone")
//       .populate("assetId", "assetName model brand category")
//       .populate("adminRemarks.updatedBy", "name email");
//     if (!updatedEnquiry) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Enquiry not found" });
//     }
//     return res
//       .status(200)
//       .json({
//         success: true,
//         message: "Admin remark added successfully",
//         data: updatedEnquiry,
//       });
//   } catch (error) {
//     console.log("Update admin remarks error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };





export const updateAdminRemark = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { adminRemarks } = req.body;

    const adminId = req.user?._id || req.user?.id;

    console.log("Adding admin remark for enquiry:", enquiryId, adminRemarks);

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized admin",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(enquiryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry id",
      });
    }

    if (!adminRemarks || adminRemarks.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Admin remark is required",
      });
    }

    if (adminRemarks.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "Admin remark should not exceed 500 characters",
      });
    }

    const admin = await User.findById(adminId).select("name email");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found",
      });
    }

    const updatedEnquiry = await AssetEnquiry.findByIdAndUpdate(
      enquiryId,
      {
        $push: {
          adminRemarks: {
            remark: adminRemarks.trim(),
            updatedBy: adminId,
            updatedByName: admin.name,
            updatedAt: new Date(),
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("userId", "name email phone")
      .populate("assetId", "assetName model brand category")
      .populate("adminRemarks.updatedBy", "name email");

    if (!updatedEnquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin remark added successfully",
      data: updatedEnquiry,
    });
  } catch (error) {
    console.log("Update admin remarks error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


