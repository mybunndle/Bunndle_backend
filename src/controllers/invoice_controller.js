import mongoose from "mongoose";
import { Invoice } from "../model/invoiceModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";

// ==========================================
// FORMAT PAYMENT DATE & TIME IN IST
// ==========================================

const formatPaymentDateTime = (date) => {
  const paymentDateTime = new Date(date);

  if (Number.isNaN(paymentDateTime.getTime())) {
    return null;
  }

  const invoiceDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(paymentDateTime);

  const invoiceTime = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  })
    .format(paymentDateTime)
    .toLowerCase();

  return {
    invoiceDate,
    invoiceTime,
  };
};

// ==========================================
// CREATE INVOICE - ADMIN ONLY
// ==========================================

export const createInvoice = async (req, res) => {
  try {
    const {
      purchaseHistoryId,
      invoiceNumber,
      customerGstNumber,
      hsnCode,
      gstPercentage,
    } = req.body ?? {};

    // ========================================
    // 1. VALIDATE PURCHASE HISTORY ID
    // ========================================

    if (
      typeof purchaseHistoryId !== "string" ||
      !mongoose.isObjectIdOrHexString(purchaseHistoryId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid purchase history ID is required",
      });
    }

    // ========================================
    // 2. VALIDATE INVOICE NUMBER
    // ========================================

    if (typeof invoiceNumber !== "string" || !invoiceNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required",
      });
    }

    const normalizedInvoiceNumber = invoiceNumber.trim().toUpperCase();

    // ========================================
    // 3. VALIDATE HSN CODE
    // ========================================

    const normalizedHsnCode =
      typeof hsnCode === "string" || typeof hsnCode === "number"
        ? String(hsnCode).trim()
        : "";

    if (!normalizedHsnCode) {
      return res.status(400).json({
        success: false,
        message: "HSN code is required",
      });
    }

    // ========================================
    // CHECK DUPLICATE HSN CODE
    // ========================================

    const existingHsnCode = await Invoice.findOne({
      hsnCode: normalizedHsnCode,
    })
      .select("_id invoiceNumber hsnCode")
      .lean();

    if (existingHsnCode) {
      return res.status(409).json({
        success: false,
        message: "HSN code already exists",
        hsnCode: normalizedHsnCode,
        existingInvoice: {
          invoiceId: existingHsnCode._id,
          invoiceNumber: existingHsnCode.invoiceNumber,
        },
      });
    }

    // Allow 4, 6 or 8-digit HSN codes.
    // if (!/^(?:\d{4}|\d{6}|\d{8})$/.test(normalizedHsnCode)) {
    //   return res.status(400).json({
    //     success: false,
    //     message:
    //       "HSN code must contain 4, 6 or 8 digits",
    //   });
    // }

    // ========================================
    // 4. VALIDATE GST PERCENTAGE
    // ========================================

    const parsedGstPercentage =
      typeof gstPercentage === "number" ||
      (typeof gstPercentage === "string" && gstPercentage.trim() !== "")
        ? Number(gstPercentage)
        : NaN;

    if (
      !Number.isFinite(parsedGstPercentage) ||
      parsedGstPercentage < 0 ||
      parsedGstPercentage > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid GST percentage is required",
      });
    }

    // ========================================
    // 5. OPTIONAL CUSTOMER GST NUMBER
    // ========================================

    if (
      customerGstNumber !== undefined &&
      customerGstNumber !== null &&
      typeof customerGstNumber !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer GST number must be a string",
      });
    }

    const normalizedGstin =
      typeof customerGstNumber === "string" && customerGstNumber.trim()
        ? customerGstNumber.trim().toUpperCase()
        : null;

    if (
      normalizedGstin &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalizedGstin)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer GST number format",
      });
    }

    // ========================================
    // 6. CHECK DUPLICATE INVOICE NUMBER
    // ========================================

    const existingInvoiceNumber = await Invoice.findOne({
      invoiceNumber: normalizedInvoiceNumber,
    })
      .select("_id invoiceNumber")
      .lean();

    if (existingInvoiceNumber) {
      return res.status(409).json({
        success: false,
        message: "Invoice number already exists",
        invoiceNumber: normalizedInvoiceNumber,
      });
    }

    // ========================================
    // 7. CHECK DUPLICATE PURCHASE INVOICE
    // ========================================

    const existingPurchaseInvoice = await Invoice.findOne({
      purchaseHistoryId,
    })
      .select("_id invoiceNumber purchaseHistoryId")
      .lean();

    if (existingPurchaseInvoice) {
      return res.status(409).json({
        success: false,
        message: "Invoice has already been generated for this purchase",
        existingInvoice: {
          invoiceId: existingPurchaseInvoice._id,
          invoiceNumber: existingPurchaseInvoice.invoiceNumber,
        },
      });
    }

    // ========================================
    // 8. FETCH SUCCESSFUL PURCHASE
    // ========================================

    const purchase = await PurchaseHistory.findOne({
      _id: purchaseHistoryId,
      paymentStatus: "SUCCESS",
    })
      .select(
        "orderId userId assetId paymentId totalAmount paidAt paymentStatus",
      )
      .lean();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Successful purchase history not found",
      });
    }

    // ========================================
    // 9. VALIDATE PURCHASE REFERENCES
    // ========================================

    if (
      !purchase.orderId ||
      !purchase.userId ||
      !purchase.assetId ||
      !purchase.paymentId
    ) {
      return res.status(422).json({
        success: false,
        message: "Purchase history contains incomplete reference details",
      });
    }

    // ========================================
    // 10. FORMAT PAYMENT DATE IN IST
    // ========================================

    if (!purchase.paidAt) {
      return res.status(422).json({
        success: false,
        message: "Payment date is missing",
      });
    }

    const formattedPayment = formatPaymentDateTime(purchase.paidAt);

    if (!formattedPayment) {
      return res.status(422).json({
        success: false,
        message: "Invalid payment date",
      });
    }

    const { invoiceDate, invoiceTime } = formattedPayment;

    // ========================================
    // 11. VALIDATE PURCHASE AMOUNT
    // ========================================

    const totalAmount = purchase.totalAmount;

    if (
      typeof totalAmount !== "number" ||
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0
    ) {
      return res.status(422).json({
        success: false,
        message: "Invalid purchase total amount",
      });
    }

    // ========================================
    // 12. GST-INCLUSIVE CALCULATION
    // ========================================

    const totalPaise = Math.round(totalAmount * 100);

    if (!Number.isSafeInteger(totalPaise)) {
      return res.status(422).json({
        success: false,
        message: "Purchase amount exceeds safe range",
      });
    }

    const taxablePaise = Math.round(
      (totalPaise * 100) / (100 + parsedGstPercentage),
    );

    const gstPaise = totalPaise - taxablePaise;

    const taxableAmount = taxablePaise / 100;
    const gstAmount = gstPaise / 100;

    // ========================================
    // 13. CREATE INVOICE
    // ========================================

    const invoice = await Invoice.create({
      purchaseHistoryId: purchase._id,

      orderId: purchase.orderId,
      userId: purchase.userId,
      assetId: purchase.assetId,
      paymentId: purchase.paymentId,

      invoiceNumber: normalizedInvoiceNumber,

      customerGstNumber: normalizedGstin,

      hsnCode: normalizedHsnCode,
      gstPercentage: parsedGstPercentage,

      invoiceDate,
      invoiceTime,

      taxableAmount,
      gstAmount,
      totalAmount,
    });

    // ========================================
    // 14. SUCCESS RESPONSE
    // ========================================

    return res.status(201).json({
      success: true,
      message: "Invoice calculated and saved successfully",
      data: invoice,
    });
  } catch (error) {
    // ========================================
    // HANDLE DATABASE UNIQUE CONSTRAINTS
    // ========================================

    if (error.code === 11000) {
      if (error.keyPattern?.invoiceNumber) {
        return res.status(409).json({
          success: false,
          message: "Invoice number already exists",
        });
      }

      if (error.keyPattern?.purchaseHistoryId) {
        return res.status(409).json({
          success: false,
          message: "Invoice has already been generated for this purchase",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Duplicate invoice data",
      });
    }

    // ========================================
    // HANDLE VALIDATION ERRORS
    // ========================================

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("CREATE INVOICE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create invoice",
    });
  }
};

