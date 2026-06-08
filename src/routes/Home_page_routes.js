import express from "express";

import auth_middleware from "../middleware/auth_validate.js";
import {
  saveHomeList,
  getHomeList,
  saveTopInDemand,
  getTopInDemand
} from "../controllers/home_page_controller.js";

import { uploadHomeImage } from "../middleware/upload.js";

const router = express.Router();

/**
 * Create/Update Home Banner
 */
router.post(
  "/savehomeList",
  uploadHomeImage.fields([
    { name: "rentalAssets", maxCount: 3 },
    { name: "popularDeals", maxCount: 3 },
  ]),
  saveHomeList
);

/**
 * Get Home Banner
 */
router.get(
  "/getlistimages",
  
  getHomeList
);


//top in demands

router.post(
  "/savetopindemand",
  uploadHomeImage.single("image"),
  saveTopInDemand
);

router.get(
  "/gettopindemand",
  getTopInDemand
);

export default router;