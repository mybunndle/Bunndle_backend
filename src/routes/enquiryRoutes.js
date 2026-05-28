import express from "express";
import auth_middleware from "../middleware/auth_validate.js";
import {
  toggleEnquiry,
  getMyEnquiredAssets,
  getAllEnquiries,
} from "../controllers/enquiryController.js";


const router= express.Router();

router.post("/toggle/:assetId", auth_middleware, toggleEnquiry);
router.get("/my_enquiries", auth_middleware, getMyEnquiredAssets);
router.get("/all", auth_middleware, getAllEnquiries);

export default router;