export const getAllInvoiceEligiblePurchases = async (req, res) => {
  try {
    // ==========================================
    // FETCH SUCCESSFUL PURCHASES
    // ==========================================

    const purchases = await PurchaseHistory.find({
      paymentStatus: "SUCCESS",
    })
      .select(
        `
        orderId
        userId
        assetId
        paymentId
        userSnapshot
        assetSnapshot
        fractionsPurchased
        amountPerFraction
        totalAmount
        paidAt
        createdAt
        paymentStatus
        razorpayOrderId
        razorpayPaymentId
        transactionReference
        paymentMethod
        currency
      `,
      )
      .populate("userId", "name email phone")
      .populate("assetId", "assetName assetCode specification")
      .sort({ createdAt: -1 })
      .lean();

    // ==========================================
    // FETCH EXISTING INVOICES
    // ==========================================

    const purchaseIds = purchases.map((purchase) => purchase._id);

    const invoices = await Invoice.find({
      purchaseHistoryId: { $in: purchaseIds },
    }).lean();

    const invoiceMap = new Map(
      invoices.map((invoice) => [String(invoice.purchaseHistoryId), invoice]),
    );

    // ==========================================
    // IST FORMATTERS
    // ==========================================

    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });

    // ==========================================
    // FORMAT RESPONSE
    // ==========================================

    const formattedPurchases = purchases.map((purchase) => {
      const invoice = invoiceMap.get(String(purchase._id));

      const paymentDateSource = purchase.paidAt || purchase.createdAt;

      const paymentDateTime = paymentDateSource
        ? new Date(paymentDateSource)
        : null;

      return {
        // ====================================
        // ALL REQUIRED IDS
        // ====================================

        purchaseHistoryId: purchase._id,

        orderId: purchase.orderId,

        userId: purchase.userId?._id || null,

        assetId: purchase.assetId?._id || null,

        paymentId: purchase.paymentId,

        // ====================================
        // CUSTOMER DETAILS
        // ====================================

        customerName:
          purchase.userSnapshot?.name || purchase.userId?.name || "N/A",

        email: purchase.userSnapshot?.email || purchase.userId?.email || "N/A",

        phone: purchase.userSnapshot?.phone || purchase.userId?.phone || "N/A",

        // ====================================
        // ASSET DETAILS
        // ====================================

        assetName:
          purchase.assetSnapshot?.assetName ||
          purchase.assetId?.assetName ||
          "N/A",

        assetCode:
          purchase.assetSnapshot?.assetCode ||
          purchase.assetId?.assetCode ||
          "N/A",

        specification:
          purchase.assetSnapshot?.specification ||
          purchase.assetId?.specification ||
          "N/A",

        fractionsPurchased: purchase.fractionsPurchased,

        amountPerFraction: purchase.amountPerFraction,

        // ====================================
        // PAYMENT DETAILS
        // ====================================

        totalAmount: purchase.totalAmount,

        paymentStatus: purchase.paymentStatus,

        paymentDate: paymentDateTime
          ? dateFormatter.format(paymentDateTime)
          : null,

        paymentTime: paymentDateTime
          ? timeFormatter.format(paymentDateTime).toLowerCase()
          : null,

        paidAt: purchase.paidAt || null,

        razorpayOrderId: purchase.razorpayOrderId || null,

        transactionId: purchase.razorpayPaymentId || null,

        transactionReference: purchase.transactionReference || null,

        paymentMethod: purchase.paymentMethod || null,

        currency: purchase.currency || "INR",

        // ====================================
        // INVOICE STATUS AND DETAILS
        // ====================================

        invoiceCreated: Boolean(invoice),

        invoiceId: invoice?._id || null,

        invoiceNumber: invoice?.invoiceNumber || null,

        invoiceDate: invoice?.invoiceDate || null,

        customerGstNumber: invoice?.customerGstNumber || null,

        hsnCode: invoice?.hsnCode || null,

        gstPercentage: invoice?.gstPercentage ?? null,

        taxableAmount: invoice?.taxableAmount ?? null,

        gstAmount: invoice?.gstAmount ?? null,

        invoiceTotalAmount: invoice?.totalAmount ?? null,
      };
    });

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message: "Successful purchases fetched for invoice management",

      totalPurchases: formattedPurchases.length,

      invoiceCreatedCount: formattedPurchases.filter(
        (item) => item.invoiceCreated,
      ).length,

      invoicePendingCount: formattedPurchases.filter(
        (item) => !item.invoiceCreated,
      ).length,

      data: formattedPurchases,
    });
  } catch (error) {
    console.error("GET INVOICE ELIGIBLE PURCHASES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch purchases for invoice management",
    });
  }
};
