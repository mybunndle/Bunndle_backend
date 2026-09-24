import express from "express";

import {
  submitAgreementDetails,
  getAgreementDetails,
  retryAgreementGeneration,
} from "../controllers/agreementSubmissionController.js";
import{
  sendAgreementOtp,
  verifyAgreementOtp
} from "../controllers/agreementOtpcontroller.js";

// CHANGE THIS IMPORT ONLY IF YOUR AUTH MIDDLEWARE
// FILE/FUNCTION HAS A DIFFERENT NAME.
import authMiddleware from "../middleware/auth_validate.js";
import {verifyAgreementOtpCompleted}  from "../middleware/agreementOtp.middleware.js";


const router = express.Router();



// 1. Generate OTP
router.post(
  "/agreement-otp/send/:purchaseId",
  authMiddleware,
  sendAgreementOtp
);


// 2. Verify OTP
router.post(
  "/agreement-otp/verify/:purchaseId",
  authMiddleware,
  verifyAgreementOtp
);


// ============================================================
// SUBMIT AGREEMENT DETAILS + GENERATE PDF
// ============================================================
//
// POST
// /api/agreement/purchase/:purchaseId/agreement-details
//

router.post(
  "/purchase/agreement-details/:purchaseId",
  authMiddleware,
  
  submitAgreementDetails
);


// ============================================================
// GET GENERATED AGREEMENT DETAILS
// ============================================================
//
// GET
// /api/agreement/purchase/:purchaseId/agreement
//

router.get(
  "/purchase/agreement/:purchaseId",
  authMiddleware,
  getAgreementDetails
);


// ============================================================
// RETRY PDF GENERATION
// ============================================================
//
// POST
// /api/agreement/purchase/:purchaseId/agreement/retry
//

router.post(
  "/retry/:purchaseId",
  authMiddleware,
  retryAgreementGeneration
);


export default router;