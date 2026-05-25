import express from "express";
import auth_middleware from "../middleware/auth_validate.js";

import {
  verifyDigilockerKyc,
} from "../controllers/kycController.js";

const router = express.Router();

router.post(
  "/verify-digilocker-kyc",auth_middleware,
  verifyDigilockerKyc
);

export default router;