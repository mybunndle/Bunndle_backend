import express from "express";

import auth_middleware from "../middleware/auth_validate.js";
import {
  saveHomeList,getHomeList,saveTopInDemand,getTopInDemand,addExploreDealImageOnly,getExploreDealImages,
  addExploreDealWithDetails,
  getExploreDeals,
} from "../controllers/home_page_controller.js";

import { uploadHomeImage } from "../middleware/upload.js";

const router = express.Router();


 // Create/Update Home Banner

router.post(
  "/savehomeList",
  uploadHomeImage.fields([
    { name: "rentalAssets", maxCount: 3 },
    { name: "popularDeals", maxCount: 3 },
  ]),
  saveHomeList,
);

// Get Home Banner

router.get("/getlistimages",getHomeList);

//top in demands

router.post("/savetopindemand",uploadHomeImage.single("image"),saveTopInDemand,);

router.get("/gettopindemand", getTopInDemand);



//explore deals and recomended

// Explore Deals - Add only image
router.post("/add_explore_deals_image",uploadHomeImage.single("image"),addExploreDealImageOnly);

// Explore Deals - Get images
router.get("/get_explore_deals_image", getExploreDealImages);

// Explore Deals - Add image + brand + category + model
router.post("/add_explore_deals",uploadHomeImage.single("image"),addExploreDealWithDetails);

// Explore Deals - Get all data
router.get("/get_explore_deals", getExploreDeals);


export default router;
