import express from "express";
import authMiddleware from "../middleware/auth_validate.js";
import adminAuthMiddleware from "../middleware/admin_validate.js";
import { uploadAssetImages }  from "../middleware/upload.js";
import  {add_Asset, deleteAsset, getAssetById, getMyAssets, getAssetsByCategory, toggleEnquiryStatus, getAllAssetsForAdmin, getMyEnquiredAssets,getAssetsByCategoryAndSubCategory ,updateAssetApprovalStatus,updateAssetStatusAndPrice,getDashboardStats, approveAssetDeletion, getDeleteRequests, requestAssetDeletion, getAssets, getApprovedAssets}  from "../controllers/assetcontroller.js";

const router = express.Router();


router.post(
  "/add_asset",
  authMiddleware,
  uploadAssetImages.array("files", 5), // ✅ multiple files
  add_Asset
);
router.get("/my_assets", authMiddleware, getMyAssets);

router.get("/assets/:id", authMiddleware, getAssetById);

router.get("/get_all_assets", getAssets);  //for admin
router.get("/get_all_app_assets", getApprovedAssets);  //for user


//router.put("/update_asset/:id", authMiddleware, updateAsset);

router.delete("/delete_asset/:id", authMiddleware, deleteAsset);
router.get("/all_assets/explore/:category", getAssetsByCategory);

router.get("/all_assets/explore_sub/:category/:subCategory",getAssetsByCategoryAndSubCategory);

//toggle enquiry status for an asset (enquired/not enquired)

router.patch("/enquiry-status/:id", authMiddleware, toggleEnquiryStatus);

//for user which has been enquired
router.get("/user-enquiries", authMiddleware, getMyEnquiredAssets);

//for admin to see all enquired assets
router.get("/all_enquiry_admin", adminAuthMiddleware, getAllAssetsForAdmin);

//for admin approval of assets


router.put("/approve-asset/:id", authMiddleware, updateAssetApprovalStatus);
router.put("/update-asset/:id",adminAuthMiddleware,updateAssetStatusAndPrice);
router.get("/dashboard-stats", authMiddleware, getDashboardStats);

//user delete request for asset deletion
router.post("/request-delete/:id", authMiddleware, requestAssetDeletion);

// for admin to delete asset with delete request

router.delete("/delete-asset/:id",adminAuthMiddleware, approveAssetDeletion);
router.get("/delete-requests",adminAuthMiddleware, getDeleteRequests);




export default router;
