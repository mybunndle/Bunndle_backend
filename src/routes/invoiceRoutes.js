import express from "express";

import { createInvoice , getAllInvoiceEligiblePurchases} from "../controllers/invoice_controller.js";

// Use your existing authentication middleware
import isAuthenticated from "../middleware/auth_validate.js";
import isAdmin from "../middleware/admin_validate.js";

const router = express.Router();

// ==========================================
// CREATE INVOICE (ADMIN ONLY)
// ==========================================
router.get("/eligible-purchases", isAuthenticated, isAdmin, getAllInvoiceEligiblePurchases);
router.post("/create_invoice", isAuthenticated, isAdmin, createInvoice);

export default router;
