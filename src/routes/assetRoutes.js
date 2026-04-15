import express from "express";
import authMiddleware from "../middleware/auth_validate.js";
import { uploadAssetImages }  from "../middleware/upload.js";
import  {add_Asset}  from "../controllers/assetcontroller.js";

const router = express.Router();



router.post(
  "/add_asset",
  authMiddleware,
  uploadAssetImages.array("files", 5), // ✅ multiple files
  add_Asset
);









export default router;
