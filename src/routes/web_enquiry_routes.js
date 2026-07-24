import express from "express";
import { submitEnquiry } from "../controllers/web_equiry_controller.js";

const router = express.Router();

router.post("/submit_enquiry/:id", submitEnquiry);

export default router;