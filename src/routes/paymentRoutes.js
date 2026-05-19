import express from "express";
import authMiddleware from "../middleware/auth_validate.js";

import {

   createOrder,
   verifyPayment,
   razorpayWebhook

} from "../controllers/paymentcontroller.js";

const router = express.Router();

router.post("/create-order",authMiddleware, createOrder);
router.post("/verify-payment",authMiddleware, verifyPayment);
router.post("/webhook", razorpayWebhook);

export default router;
