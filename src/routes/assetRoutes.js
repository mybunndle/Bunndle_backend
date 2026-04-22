import express from "express";
import authMiddleware from "../middleware/auth_validate.js";
import { uploadAssetImages }  from "../middleware/upload.js";
import  {add_Asset, deleteAsset, getAssetById, getMyAssets}  from "../controllers/assetcontroller.js";

const router = express.Router();



router.post(
  "/add_asset",
  authMiddleware,
  uploadAssetImages.array("files", 5), // ✅ multiple files
  add_Asset
);
router.get("/my_assets", authMiddleware, getMyAssets);

router.get("/assets/:id", authMiddleware, getAssetById);


// router.put("/update_asset/:id", authMiddleware, updateAsset);

router.delete("/delete_asset/:id", authMiddleware, deleteAsset);









export default router;
