import express from "express";
import authMiddleware from "../middleware/auth_validate.js";

import {

   createOrder,
   verifyPayment,
   razorpayWebhook,
   getAllOrders

} from "../controllers/paymentcontroller.js";
import adminAuthMiddleware from "../middleware/admin_validate.js";

const router = express.Router();

router.post("/create-order",authMiddleware, createOrder);
router.post("/verify-payment",authMiddleware, verifyPayment);
router.post("/webhook", razorpayWebhook);
router.get("/get_all_orders",adminAuthMiddleware, getAllOrders);

export default router;
