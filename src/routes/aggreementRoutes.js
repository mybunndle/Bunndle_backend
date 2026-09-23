import express from "express";

import {
  submitAgreementDetails,
  getAgreementDetails,
  retryAgreementGeneration,
} from "../controllers/agreementSubmissionController.js";

// CHANGE THIS IMPORT ONLY IF YOUR AUTH MIDDLEWARE
// FILE/FUNCTION HAS A DIFFERENT NAME.
import authMiddleware from "../middleware/auth_validate.js";


const router = express.Router();


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
  "/purchase/:purchaseId/agreement/retry",
  authMiddleware,
  retryAgreementGeneration
);


export default router;