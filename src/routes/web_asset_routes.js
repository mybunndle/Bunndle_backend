import express from "express";
import {
  addWebAsset,
  getAllWebAssets,
  updateWebAsset,
  deleteWebAsset,
} from "../controllers/web_assetcontroller.js";

import authMiddleware from "../middleware/auth_validate.js";
import { upload_web_AssetImages } from "../middleware/upload.js";

const router = express.Router();

const handleWebAssetUpload = (req, res, next) => {
  upload_web_AssetImages.array("files", 5)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "File upload failed.",
      });
    }

    next();
  });
};

// Add web asset: token required
router.post(
  "/add_web_asset",
  authMiddleware,
  handleWebAssetUpload,
  addWebAsset
);

// Get all web assets: no token required
router.get("/get_web_assets", getAllWebAssets);

router.put("/update_web_asset/:id", authMiddleware, handleWebAssetUpload, updateWebAsset);

router.delete("/delete_web_asset/:id", authMiddleware, deleteWebAsset);

export default router;