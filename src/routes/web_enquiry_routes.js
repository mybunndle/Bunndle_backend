import express from "express";
import { submitEnquiry } from "../controllers/web_equiry_controller.js";

const router = express.Router();

router.post("/submit_enquiry", submitEnquiry);

export default router;