import express from "express";
import auth_middleware from "../middleware/auth_validate.js";
import admin_middleware from "../middleware/admin_validate.js";

import {
  toggleEnquiry,
  getMyEnquiredAssets,
  getAllEnquiries,
  getMyEnquiryAssetIds,
  updateAdminRemark 
} from "../controllers/enquiryController.js";


const router= express.Router();

router.post("/send_enquiry/:assetId", auth_middleware, toggleEnquiry);
router.get("/my_enquiries", auth_middleware, getMyEnquiredAssets);
router.get("/all", auth_middleware, getAllEnquiries);
router.get("/myEnquiryAssetIds", auth_middleware,getMyEnquiryAssetIds );

router.put(
  "/add_remark/:enquiryId",
  admin_middleware,
  updateAdminRemark 
);

export default router;