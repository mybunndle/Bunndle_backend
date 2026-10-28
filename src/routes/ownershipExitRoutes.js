import express from "express";

import {
  requestOwnershipExit,
  getMyOwnershipExitRequests,
  getAllOwnershipExitRequests,
  reviewOwnershipExitRequest,
} from "../controllers/ownershipExitController.js";

import authMiddleware from "../middleware/auth_validate.js";
import adminAuthMiddleware from "../middleware/admin_validate.js";

const isAuthenticated = authMiddleware;
const isAdmin = adminAuthMiddleware;

const router = express.Router();

router.post("/exit/request", isAuthenticated, requestOwnershipExit);

router.get("/exit/my-requests", isAuthenticated, getMyOwnershipExitRequests);

//admin

router.get(
  "/exit/requests",
  isAuthenticated,
  isAdmin,
  getAllOwnershipExitRequests,
);

router.post(
  "/exit/approval/:requestId",
  isAuthenticated,
  isAdmin,
  reviewOwnershipExitRequest,
);

export default router;
