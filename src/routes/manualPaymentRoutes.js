import { Router } from "express";
import multer from "multer";

import {
  createManualOrder,
  sendManualBankDetails,
  listPendingBankDetailOrders,
  submitManualProof,
  getMyManualPayments,
  listAdminManualPayments,
  getAdminManualPayment,
  approveManualPayment,
  rejectManualPayment,
  markManualReviewRequired,
} from "../controllers/manualPaymentController.js";

import authenticate from "../middleware/auth_validate.js";
import requireAdmin from "../middleware/admin_validate.js";

const router = Router();

// ============================================================
// MULTER PAYMENT SCREENSHOT UPLOAD
// ============================================================

const screenshotUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3,
    fields: 12,
  },

  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG and PNG payment screenshots are allowed"));
    }

    cb(null, true);
  },
}).array("paymentScreenshots", 3);

// ============================================================
// VALIDATE UPLOADED SCREENSHOTS
// ============================================================

const uploadProof = (req, res, next) => {
  screenshotUpload(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      !Array.isArray(req.files) ||
      req.files.length < 1 ||
      req.files.length > 3
    ) {
      return res.status(400).json({
        success: false,
        message: "Upload 1–3 screenshots",
      });
    }

    for (const file of req.files) {
      const buffer = file.buffer;

      const jpeg =
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff;

      const png =
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

      const validImage =
        (file.mimetype === "image/jpeg" && jpeg) ||
        (file.mimetype === "image/png" && png);

      if (!validImage) {
        return res.status(400).json({
          success: false,
          message: "Invalid screenshot content",
        });
      }
    }

    next();
  });
};

// ============================================================
// AUTHENTICATION
// ============================================================

router.use(authenticate);

// ============================================================
// CUSTOMER ROUTES
// ============================================================

// Customer creates manual order.
router.post("/create_order", createManualOrder);

// Customer submits payment proof after bank email.
router.post("/orders/proof/:orderId", uploadProof, submitManualProof);

// Customer gets their manual payments/orders.
router.get("/my", getMyManualPayments);

// ============================================================
// ADMIN AUTHORIZATION
// ============================================================

router.use("/admin", requireAdmin);

// ============================================================
// ADMIN: BANK DETAILS
// ============================================================

// List orders that need bank details.
router.get("/admin/orders/pending-bank-details", listPendingBankDetailOrders);

// Email bank details for an order.
router.patch("/admin/orders/:orderId/send-bank-details", sendManualBankDetails);

// ============================================================
// ADMIN: PAYMENT VERIFICATION
// ============================================================

// List submitted manual payments.
router.get("/admin", listAdminManualPayments);

// Get one manual payment including screenshots.
router.get("/admin/:manualPaymentId", getAdminManualPayment);

// Approve verified bank payment.
router.patch("/admin/:manualPaymentId/approve", approveManualPayment);

// Reject manual payment.
router.patch("/admin/:manualPaymentId/reject", rejectManualPayment);

// Mark payment for further review.
router.patch("/admin/:manualPaymentId/review", markManualReviewRequired);

export default router;
