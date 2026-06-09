import express from "express";

import auth_middleware from "../middleware/auth_validate.js";
import {
  saveHomeList,getHomeList,saveTopInDemand,getTopInDemand,addExploreDealImageOnly,getExploreDealImages,
  addExploreDealWithDetails,
  getExploreDeals, addTrending,getTrendingItems,addOfferItem,
  getOfferItems
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
router.post("/add_explore_deals_images",uploadHomeImage.single("image"),addExploreDealImageOnly);

// Explore Deals - Get images
router.get("/get_explore_deals_images", getExploreDealImages);

// Explore Deals - Add image + brand + category + model
router.post("/add_explore_recommended",uploadHomeImage.single("image"),addExploreDealWithDetails);

// Explore Deals - Get all data
router.get("/get_explore_recommended", getExploreDeals);


//trending and limited time offers 

router.post("/add_explore_trending_offers",uploadHomeImage.single("image"), addTrending);
router.get("/get_explore_trending_offers", getTrendingItems);


//limited time offers

router.post("/add_explore_limited_time_offers",uploadHomeImage.single("image"), addOfferItem);
router.get("/get_explore_limited_time_offers", getOfferItems);

//router.get("/get_offer_items", getOfferItems);

export default router;
