import express from "express";

import auth_middleware
from "../middleware/auth_validate.js";

import {
  generateDigilockerToken,
  fetchDigilockerDetails,
  digilockerCallback,
} from "../controllers/kycController.js";

const router = express.Router();


// =====================================
// GENERATE DIGILOCKER TOKEN
// =====================================

router.post(
  "/generate-digilocker-token",
  auth_middleware,
  generateDigilockerToken
);


// =====================================
// FETCH VERIFIED DETAILS
// =====================================

router.post(
  "/fetch-details",
  auth_middleware,
  fetchDigilockerDetails
);


// =====================================
// DIGILOCKER CALLBACK
// =====================================

router.get(
  "/digilocker-callback",
  digilockerCallback
);


export default router;