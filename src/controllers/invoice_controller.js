import mongoose from "mongoose";
import {Invoice} from "../model/invoiceModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";






// ==========================================
// FORMAT PAYMENT DATE AND TIME IN IST
// ==========================================

const formatPaymentDateTime = (date) => {
  const paymentDateTime = new Date(date);

  if (Number.isNaN(paymentDateTime.getTime())) {
    throw new Error("Invalid payment date");
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
    } = req.body;

    // ========================================
    // 1. VALIDATE INPUT
    // ========================================

    if (
      typeof purchaseHistoryId !== "string" ||
      !mongoose.isValidObjectId(purchaseHistoryId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid purchase history ID is required",
      });
    }

    if (
      typeof invoiceNumber !== "string" ||
      !invoiceNumber.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required",
      });
    }

    if (
      typeof hsnCode !== "string" ||
      !hsnCode.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "HSN code is required",
      });
    }

    if (
      typeof gstPercentage !== "number" ||
      !Number.isFinite(gstPercentage) ||
      gstPercentage < 0 ||
      gstPercentage > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid GST percentage is required",
      });
    }

    // ========================================
    // 2. NORMALIZE INPUT
    // ========================================

    const normalizedInvoiceNumber = invoiceNumber
      .trim()
      .toUpperCase();

    const normalizedGstin =
      customerGstNumber == null ||
      customerGstNumber === ""
        ? null
        : typeof customerGstNumber === "string"
          ? customerGstNumber.trim().toUpperCase()
          : null;

    if (
      customerGstNumber != null &&
      typeof customerGstNumber !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer GST number must be a string",
      });
    }

    if (
      normalizedGstin &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
        normalizedGstin
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer GST number format",
      });
    }

    // ========================================
    // 3. FETCH SUCCESSFUL PURCHASE HISTORY
    // ========================================

    const purchase = await PurchaseHistory.findOne({
      _id: purchaseHistoryId,
      paymentStatus: "SUCCESS",
    })
      .select(
        `
        orderId
        userId
        assetId
        paymentId
        totalAmount
        paidAt
        paymentStatus
        `
      )
      .lean();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Successful purchase history not found",
      });
    }

    // ========================================
    // 4. CHECK REQUIRED PURCHASE REFERENCES
    // ========================================

    if (
      !purchase.orderId ||
      !purchase.userId ||
      !purchase.assetId ||
      !purchase.paymentId
    ) {
      return res.status(422).json({
        success: false,
        message:
          "Purchase history contains incomplete reference details",
      });
    }

    // ========================================
    // 5. CHECK PAYMENT DATE
    // ========================================

    if (
      !purchase.paidAt ||
      Number.isNaN(new Date(purchase.paidAt).getTime())
    ) {
      return res.status(422).json({
        success: false,
        message: "Valid payment date is missing",
      });
    }

    // ========================================
    // 6. FORMAT DATE AND TIME IN IST
    // ========================================

    const {
      invoiceDate,
      invoiceTime,
    } = formatPaymentDateTime(purchase.paidAt);

    // ========================================
    // 7. GET TOTAL AMOUNT FROM PURCHASE
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
    // 8. GST-INCLUSIVE CALCULATION
    // ========================================

    // Convert rupees to paise
    const totalPaise = Math.round(totalAmount * 100);

    if (!Number.isSafeInteger(totalPaise)) {
      return res.status(422).json({
        success: false,
        message: "Purchase amount exceeds safe range",
      });
    }

    // GST is already included in total amount
    const taxablePaise = Math.round(
      (totalPaise * 100) / (100 + gstPercentage)
    );

    const gstPaise = totalPaise - taxablePaise;

    const taxableAmount = taxablePaise / 100;
    const gstAmount = gstPaise / 100;

    // ========================================
    // 9. CREATE AND SAVE INVOICE
    // ========================================

    const invoice = await Invoice.create({
      // All IDs from PurchaseHistory
      purchaseHistoryId: purchase._id,
      orderId: purchase.orderId,
      userId: purchase.userId,
      assetId: purchase.assetId,
      paymentId: purchase.paymentId,

      // Admin-entered fields
      invoiceNumber: normalizedInvoiceNumber,
      customerGstNumber: normalizedGstin,
      hsnCode: hsnCode.trim(),
      gstPercentage,

      // Date and time from payment, formatted in IST
      invoiceDate,
      invoiceTime,

      // Calculated GST-inclusive amounts
      taxableAmount,
      gstAmount,
      totalAmount,
    });

    // ========================================
    // 10. SUCCESS RESPONSE
    // ========================================

    return res.status(201).json({
      success: true,
      message: "Invoice calculated and saved successfully",
      data: invoice,
    });
  } catch (error) {
    // Duplicate invoice number or purchase
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Invoice already exists for this purchase or invoice number",
      });
    }

    if (error.name === "ValidationError") {
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
      .select(`
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
      `)
      .populate("userId", "name email phone")
      .populate("assetId", "assetName assetCode specification")
      .sort({ createdAt: -1 })
      .lean();

    // ==========================================
    // FETCH EXISTING INVOICES
    // ==========================================

    const purchaseIds = purchases.map(
      (purchase) => purchase._id
    );

    const invoices = await Invoice.find({
      purchaseHistoryId: { $in: purchaseIds },
    }).lean();

    const invoiceMap = new Map(
      invoices.map((invoice) => [
        String(invoice.purchaseHistoryId),
        invoice,
      ])
    );

    // ==========================================
    // IST FORMATTERS
    // ==========================================

    const dateFormatter = new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }
    );

    const timeFormatter = new Intl.DateTimeFormat(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }
    );

    // ==========================================
    // FORMAT RESPONSE
    // ==========================================

    const formattedPurchases = purchases.map(
      (purchase) => {
        const invoice = invoiceMap.get(
          String(purchase._id)
        );

        const paymentDateSource =
          purchase.paidAt || purchase.createdAt;

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
            purchase.userSnapshot?.name ||
            purchase.userId?.name ||
            "N/A",

          email:
            purchase.userSnapshot?.email ||
            purchase.userId?.email ||
            "N/A",

          phone:
            purchase.userSnapshot?.phone ||
            purchase.userId?.phone ||
            "N/A",

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

          fractionsPurchased:
            purchase.fractionsPurchased,

          amountPerFraction:
            purchase.amountPerFraction,

          // ====================================
          // PAYMENT DETAILS
          // ====================================

          totalAmount: purchase.totalAmount,

          paymentStatus: purchase.paymentStatus,

          paymentDate: paymentDateTime
            ? dateFormatter.format(paymentDateTime)
            : null,

          paymentTime: paymentDateTime
            ? timeFormatter
                .format(paymentDateTime)
                .toLowerCase()
            : null,

          paidAt: purchase.paidAt || null,

          razorpayOrderId:
            purchase.razorpayOrderId || null,

          transactionId:
            purchase.razorpayPaymentId || null,

          transactionReference:
            purchase.transactionReference || null,

          paymentMethod:
            purchase.paymentMethod || null,

          currency:
            purchase.currency || "INR",

          // ====================================
          // INVOICE STATUS AND DETAILS
          // ====================================

          invoiceCreated: Boolean(invoice),

          invoiceId: invoice?._id || null,

          invoiceNumber:
            invoice?.invoiceNumber || null,

          invoiceDate:
            invoice?.invoiceDate || null,

          customerGstNumber:
            invoice?.customerGstNumber || null,

          hsnCode:
            invoice?.hsnCode || null,

          gstPercentage:
            invoice?.gstPercentage ?? null,

          taxableAmount:
            invoice?.taxableAmount ?? null,

          gstAmount:
            invoice?.gstAmount ?? null,

          invoiceTotalAmount:
            invoice?.totalAmount ?? null,
        };
      }
    );

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message:
        "Successful purchases fetched for invoice management",

      totalPurchases: formattedPurchases.length,

      invoiceCreatedCount:
        formattedPurchases.filter(
          (item) => item.invoiceCreated
        ).length,

      invoicePendingCount:
        formattedPurchases.filter(
          (item) => !item.invoiceCreated
        ).length,

      data: formattedPurchases,
    });
  } catch (error) {
    console.error(
      "GET INVOICE ELIGIBLE PURCHASES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch purchases for invoice management",
    });
  }
};
