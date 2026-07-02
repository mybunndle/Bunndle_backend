import express from "express";
import auth_middleware from "../middleware/auth_validate.js";
import admin_middleware from "../middleware/admin_validate.js";
import { uploadAssetImages } from "../middleware/upload.js";
import {
  createCoAsset,
  getAssetInvestors,
  getCoAssetById,
  getCoAssets,
  getPurchaseHistory,
  getMyOwnerships,
  delete_co_own,
  getPurchaseHistoryByUserId
} from "../controllers/coOwnController.js";

import { getAssetById } from "../controllers/assetcontroller.js";

const router = express.Router();

router.post(
  "/add-assets",
  admin_middleware,
  uploadAssetImages.array("files", 5),
  createCoAsset,
);

router.get("/assets", getCoAssets);

router.get("/asset/:id", getCoAssetById);

router.delete("/delete-asset/:id",admin_middleware, delete_co_own);

router.get("/my-purchases", auth_middleware, getPurchaseHistory);

router.get("/my-ownerships", auth_middleware, getMyOwnerships);

router.get(
  "/assets-investors/:assetId",
  getAssetInvestors,
);


router.get("/purchase-history/:userId", admin_middleware, getPurchaseHistoryByUserId);

export default router;
