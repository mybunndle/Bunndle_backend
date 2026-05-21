import express from "express";
import authMiddleware from "../middleware/auth_validate.js";
import { uploadAssetImages }  from "../middleware/upload.js";
import  {add_Asset, deleteAsset, getAssetById, getMyAssets, getAssetsByCategory, toggleEnquiryStatus, getAllAssets, getMyEnquiredAssets,getAssetsBySubCategory }  from "../controllers/assetcontroller.js";

const router = express.Router();


router.post(
  "/add_asset",
  authMiddleware,
  uploadAssetImages.array("files", 5), // ✅ multiple files
  add_Asset
);
router.get("/my_assets", authMiddleware, getMyAssets);

router.get("/assets/:id", authMiddleware, getAssetById);


//router.put("/update_asset/:id", authMiddleware, updateAsset);

router.delete("/delete_asset/:id", authMiddleware, deleteAsset);
router.get("/all_assets/explore/:category", getAssetsByCategory);

router.get("/all_assets/explore_sub/:subCategory",getAssetsBySubCategory)

//toggle enquiry status for an asset (enquired/not enquired)

router.patch("/enquiry-status/:id", authMiddleware, toggleEnquiryStatus);

//for user which has been enquired
router.get("/user-enquiries", authMiddleware, getMyEnquiredAssets);

//for admin to see all enquired assets
router.get("/all_list", authMiddleware, getAllAssets);

//for admin approval of assets
//router.patch("/approve-asset/:id", authMiddleware, approveAsset);





export default router;
