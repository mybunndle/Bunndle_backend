// import express from "express";
// import authMiddleware from "../middleware/auth_validate.js";

// import {

//    createOrder,
//    verifyPayment,
//    razorpayWebhook,
//    getAllOrders,

// } from "../controllers/paymentcontroller.js";
// import adminAuthMiddleware from "../middleware/admin_validate.js";

// const router = express.Router();

// router.post("/create-order",authMiddleware, createOrder);
// router.post("/verify-payment",authMiddleware, verifyPayment);
// router.post("/webhook", razorpayWebhook);
// router.get("/get_all_orders",adminAuthMiddleware, getAllOrders);

// export default router;

import express from "express";
import authMiddleware from "../middleware/auth_validate.js";

import {
  createOrder,
  verifyPayment,
  verifyCashfreePayment,
  razorpayWebhook,
  cashfreeWebhook,
  generatePayUHash,
  verifyPayUPayment,
  payuPaymentReturn,
  payuWebhook,
  getAllOrders,
} from "../controllers/paymentcontroller.js";

import adminAuthMiddleware from "../middleware/admin_validate.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.post("/verify-payment", authMiddleware, verifyPayment);
router.post("/cashfree/verify-payment", authMiddleware, verifyCashfreePayment);
router.post("/webhook", razorpayWebhook);

router.post("/payu/generate-hash", authMiddleware, generatePayUHash);
router.post("/payu/verify", authMiddleware, verifyPayUPayment);
router.post("/payu/return", payuPaymentReturn);
router.post("/payu/webhook", payuWebhook);

router.post(
  "/cashfree/webhook",
  express.raw({ type: "application/json" }),
  cashfreeWebhook,
);

// ==========================================
// GET ALL ORDERS - ADMIN
// ==========================================

router.get("/get_all_orders", adminAuthMiddleware, getAllOrders);

export default router;
