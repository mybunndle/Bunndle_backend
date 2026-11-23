import { Router } from "express";
import multer from "multer";

import {
  createManualOrder,
  submitManualProof,
  getMyManualPayments,
  listAdminManualPayments,
  getAdminManualPayment,
  approveManualPayment,
  rejectManualPayment,
  markManualReviewRequired,
} from "../controllers/manualPaymentController.js";

// Replace with your actual authentication middleware.
import { authenticate } from "../middlewares/authenticate.js";

import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = Router();

// ============================================
// IMAGE VALIDATION
// ============================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3,
    fields: 10,
  },

  fileFilter(req, file, cb) {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG and PNG screenshots allowed"));
    }

    cb(null, true);
  },
}).array("paymentScreenshots", 3);

// ============================================
// UPLOAD MIDDLEWARE
// ============================================

const acceptScreenshots = (req, res, next) => {
  upload(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (!req.files || req.files.length < 1 || req.files.length > 3) {
      return res.status(400).json({
        success: false,
        message: "Upload minimum 1 and maximum 3 screenshots",
      });
    }

    next();
  });
};

// ============================================
// AUTHENTICATION
// ============================================

router.use(authenticate);

// ============================================
// USER ROUTES
// ============================================

// Create manual payment order
router.post("/orders", createManualOrder);

// Upload screenshots + UTR
router.post("/orders/:orderId/proof", acceptScreenshots, submitManualProof);

// Get own manual payments
router.get("/my", getMyManualPayments);

// ============================================
// ADMIN AUTHORIZATION
// ============================================

router.use("/admin", requireAdmin);

// List manual payments
router.get("/admin", listAdminManualPayments);

// View payment details
router.get("/admin/:paymentId", getAdminManualPayment);

// Approve payment
router.patch("/admin/:paymentId/approve", approveManualPayment);

// Reject payment
router.patch("/admin/:paymentId/reject", rejectManualPayment);

// Mark for review
router.patch("/admin/:paymentId/review", markManualReviewRequired);

export default router;
