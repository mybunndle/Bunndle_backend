import express from "express";
import auth_middleware from "../middleware/auth_validate.js";
import admin_middleware from "../middleware/admin_validate.js";
import { uploadAssetImages }  from "../middleware/upload.js";
import { buyFractions, createCoAsset, getAssetInvestors, getCoAssetById, getCoAssets, getPurchaseHistory } from "../controllers/coOwnController.js";

import { getAssetById } from "../controllers/assetcontroller.js";


const router= express.Router();


router.post("/add-assets",
  admin_middleware,uploadAssetImages.array("files", 5), 
  createCoAsset
);

router.get(
  "/assets",
  getCoAssets
);

router.get(
  "/asset/:id",
  getCoAssetById
);

router.post(
  "/assets/:assetId/buy",
    auth_middleware,
  buyFractions
);


router.get(
  "/my-purchases",
  auth_middleware,
  getPurchaseHistory
);

router.get(
  "/admin/assets/:assetId/investors",
  admin_middleware,
  getAssetInvestors
);



export default router;