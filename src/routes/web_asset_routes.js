import express from "express";
import { addWebAsset, getWebAssets } from "../controllers/webAssetController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { upload_web_AssetImages } from "../middleware/uploadAssetImages.js";
import { uploadWebAssetFilesToImageKit } from "../middleware/uploadWebAssetFilesToImageKit.js";

const router = express.Router();

router.post(
  "/add_web_asset",


  upload_web_AssetImages.array("files", 5),

  uploadWebAssetFilesToImageKit,

  addWebAsset
);


router.get("/get_web_assets",getWebAssets)

export default router;