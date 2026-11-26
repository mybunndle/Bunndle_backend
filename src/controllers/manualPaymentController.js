import mongoose from "mongoose";

import Order from "../model/OrderModel.js";
import Payment from "../model/PaymentModel.js";
import ManualPayment from "../model/manualPaymentModel.js";
import Asset from "../model/coAssetModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";
import User from "../model/userModel.js";

import { allocateFractions } from "../services/ownerShipService.js";
import { sendPaymentWelcomeEmail } from "../services/paymentWelcomeEmail.service.js";
import { sendManualBankDetailsEmail } from "../services/manualBankDetailsEmail.js";
import {
  manualOrderCreatedTemplates,
  manualPaymentSubmittedTemplates,
} from "../utils/manualPaymentNotificationTemplates.js";

import {
  uploadManualPaymentScreenshot,
  deleteManualPaymentScreenshot,
  getManualPaymentScreenshotSignedUrl,
} from "../services/imageStorageService.js";

import sendEmail from "../utils/email.js";

// ============================================================
// CONSTANTS
// ============================================================

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const REVIEW_STATUSES = ["PENDING_VERIFICATION", "REVIEW_REQUIRED"];

const PAYMENT_METHODS = ["BANK_TRANSFER", "IMPS", "NEFT", "RTGS", "UPI"];

// ============================================================
// COMMON HELPERS
// ============================================================

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isId = (value) => mongoose.isValidObjectId(value);

const getUserId = (req) => req.user?._id || req.user?.id || req.user?.userId;

const sameId = (a, b) => String(a) === String(b);

const normalizeUTR = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
const toPaise = (value) => {
  if (value === undefined || value === null || value === "") {
    return NaN;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NaN;
  }

  return Math.round(amount * 100);
};




const normalizeMultipleUTRs = (value) => {
  if (typeof value !== "string") {
    throw createError(400, "Transaction IDs must be a string");
  }

  const transactionIds = value
    .split(",")
    .map((v) => v.trim());

  if (
    transactionIds.length < 1 ||
    transactionIds.length > 20 ||
    transactionIds.some((v) => !v)
  ) {
    throw createError(
      400,
      "Provide 1–20 non-empty transaction IDs"
    );
  }

  for (const id of transactionIds) {
    if (!/^[A-Za-z0-9-]{6,80}$/.test(id)) {
      throw createError(
        400,
        `Invalid transaction ID: ${id}`
      );
    }
  }

  // Uppercase only for duplicate checking.
  // Original lowercase/uppercase stays unchanged.
  const normalizedTransactionIds = transactionIds.map(
    (v) => v.toUpperCase()
  );

  if (
    new Set(normalizedTransactionIds).size !==
    normalizedTransactionIds.length
  ) {
    throw createError(
      400,
      "Duplicate transaction IDs are not allowed"
    );
  }

  return {
    // Original casing preserved.
    transactionId: transactionIds.join(", "),

    transactionIds,

    // Normalized values for database comparisons.
    normalizedTransactionId:
      normalizedTransactionIds.join(", "),

    normalizedTransactionIds,

    isMultiplePayment: transactionIds.length > 1,
  };
};



const parseAdminBankCreditDate = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    throw createError(
      400,
      "bankCreditDate is required"
    );
  }

  if (
    typeof value !== "string" &&
    !(value instanceof Date)
  ) {
    throw createError(
      400,
      "Invalid bankCreditDate"
    );
  }

  let date;

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    // Date-only input is interpreted in IST.
    date = new Date(`${value}T00:00:00+05:30`);

    // Reject impossible dates such as 2026-02-30.
    const check = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = check.formatToParts(date);
    const getPart = (type) =>
      parts.find((p) => p.type === type)?.value;

    const reconstructed = [
      getPart("year"),
      getPart("month"),
      getPart("day"),
    ].join("-");

    if (reconstructed !== value) {
      throw createError(
        400,
        "Invalid calendar date"
      );
    }
  } else {
    if (
      typeof value === "string" &&
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
    ) {
      throw createError(
        400,
        "Use YYYY-MM-DD or an ISO 8601 date"
      );
    }

    date = new Date(value);
  }

  if (!Number.isFinite(date.getTime())) {
    throw createError(
      400,
      "Invalid bankCreditDate"
    );
  }

  if (date.getTime() > Date.now() + 10 * 60 * 1000) {
    throw createError(
      400,
      "Bank credit date cannot be in the future"
    );
  }

  return date;
};



const validDate = (value) => {
  if (!value) return false;

  const time = new Date(value).getTime();

  return Number.isFinite(time) && time <= Date.now() + 10 * 60 * 1000;
};


const normalizeBankCreditDate = (value) => {
  if (value === undefined || value === null || value === "") {
    throw createError(
      400,
      "bankCreditDate is required"
    );
  }

  // Accept:
  // 2026-11-24
  // 2026-11-24T08:00:00.000Z
  // 2026-11-24T13:30:00+05:30

  if (
    typeof value !== "string" &&
    !(value instanceof Date)
  ) {
    throw createError(
      400,
      "Invalid bankCreditDate format"
    );
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    throw createError(
      400,
      "Invalid bankCreditDate. Use YYYY-MM-DD or ISO date format"
    );
  }

  if (date.getTime() > Date.now() + 10 * 60 * 1000) {
    throw createError(
      400,
      "Bank credit date cannot be in the future"
    );
  }

  return date;
};


const handleError = (res, error, label) => {
  console.error(`${label} ERROR:`, error);

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate order or transaction reference",
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : "Internal server error",
  });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value));

const getBankDetails = () => {
  const bank = {
    accountHolder: process.env.MANUAL_BANK_ACCOUNT_HOLDER?.trim(),

    bankName: process.env.MANUAL_BANK_NAME?.trim(),

    accountNumber: process.env.MANUAL_BANK_ACCOUNT_NUMBER?.trim(),

    ifsc: process.env.MANUAL_BANK_IFSC?.trim(),
  };

  if (Object.values(bank).some((value) => !value)) {
    throw createError(500, "Manual payment bank configuration is incomplete");
  }

  return bank;
};

// ============================================================
// COMMON EMAIL HELPERS
// ============================================================

const sendNotification = async ({ to, subject, heading, body }) => {
  if (!to) return;

  const html = `
    <div style="
      max-width:650px;
      margin:auto;
      padding:24px;
      font-family:Arial,sans-serif;
      color:#172033;
      line-height:1.7;
    ">
      <h2 style="color:#124f8c;">
        ${escapeHtml(heading)}
      </h2>

      ${body}

      <p>
        Best Regards,<br>
        <strong>Team Bunndle</strong><br>
        A Brand of Agent Alliance Private Limited
      </p>

      <p>
        <a href="https://www.bunndle.in/">
          www.bunndle.in
        </a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
};

const sendEmailSafely = async (fn, id) => {
  try {
    await fn(id);
  } catch (error) {
    console.error("MANUAL PAYMENT EMAIL ERROR:", error);
  }
};

// ============================================================
// MANUAL ORDER CREATED EMAIL
// ============================================================

const sendManualOrderCreatedEmail = async (orderId) => {
  const order = await Order.findById(orderId).lean();

  if (!order) return;

  const [user, asset] = await Promise.all([
    User.findById(order.userId).select("name email").lean(),

    Asset.findById(order.assetId).select("assetName").lean(),
  ]);

  const { customerHtml, adminHtml } = manualOrderCreatedTemplates({
    customerName: user?.name || "Customer",
    customerEmail: user?.email,
    assetName: asset?.assetName,
    orderId: String(order._id),
    totalAmount: order.totalAmount,
  });

  const notifications = [];

  if (user?.email) {
    notifications.push({
      label: "customer",
      promise: sendEmail({
        to: user.email,
        subject: "Manual Payment Order Created – Bunndle",
        html: customerHtml,
      }),
    });
  }

  if (process.env.MANUAL_PAYMENT_ADMIN_EMAIL) {
    notifications.push({
      label: "admin",
      promise: sendEmail({
        to: process.env.MANUAL_PAYMENT_ADMIN_EMAIL,
        subject: "New Manual Order – Bank Details Required",
        html: adminHtml,
      }),
    });
  }

  const results = await Promise.allSettled(
    notifications.map(({ promise }) => promise),
  );

  const failures = results
    .map((result, index) => ({
      result,
      label: notifications[index].label,
    }))
    .filter(({ result }) => result.status === "rejected");

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(
        `MANUAL ORDER ${failure.label.toUpperCase()} EMAIL FAILED:`,
        failure.result.reason,
      );
    }

    throw new Error(
      `Manual order notification failed for: ${failures
        .map(({ label }) => label)
        .join(", ")}`,
    );
  }
};

// ============================================================
// MANUAL PAYMENT PROOF SUBMITTED EMAIL
// ============================================================

const sendManualPaymentSubmittedEmail = async (orderId) => {
  const order = await Order.findById(orderId).lean();

  if (!order) return;

  const [user, asset, manual] = await Promise.all([
    User.findById(order.userId).select("name email").lean(),

    Asset.findById(order.assetId).select("assetName").lean(),

    ManualPayment.findOne({ orderId })
      .select("transactionId amountPaid paymentMethod status")
      .lean(),
  ]);

  if (!manual) {
    throw new Error("Manual payment record not found for notification");
  }

  const { customerHtml, adminHtml } = manualPaymentSubmittedTemplates({
    customerName: user?.name || "Customer",
    customerEmail: user?.email,
    assetName: asset?.assetName,
    orderId: String(order._id),
    transactionId: manual.transactionId,
    amountPaid: manual.amountPaid,
    paymentMethod: manual.paymentMethod,
  });

  const notifications = [];

  if (user?.email) {
    notifications.push({
      label: "customer",
      promise: sendEmail({
        to: user.email,
        subject: "Payment Proof Received – Bunndle",
        html: customerHtml,
      }),
    });
  }

  if (process.env.MANUAL_PAYMENT_ADMIN_EMAIL) {
    notifications.push({
      label: "admin",
      promise: sendEmail({
        to: process.env.MANUAL_PAYMENT_ADMIN_EMAIL,
        subject: "Manual Payment Awaiting Verification – Bunndle",
        html: adminHtml,
      }),
    });
  }

  const results = await Promise.allSettled(
    notifications.map(({ promise }) => promise),
  );

  const failures = results
    .map((result, index) => ({
      result,
      label: notifications[index].label,
    }))
    .filter(({ result }) => result.status === "rejected");

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(
        `MANUAL PAYMENT ${failure.label.toUpperCase()} EMAIL FAILED:`,
        failure.result.reason,
      );
    }

    throw new Error(
      `Manual payment notification failed for: ${failures
        .map(({ label }) => label)
        .join(", ")}`,
    );
  }
};

// ============================================================
// MANUAL PAYMENT REJECTED EMAIL
// EXISTING FUNCTION PRESERVED
// ============================================================

const sendManualPaymentRejectedEmail = async (orderId) => {
  const order = await Order.findById(orderId).lean();

  if (!order) return;

  const [user, manual] = await Promise.all([
    User.findById(order.userId).select("name email").lean(),

    ManualPayment.findOne({ orderId }).select("rejectionReason").lean(),
  ]);

  await sendNotification({
    to: user?.email,

    subject: "Manual Payment Verification Update – Bunndle",

    heading: "Payment Verification Unsuccessful",

    body: `
      <p>
        Dear ${escapeHtml(user?.name || "Customer")},
      </p>

      <p>
        Your manual payment could not be verified.
      </p>

      <p>
        <strong>Reason:</strong>
        ${escapeHtml(
          manual?.rejectionReason || "Payment verification unsuccessful",
        )}
      </p>

      <p>
        If you believe the funds were transferred,
        please contact Bunndle support.
      </p>
    `,
  });
};

// ============================================================
// PURCHASE HISTORY SNAPSHOT HELPERS
// ============================================================

const buildAssetSnapshot = (asset, count) => ({
  assetName: asset.assetName ?? null,
  assetCode: asset.assetCode ?? null,
  specification: asset.specification ?? null,
  assetCost: asset.assetCost ?? null,

  registeredLegalOwner: asset.registeredLegalOwner ?? null,

  totalFractions: asset.totalFractions ?? null,

  amountPerFraction: asset.amountPerFraction ?? null,

  rentalAmountPerFraction: asset.rentalAmountPerFraction ?? null,

  totalMonthlyRental:
    asset.rentalAmountPerFraction == null
      ? null
      : Number(asset.rentalAmountPerFraction) * count,

  durationMonths: asset.durationMonths ?? null,
  lockInMonths: asset.lockInMonths ?? null,
});

const buildUserSnapshot = (user) => ({
  name: user?.name || user?.fullName || null,

  email: user?.email || null,

  phone: user?.fullPhone || user?.phone || user?.mobile || null,
});

// ============================================================
// SUCCESSFUL PAYMENT EMAIL
// REUSES EXISTING PAYMENT WELCOME EMAIL SERVICE
// ============================================================

const sendPurchaseConfirmation = async (purchaseHistoryId) => {
  const purchase = await PurchaseHistory.findOneAndUpdate(
    {
      _id: purchaseHistoryId,
      paymentStatus: "SUCCESS",

      $or: [
        { paymentEmailStatus: "PENDING" },
        { paymentEmailStatus: { $exists: false } },
      ],
    },
    {
      $set: {
        paymentEmailStatus: "SENDING",
        paymentEmailClaimedAt: new Date(),
      },

      $inc: {
        paymentEmailAttempts: 1,
      },
    },
    { new: true },
  );

  if (!purchase) return;

  try {
    const [user, asset] = await Promise.all([
      User.findById(purchase.userId).select("name fullName email").lean(),

      Asset.findById(purchase.assetId)
        .select(
          "assetName assetCode assetCost totalFractions rentalAmountPerFraction",
        )
        .lean(),
    ]);

    const userSnapshot = purchase.userSnapshot || {};
    const assetSnapshot = purchase.assetSnapshot || {};

    const name =
      userSnapshot.name || user?.name || user?.fullName || "Customer";

    const email = userSnapshot.email || user?.email;

    if (!email) {
      throw new Error("Customer email not found");
    }

    const count = Number(purchase.fractionsPurchased);

    const rental =
      assetSnapshot.rentalAmountPerFraction ??
      asset?.rentalAmountPerFraction ??
      null;

    const totalRental =
      assetSnapshot.totalMonthlyRental ??
      (rental == null ? null : Number(rental) * count);

    await sendPaymentWelcomeEmail({
      email,
      name,

      assetName: assetSnapshot.assetName ?? asset?.assetName ?? null,

      assetCode: assetSnapshot.assetCode ?? asset?.assetCode ?? null,

      registeredLegalOwner: name,

      totalAssetValue: assetSnapshot.assetCost ?? asset?.assetCost ?? null,

      totalFractions:
        assetSnapshot.totalFractions ?? asset?.totalFractions ?? null,

      amountPerFraction: purchase.amountPerFraction,

      fractionsPurchased: count,

      totalAmountPaid: purchase.totalAmount,

      acquisitionDate: purchase.paidAt || purchase.createdAt,

      monthlyRentalPerFraction: rental,

      totalFixedMonthlyRental: totalRental,

      transactionId: purchase.transactionReference,
    });

    await PurchaseHistory.updateOne(
      {
        _id: purchase._id,
        paymentEmailStatus: "SENDING",
      },
      {
        $set: {
          paymentEmailStatus: "SENT",
          paymentEmailSentAt: new Date(),
        },

        $unset: {
          paymentEmailClaimedAt: "",
        },
      },
    );
  } catch (error) {
    console.error("MANUAL PAYMENT SUCCESS EMAIL FAILED:", error);

    await PurchaseHistory.updateOne(
      {
        _id: purchase._id,
        paymentEmailStatus: "SENDING",
      },
      {
        $set: {
          paymentEmailStatus: "FAILED",
        },

        $unset: {
          paymentEmailClaimedAt: "",
        },
      },
    );
  }
};

// ============================================================
// 1. CREATE MANUAL ORDER
// ============================================================

export const createManualOrder = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!isId(userId)) {
      throw createError(401, "User authentication required");
    }

    const { assetId, fractions } = req.body || {};

    if (!isId(assetId)) {
      throw createError(400, "Invalid asset ID");
    }

    const count = Number(fractions);

    if (
      fractions === undefined ||
      fractions === null ||
      fractions === "" ||
      !Number.isSafeInteger(count) ||
      count <= 0
    ) {
      throw createError(400, "Invalid fraction count");
    }

    const user = await User.findById(userId).select(
      "name email kycStatus isKycVerified",
    );

    if (!user) {
      throw createError(404, "User not found");
    }

    if (user.kycStatus !== "VERIFIED" || !user.isKycVerified) {
      throw createError(403, "KYC verification is required");
    }

    const asset = await Asset.findOne({
      _id: assetId,
      status: "ACTIVE",
      availableFractions: { $gte: count },
    });

    if (!asset) {
      throw createError(409, "Requested fractions are unavailable");
    }

    const amountPerFraction = Number(asset.amountPerFraction);

    const totalAmount = amountPerFraction * count;

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw createError(400, "Invalid asset price");
    }

    const expiresAt = new Date(Date.now() + SEVEN_DAYS);

    // No inventory reservation here.
    // No Payment or ManualPayment record.
    const order = await Order.create({
      userId,
      assetId,

      paymentGateway: "MANUAL",

      fractions: count,
      amountPerFraction,
      totalAmount,

      status: "PENDING_PAYMENT",

      expiresAt,
    });

    await sendEmailSafely(sendManualOrderCreatedEmail, order._id);

    return res.status(201).json({
      success: true,

      message:
        "Manual order created successfully. Our team will share bank account details through email.",

      order: {
        orderId: order._id,
        assetId: order.assetId,
        assetName: asset.assetName,

        fractions: order.fractions,
        amountPerFraction: order.amountPerFraction,

        totalAmount: order.totalAmount,

        paymentGateway: order.paymentGateway,

        status: order.status,
        expiresAt: order.expiresAt,

        fractionsReserved: false,
      },
    });
  } catch (error) {
    return handleError(res, error, "CREATE MANUAL ORDER");
  }
};

// ============================================================
// 2. ADMIN SENDS BANK DETAILS EMAIL
// ============================================================

// export const sendManualBankDetails = async (req, res) => {
//   const adminId = getUserId(req);
//   const { orderId } = req.params;

//   if (!isId(adminId) || !isId(orderId)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid admin or order ID",
//     });
//   }

//   let claimed = false;
//   let emailAccepted = false;

//   try {
//     // Validate .env configuration.
//     getBankDetails();

//     const claimTime = new Date();

//     // Atomic claim prevents concurrent admin sends.
//     const order = await Order.findOneAndUpdate(
//       {
//         _id: orderId,

//         paymentGateway: "MANUAL",

//         status: "PENDING_PAYMENT",

//         bankDetailsSentAt: null,
//         bankDetailsSendingAt: null,

//         expiresAt: { $gt: claimTime },
//       },
//       {
//         $set: {
//           bankDetailsSendingAt: claimTime,
//         },
//       },
//       { new: true },
//     );

//     if (!order) {
//       throw createError(
//         409,
//         "Order expired, bank details already sent, or sending is in progress",
//       );
//     }

//     claimed = true;

//     const [user, asset] = await Promise.all([
//       User.findById(order.userId).select("name email").lean(),

//       Asset.findById(order.assetId).select("assetName").lean(),
//     ]);

//     if (!user?.email || !asset) {
//       throw createError(409, "Customer email or asset not found");
//     }

//     // Uses manualBankDetailsTemplate.js
//     // through manualBankDetailsEmail.service.js.
//     await sendManualBankDetailsEmail({
//       email: user.email,

//       customerName: user.name || "Customer",

//       orderId: String(order._id),

//       assetName: asset.assetName,

//       fractions: order.fractions,

//       amountPerFraction: order.amountPerFraction,

//       totalAmount: order.totalAmount,

//       expiresAt: order.expiresAt,
//     });

//     emailAccepted = true;

//     const updated = await Order.findOneAndUpdate(
//       {
//         _id: orderId,

//         paymentGateway: "MANUAL",

//         status: "PENDING_PAYMENT",

//         bankDetailsSentAt: null,

//         bankDetailsSendingAt: claimTime,
//       },
//       {
//         $set: {
//           bankDetailsSentAt: new Date(),
//           bankDetailsSentBy: adminId,
//         },

//         $unset: {
//           bankDetailsSendingAt: "",
//         },
//       },
//       { new: true },
//     );

//     if (!updated) {
//       throw createError(
//         409,
//         "Email sent but order update failed. Admin reconciliation required.",
//       );
//     }

//     claimed = false;

//     return res.status(200).json({
//       success: true,

//       message: "Bank details emailed successfully",

//       data: {
//         orderId: updated._id,

//         assetName: asset.assetName,

//         customerName: user.name || "Customer",

//         customerEmail: user.email,

//         paymentGateway: updated.paymentGateway,

//         status: updated.status,

//         totalAmount: updated.totalAmount,

//         bankDetailsSent: true,

//         bankDetailsSentAt: updated.bankDetailsSentAt,

//         expiresAt: updated.expiresAt,
//       },
//     });
//   } catch (error) {
//     if (claimed && !emailAccepted) {
//       // Keep the send lock when delivery is uncertain.
//       // Check mail provider logs before unlocking.
//       console.error("MANUAL BANK EMAIL NEEDS RECONCILIATION:", {
//         orderId,
//         error: error.message,
//       });
//     }

//     return handleError(res, error, "SEND MANUAL BANK DETAILS");
//   }
// };

export const sendManualBankDetails = async (req, res) => {
  const adminId = getUserId(req);
  const { orderId } = req.params;

  if (!isId(adminId) || !isId(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin or order ID",
    });
  }

  let claimed = false;
  let emailAccepted = false;
  let claimTime = null;

  try {
    // ==========================================
    // 1. VALIDATE BANK CONFIGURATION
    // ==========================================

    getBankDetails();

    // ==========================================
    // 2. VALIDATE ORDER
    // ==========================================

    const existingOrder = await Order.findOne({
      _id: orderId,
      paymentGateway: "MANUAL",
    })
      .select("_id status expiresAt bankDetailsSentAt bankDetailsSendingAt")
      .lean();

    if (!existingOrder) {
      throw createError(404, "Manual payment order not found");
    }

    const allowedStatuses = ["PENDING_PAYMENT", "PENDING_VERIFICATION"];

    if (!allowedStatuses.includes(existingOrder.status)) {
      throw createError(
        409,
        "Bank details cannot be sent for completed, rejected or expired orders",
      );
    }

    // An unsubmitted order must still be within its payment window.
    // PENDING_VERIFICATION can be resent after the payment
    // window because proof was submitted earlier.
    if (
      existingOrder.status === "PENDING_PAYMENT" &&
      (!existingOrder.expiresAt ||
        new Date(existingOrder.expiresAt).getTime() <= Date.now())
    ) {
      throw createError(409, "Manual payment order has expired");
    }

    if (existingOrder.bankDetailsSendingAt) {
      throw createError(
        409,
        "Bank details email is already being processed. Please check delivery status before retrying.",
      );
    }

    // ==========================================
    // 3. ATOMIC EMAIL SEND LOCK
    // ==========================================

    claimTime = new Date();

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,

        paymentGateway: "MANUAL",

        $or: [
          {
            status: "PENDING_PAYMENT",
            expiresAt: { $gt: claimTime },
          },
          {
            status: "PENDING_VERIFICATION",
          },
        ],

        // Prevent concurrent sends.
        bankDetailsSendingAt: null,

        // Do not require bankDetailsSentAt to be null.
        // This allows repeated emails.
      },
      {
        $set: {
          bankDetailsSendingAt: claimTime,
        },
      },
      {
        new: true,
      },
    );

    if (!order) {
      throw createError(
        409,
        "Order is not eligible for bank details email or another email request is in progress",
      );
    }

    claimed = true;

    // ==========================================
    // 4. FETCH CUSTOMER AND ASSET
    // ==========================================

    const [user, asset] = await Promise.all([
      User.findById(order.userId).select("name email").lean(),

      Asset.findById(order.assetId).select("assetName").lean(),
    ]);

    if (!user?.email) {
      throw createError(404, "Customer email address not found");
    }

    if (!asset) {
      throw createError(404, "Asset not found");
    }

    // ==========================================
    // 5. IDENTIFY FIRST SEND OR RESEND
    // ==========================================

    const isResend = Boolean(order.bankDetailsSentAt);

    const previousSentAt = order.bankDetailsSentAt || null;

    // ==========================================
    // 6. SEND BANK DETAILS EMAIL
    // ==========================================

    await sendManualBankDetailsEmail({
      email: user.email,

      customerName: user.name || "Customer",

      orderId: String(order._id),

      assetName: asset.assetName,

      fractions: order.fractions,

      amountPerFraction: order.amountPerFraction,

      totalAmount: order.totalAmount,

      expiresAt: order.expiresAt,
    });

    // Email provider accepted the request.
    emailAccepted = true;

    // ==========================================
    // 7. UPDATE EMAIL STATUS
    // ==========================================

    const sentAt = new Date();

    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,

        paymentGateway: "MANUAL",

        status: {
          $in: ["PENDING_PAYMENT", "PENDING_VERIFICATION"],
        },

        // Only release our own lock.
        bankDetailsSendingAt: claimTime,
      },
      {
        $set: {
          bankDetailsSentAt: sentAt,
          bankDetailsSentBy: adminId,
        },

        $unset: {
          bankDetailsSendingAt: "",
        },
      },
      {
        new: true,
      },
    );

    if (!updated) {
      throw createError(
        409,
        "Email was accepted but order update failed. Admin reconciliation required.",
      );
    }

    claimed = false;

    // ==========================================
    // 8. SUCCESS RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message: isResend
        ? "Bank details email resent successfully"
        : "Bank details emailed successfully",

      data: {
        orderId: updated._id,

        assetName: asset.assetName,

        customerName: user.name || "Customer",

        customerEmail: user.email,

        paymentGateway: updated.paymentGateway,

        status: updated.status,

        totalAmount: updated.totalAmount,

        bankDetailsSent: true,

        email_sent: true,

        isResend,

        previousSentAt,

        bankDetailsSentAt: updated.bankDetailsSentAt,

        expiresAt: updated.expiresAt,
      },
    });
  } catch (error) {
    // ==========================================
    // 9. ERROR HANDLING
    // ==========================================

    if (claimed) {
      // Keep the send lock if delivery is uncertain.
      // SMTP may accept an email even if the request
      // subsequently fails. Reconcile before unlocking.

      console.error("MANUAL BANK EMAIL RECONCILIATION REQUIRED:", {
        orderId,
        emailAccepted,
        error: error.message,
      });
    }

    return handleError(res, error, "SEND MANUAL BANK DETAILS");
  }
};

// 3. CUSTOMER SUBMITS PAYMENT PROOF

// export const submitManualProof = async (req, res) => {
//   const userId = getUserId(req);
//   const { orderId } = req.params;

//   const { transactionId, paymentMethod, amountPaid, paymentDate } =
//     req.body || {};

//   const utr = normalizeUTR(transactionId);

//   const skipBankEmailCheck =
//     process.env.NODE_ENV === "development" &&
//     process.env.MANUAL_PAYMENT_SKIP_BANK_EMAIL_CHECK === "true";

//   if (!isId(userId) || !isId(orderId)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid user or order ID",
//     });
//   }

//   if (
//     !/^[A-Z0-9-]{6,80}$/.test(utr) ||
//     !PAYMENT_METHODS.includes(paymentMethod) ||
//     !Number.isFinite(toPaise(amountPaid)) ||
//     !validDate(paymentDate) ||
//     !Array.isArray(req.files) ||
//     req.files.length < 1 ||
//     req.files.length > 3
//   ) {
//     return res.status(400).json({
//       success: false,
//       message:
//         "Valid UTR, payment method, amount, date and 1–3 screenshots required",
//     });
//   }

//   const uploadedFiles = [];
//   let oldScreenshots = [];

//   let committed = false;
//   let session = null;

//   let manualPaymentId = null;
//   let isUpdated = false;

//   try {
//     const order = await Order.findOne({
//       _id: orderId,
//       userId,
//       paymentGateway: "MANUAL",
//     }).lean();

//     if (!order) {
//       throw createError(404, "Manual order not found");
//     }

//     const allowedOrderStatuses = ["PENDING_PAYMENT", "PENDING_VERIFICATION"];

//     if (!allowedOrderStatuses.includes(order.status)) {
//       throw createError(409, "This order no longer accepts payment proof");
//     }

//     if (!order.expiresAt || new Date(order.expiresAt).getTime() <= Date.now()) {
//       throw createError(409, "Manual payment order has expired");
//     }

//     if (!skipBankEmailCheck && !order.bankDetailsSentAt) {
//       throw createError(409, "Bank details have not been sent for this order");
//     }

//     if (toPaise(amountPaid) !== toPaise(order.totalAmount)) {
//       throw createError(409, "Payment amount does not match order amount");
//     }

//     const currentManual = await ManualPayment.findOne({
//       orderId,
//     }).lean();

//     if (
//       currentManual &&
//       !["PENDING_VERIFICATION", "REVIEW_REQUIRED"].includes(
//         currentManual.status,
//       )
//     ) {
//       throw createError(
//         409,
//         "Payment has already been finalized and cannot be modified",
//       );
//     }

//     if (currentManual && order.status !== "PENDING_VERIFICATION") {
//       throw createError(
//         409,
//         "Existing payment and order status are inconsistent",
//       );
//     }

//     if (!currentManual && order.status !== "PENDING_PAYMENT") {
//       throw createError(
//         409,
//         "Payment proof is missing for an order awaiting verification",
//       );
//     }

//     const duplicateUTR = await ManualPayment.findOne({
//       normalizedTransactionId: utr,
//       orderId: { $ne: order._id },
//     }).lean();

//     if (duplicateUTR) {
//       throw createError(
//         409,
//         "This transaction reference is already associated with another order",
//       );
//     }

//     for (const file of req.files) {
//       const uploaded = await uploadManualPaymentScreenshot(file, orderId);

//       uploadedFiles.push(uploaded);
//     }

//     session = await mongoose.startSession();

//     await session.withTransaction(async () => {
//       const now = new Date();

//       const currentOrder = await Order.findOne({
//         _id: orderId,
//         userId,
//         paymentGateway: "MANUAL",
//       }).session(session);

//       if (!currentOrder) {
//         throw createError(404, "Manual order not found");
//       }

//       if (!allowedOrderStatuses.includes(currentOrder.status)) {
//         throw createError(409, "Order no longer accepts payment proof");
//       }

//       if (!currentOrder.expiresAt || new Date(currentOrder.expiresAt) <= now) {
//         throw createError(409, "Manual order has expired");
//       }

//       if (!skipBankEmailCheck && !currentOrder.bankDetailsSentAt) {
//         throw createError(409, "Bank details not sent");
//       }

//       const duplicate = await ManualPayment.findOne({
//         normalizedTransactionId: utr,
//         orderId: { $ne: currentOrder._id },
//       }).session(session);

//       if (duplicate) {
//         throw createError(
//           409,
//           "Transaction reference already used for another order",
//         );
//       }

//       const existing = await ManualPayment.findOne({
//         orderId: currentOrder._id,
//       }).session(session);

//       const screenshots = uploadedFiles.map((file) => ({
//         url: file.url,
//         fileId: file.fileId,
//         uploadedAt: now,
//       }));

//       if (existing) {
//         if (currentOrder.status !== "PENDING_VERIFICATION") {
//           throw createError(409, "Order and payment status mismatch");
//         }

//         if (
//           !["PENDING_VERIFICATION", "REVIEW_REQUIRED"].includes(existing.status)
//         ) {
//           throw createError(
//             409,
//             "Payment has been finalized and cannot be updated",
//           );
//         }

//         if (
//           !sameId(existing.userId, userId) ||
//           !sameId(existing.assetId, currentOrder.assetId)
//         ) {
//           throw createError(409, "Manual payment ownership mismatch");
//         }

//         oldScreenshots = (existing.paymentScreenshots || []).map((file) => ({
//           fileId: file.fileId,
//         }));

//         existing.transactionId = utr;
//         existing.normalizedTransactionId = utr;

//         existing.paymentMethod = paymentMethod;
//         existing.amountPaid = Number(amountPaid);
//         existing.paymentDate = new Date(paymentDate);

//         existing.paymentScreenshots = screenshots;

//         existing.status = "PENDING_VERIFICATION";
//         existing.adminRemark = null;

//         existing.bankCreditVerified = false;

//         existing.verifiedBy = null;
//         existing.verifiedAt = null;

//         existing.bankCreditReference = null;
//         existing.bankCreditAmount = null;
//         existing.bankCreditDate = null;

//         existing.rejectionReason = null;
//         existing.rejectedAt = null;

//         existing.submittedAt = now;

//         await existing.save({ session });

//         manualPaymentId = existing._id;
//         isUpdated = true;
//       } else {
//         if (currentOrder.status !== "PENDING_PAYMENT") {
//           throw createError(409, "Order already awaiting verification");
//         }

//         const [manual] = await ManualPayment.create(
//           [
//             {
//               userId,
//               orderId: currentOrder._id,
//               assetId: currentOrder.assetId,

//               fractions: currentOrder.fractions,

//               amountPerFraction: currentOrder.amountPerFraction,

//               totalAmount: currentOrder.totalAmount,

//               amountPaid: Number(amountPaid),

//               paymentMethod,

//               transactionId: utr,
//               normalizedTransactionId: utr,

//               paymentDate: new Date(paymentDate),

//               paymentScreenshots: screenshots,

//               status: "PENDING_VERIFICATION",

//               submittedAt: now,

//               expiresAt: currentOrder.expiresAt,
//             },
//           ],
//           { session },
//         );

//         manualPaymentId = manual._id;

//         currentOrder.status = "PENDING_VERIFICATION";

//         await currentOrder.save({ session });

//         isUpdated = false;
//       }
//     });

//     committed = true;

//     if (isUpdated && oldScreenshots.length > 0) {
//       const cleanup = await Promise.allSettled(
//         oldScreenshots
//           .filter((file) => file.fileId)
//           .map((file) => deleteManualPaymentScreenshot(file.fileId)),
//       );

//       for (const result of cleanup) {
//         if (result.status === "rejected") {
//           console.error("OLD MANUAL SCREENSHOT CLEANUP FAILED:", result.reason);
//         }
//       }
//     }

//     await sendEmailSafely(sendManualPaymentSubmittedEmail, orderId);

//     return res.status(isUpdated ? 200 : 201).json({
//       success: true,

//       message: isUpdated
//         ? "Manual payment proof updated successfully"
//         : "Manual payment proof submitted successfully",

//       data: {
//         manualPaymentId,
//         orderId,

//         transactionId: utr,
//         paymentMethod,
//         amountPaid: Number(amountPaid),
//         paymentDate: new Date(paymentDate),

//         screenshotCount: uploadedFiles.length,

//         status: "PENDING_VERIFICATION",

//         isUpdated,
//       },

//       note: "Payment will be verified by the Bunndle admin team.",
//     });
//   } catch (error) {
//     return handleError(res, error, "SUBMIT MANUAL PROOF");
//   } finally {
//     if (session) {
//       await session.endSession();
//     }

//     if (!committed) {
//       await Promise.allSettled(
//         uploadedFiles.map((file) => deleteManualPaymentScreenshot(file.fileId)),
//       );
//     }
//   }
// };

export const submitManualProof = async (req, res) => {
  const userId = getUserId(req);
  const { orderId } = req.params;

  const { transactionId, paymentMethod, amountPaid, paymentDate } =
    req.body || {};

  const skipBankEmailCheck =
    process.env.NODE_ENV === "development" &&
    process.env.MANUAL_PAYMENT_SKIP_BANK_EMAIL_CHECK === "true";

  const uploadedFiles = [];
  let oldScreenshots = [];

  let committed = false;
  let session = null;

  let manualPaymentId = null;
  let isUpdated = false;

  try {
    // ==========================================
    // 1. VALIDATE USER AND ORDER
    // ==========================================

    if (!isId(userId) || !isId(orderId)) {
      throw createError(400, "Invalid user or order ID");
    }

    // ==========================================
    // 2. NORMALIZE SINGLE OR MULTIPLE UTRs
    // ==========================================

    const {
      transactionId: normalizedTransactionString,
      transactionIds,
      isMultiplePayment,
    } = normalizeMultipleUTRs(transactionId);

    const normalizedTransactionIds = transactionIds;

    // ==========================================
    // 3. VALIDATE PAYMENT DETAILS
    // ==========================================

    if (
      !PAYMENT_METHODS.includes(paymentMethod) ||
      !Number.isFinite(toPaise(amountPaid)) ||
      toPaise(amountPaid) <= 0 ||
      !validDate(paymentDate) ||
      !Array.isArray(req.files) ||
      req.files.length < 1 ||
      req.files.length > 3
    ) {
      throw createError(
        400,
        "Valid payment method, amount, date and 1–3 screenshots are required",
      );
    }

    // ==========================================
    // 4. FIND MANUAL ORDER
    // ==========================================

    const order = await Order.findOne({
      _id: orderId,
      userId,
      paymentGateway: "MANUAL",
    }).lean();

    if (!order) {
      throw createError(404, "Manual order not found");
    }

    const allowedOrderStatuses = ["PENDING_PAYMENT", "PENDING_VERIFICATION"];

    if (!allowedOrderStatuses.includes(order.status)) {
      throw createError(409, "This order no longer accepts payment proof");
    }

    if (!order.expiresAt || new Date(order.expiresAt).getTime() <= Date.now()) {
      throw createError(409, "Manual payment order has expired");
    }

    if (!skipBankEmailCheck && !order.bankDetailsSentAt) {
      throw createError(409, "Bank details have not been sent for this order");
    }

    if (toPaise(amountPaid) !== toPaise(order.totalAmount)) {
      throw createError(
        409,
        "Total payment amount does not match order amount",
      );
    }

    // ==========================================
    // 5. CHECK EXISTING MANUAL PAYMENT
    // ==========================================

    const currentManual = await ManualPayment.findOne({
      orderId,
    }).lean();

    if (
      currentManual &&
      !["PENDING_VERIFICATION", "REVIEW_REQUIRED"].includes(
        currentManual.status,
      )
    ) {
      throw createError(
        409,
        "Payment has already been finalized and cannot be modified",
      );
    }

    if (currentManual && order.status !== "PENDING_VERIFICATION") {
      throw createError(
        409,
        "Existing payment and order status are inconsistent",
      );
    }

    if (!currentManual && order.status !== "PENDING_PAYMENT") {
      throw createError(
        409,
        "Payment proof is missing for an order awaiting verification",
      );
    }

    // ==========================================
    // 6. CHECK DUPLICATE TRANSACTION IDs
    // ==========================================

    const duplicateUTR = await ManualPayment.findOne({
      orderId: {
        $ne: order._id,
      },

      $or: [
        {
          normalizedTransactionIds: {
            $in: normalizedTransactionIds,
          },
        },
        {
          // Support historical single-UTR records.
          normalizedTransactionId: {
            $in: normalizedTransactionIds,
          },
        },
      ],
    }).lean();

    if (duplicateUTR) {
      throw createError(
        409,
        "One or more transaction IDs are already associated with another order",
      );
    }

    // ==========================================
    // 7. UPLOAD PAYMENT SCREENSHOTS
    // ==========================================

    for (const file of req.files) {
      const uploaded = await uploadManualPaymentScreenshot(file, orderId);

      uploadedFiles.push(uploaded);
    }

    // ==========================================
    // 8. START MONGODB TRANSACTION
    // ==========================================

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const now = new Date();

      // ========================================
      // 8.1 RECHECK ORDER
      // ========================================

      const currentOrder = await Order.findOne({
        _id: orderId,
        userId,
        paymentGateway: "MANUAL",
      }).session(session);

      if (!currentOrder) {
        throw createError(404, "Manual order not found");
      }

      if (!allowedOrderStatuses.includes(currentOrder.status)) {
        throw createError(409, "Order no longer accepts payment proof");
      }

      if (!currentOrder.expiresAt || new Date(currentOrder.expiresAt) <= now) {
        throw createError(409, "Manual order has expired");
      }

      if (!skipBankEmailCheck && !currentOrder.bankDetailsSentAt) {
        throw createError(409, "Bank details have not been sent");
      }

      if (toPaise(amountPaid) !== toPaise(currentOrder.totalAmount)) {
        throw createError(
          409,
          "Total payment amount does not match order amount",
        );
      }

      // ========================================
      // 8.2 RECHECK DUPLICATE UTRs
      // ========================================

      const duplicate = await ManualPayment.findOne({
        orderId: {
          $ne: currentOrder._id,
        },

        $or: [
          {
            normalizedTransactionIds: {
              $in: normalizedTransactionIds,
            },
          },
          {
            normalizedTransactionId: {
              $in: normalizedTransactionIds,
            },
          },
        ],
      }).session(session);

      if (duplicate) {
        throw createError(
          409,
          "One or more transaction IDs are already used for another order",
        );
      }

      // ========================================
      // 8.3 FIND EXISTING MANUAL PAYMENT
      // ========================================

      const existing = await ManualPayment.findOne({
        orderId: currentOrder._id,
      }).session(session);

      const screenshots = uploadedFiles.map((file) => ({
        url: file.url,
        fileId: file.fileId,
        uploadedAt: now,
      }));

      // ========================================
      // 9. UPDATE EXISTING MANUAL PAYMENT
      // ========================================

      if (existing) {
        if (currentOrder.status !== "PENDING_VERIFICATION") {
          throw createError(409, "Order and payment status mismatch");
        }

        if (
          !["PENDING_VERIFICATION", "REVIEW_REQUIRED"].includes(existing.status)
        ) {
          throw createError(
            409,
            "Payment has been finalized and cannot be updated",
          );
        }

        if (
          !sameId(existing.userId, userId) ||
          !sameId(existing.assetId, currentOrder.assetId)
        ) {
          throw createError(409, "Manual payment ownership mismatch");
        }

        // Save previous screenshot IDs.
        oldScreenshots = (existing.paymentScreenshots || []).map((file) => ({
          fileId: file.fileId,
        }));

        // ------------------------------------
        // UPDATE SINGLE / MULTIPLE UTRs
        // ------------------------------------

        existing.transactionId = normalizedTransactionString;

        existing.normalizedTransactionId = normalizedTransactionString;

        existing.normalizedTransactionIds = normalizedTransactionIds;

        // ------------------------------------
        // UPDATE PAYMENT DETAILS
        // ------------------------------------

        existing.paymentMethod = paymentMethod;

        existing.amountPaid = Number(amountPaid);

        existing.paymentDate = new Date(paymentDate);

        // Replace old screenshots.
        existing.paymentScreenshots = screenshots;

        // Reset verification information.
        existing.status = "PENDING_VERIFICATION";

        existing.adminRemark = null;

        existing.bankCreditVerified = false;

        existing.verifiedBy = null;
        existing.verifiedAt = null;

        existing.bankCreditReference = null;
        existing.bankCreditAmount = null;
        existing.bankCreditDate = null;

        existing.rejectionReason = null;
        existing.rejectedAt = null;

        existing.submittedAt = now;

        await existing.save({ session });

        manualPaymentId = existing._id;
        isUpdated = true;
      } else {
        // ====================================
        // 10. CREATE NEW MANUAL PAYMENT
        // ====================================

        if (currentOrder.status !== "PENDING_PAYMENT") {
          throw createError(409, "Order already awaiting verification");
        }

        const [manual] = await ManualPayment.create(
          [
            {
              userId,

              orderId: currentOrder._id,

              assetId: currentOrder.assetId,

              fractions: currentOrder.fractions,

              amountPerFraction: currentOrder.amountPerFraction,

              totalAmount: currentOrder.totalAmount,

              amountPaid: Number(amountPaid),

              paymentMethod,

              // --------------------------------
              // SINGLE OR MULTIPLE TRANSACTIONS
              // --------------------------------

              transactionId: normalizedTransactionString,

              normalizedTransactionId: normalizedTransactionString,

              normalizedTransactionIds,

              paymentDate: new Date(paymentDate),

              paymentScreenshots: screenshots,

              status: "PENDING_VERIFICATION",

              submittedAt: now,

              expiresAt: currentOrder.expiresAt,
            },
          ],
          { session },
        );

        manualPaymentId = manual._id;

        // Move order into verification.
        currentOrder.status = "PENDING_VERIFICATION";

        await currentOrder.save({
          session,
        });

        isUpdated = false;
      }
    });

    // ==========================================
    // 11. TRANSACTION COMMITTED
    // ==========================================

    committed = true;

    // ==========================================
    // 12. DELETE OLD SCREENSHOTS
    // ==========================================

    if (isUpdated && oldScreenshots.length > 0) {
      const cleanup = await Promise.allSettled(
        oldScreenshots
          .filter((file) => file.fileId)
          .map((file) => deleteManualPaymentScreenshot(file.fileId)),
      );

      for (const result of cleanup) {
        if (result.status === "rejected") {
          console.error("OLD MANUAL SCREENSHOT CLEANUP FAILED:", result.reason);
        }
      }
    }

    // ==========================================
    // 13. SEND PAYMENT SUBMISSION EMAIL
    // ==========================================

    await sendEmailSafely(sendManualPaymentSubmittedEmail, orderId);

    // ==========================================
    // 14. SUCCESS RESPONSE
    // ==========================================

    return res.status(isUpdated ? 200 : 201).json({
      success: true,

      message: isUpdated
        ? "Manual payment proof updated successfully"
        : "Manual payment proof submitted successfully",

      data: {
        manualPaymentId,
        orderId,

        // Comma-separated transaction IDs.
        transactionId: normalizedTransactionString,

        // Individual transaction IDs.
        transactionIds,

        // Indicates multiple transfers.
        isMultiplePayment,

        transactionCount: transactionIds.length,

        paymentMethod,

        // Total payment across all transfers.
        amountPaid: Number(amountPaid),

        paymentDate: new Date(paymentDate),

        screenshotCount: uploadedFiles.length,

        status: "PENDING_VERIFICATION",

        isUpdated,
      },

      note: "Payment will be verified by the Bunndle admin team.",
    });
  } catch (error) {
    // ==========================================
    // 15. ERROR HANDLING
    // ==========================================

    return handleError(res, error, "SUBMIT MANUAL PROOF");
  } finally {
    // ==========================================
    // 16. CLEANUP
    // ==========================================

    if (session) {
      await session.endSession();
    }

    // Remove newly uploaded screenshots
    // if the database transaction failed.
    if (!committed) {
      await Promise.allSettled(
        uploadedFiles
          .filter((file) => file.fileId)
          .map((file) => deleteManualPaymentScreenshot(file.fileId)),
      );
    }
  }
};

// ============================================================
// 4. CUSTOMER: GET MY MANUAL PAYMENTS
// ============================================================

export const getMyManualPayments = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!isId(userId)) {
      throw createError(401, "Authentication required");
    }

    const payments = await ManualPayment.find({
      userId,
    })
      .select("-paymentScreenshots")
      .populate({
        path: "orderId",
        select: "assetId fractions totalAmount status expiresAt createdAt",
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const ordersAwaitingProof = await Order.find({
      userId,
      paymentGateway: "MANUAL",

      status: "PENDING_PAYMENT",
    })
      .select(
        "assetId fractions totalAmount status expiresAt bankDetailsSentAt createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,

      payments,

      ordersAwaitingProof: ordersAwaitingProof.map((order) => ({
        ...order,

        bankDetailsSent: Boolean(order.bankDetailsSentAt),

        canUploadProof:
          Boolean(order.bankDetailsSentAt) &&
          new Date(order.expiresAt).getTime() > Date.now(),
      })),
    });
  } catch (error) {
    return handleError(res, error, "GET MY MANUAL PAYMENTS");
  }
};

// ============================================================
// 5. ADMIN: LIST ORDERS WAITING FOR BANK DETAILS
// ============================================================

export const listPendingBankDetailOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      paymentGateway: "MANUAL",

      status: "PENDING_PAYMENT",

      bankDetailsSentAt: null,

      expiresAt: {
        $gt: new Date(),
      },
    })
      .select(
        "userId assetId fractions amountPerFraction totalAmount status expiresAt bankDetailsSendingAt bankDetailsSentAt createdAt",
      )
      .populate("userId", "name email phone")
      .populate("assetId", "assetName assetCode")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,

      count: orders.length,

      orders,
    });
  } catch (error) {
    return handleError(res, error, "LIST PENDING BANK DETAIL ORDERS");
  }
};

// ============================================================
// 6. ADMIN: LIST MANUAL PAYMENT PROOFS
// ============================================================

export const listAdminManualPayments = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      const validStatuses = [...REVIEW_STATUSES, "APPROVED", "REJECTED"];

      if (!validStatuses.includes(req.query.status)) {
        throw createError(400, "Invalid payment status");
      }

      filter.status = req.query.status;
    }

    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));

    const limit = Math.max(
      1,
      Math.min(50, Math.floor(Number(req.query.limit) || 20)),
    );

    const [payments, total] = await Promise.all([
      ManualPayment.find(filter)
        .select("-paymentScreenshots")
        .populate("userId", "name email phone")
        .populate("orderId", "fractions totalAmount status expiresAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      ManualPayment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,

      page,
      limit,
      total,

      payments,
    });
  } catch (error) {
    return handleError(res, error, "LIST ADMIN MANUAL PAYMENTS");
  }
};

// ============================================================
// 7. ADMIN: GET PAYMENT DETAILS + SCREENSHOTS
// ============================================================

export const getAdminManualPayment = async (req, res) => {
  try {
    const { manualPaymentId } = req.params;

    if (!isId(manualPaymentId)) {
      throw createError(400, "Invalid manual payment ID");
    }

    const manual = await ManualPayment.findById(manualPaymentId).lean();

    if (!manual) {
      throw createError(404, "Manual payment not found");
    }

    const [order, user, asset] = await Promise.all([
      Order.findById(manual.orderId).lean(),

      User.findById(manual.userId).select("name email phone").lean(),

      Asset.findById(manual.assetId)
        .select("assetName assetCode totalFractions availableFractions")
        .lean(),
    ]);

    const screenshots = (manual.paymentScreenshots || []).map((file) => ({
      fileId: file.fileId,

      signedUrl: getManualPaymentScreenshotSignedUrl(file.url),
    }));

    return res.status(200).json({
      success: true,

      manualPayment: {
        ...manual,

        paymentScreenshots: screenshots,
      },

      order,
      user,
      asset,
    });
  } catch (error) {
    return handleError(res, error, "GET ADMIN MANUAL PAYMENT");
  }
};

// ============================================================
// 8. ADMIN: APPROVE MANUAL PAYMENT
// ============================================================

// export const approveManualPayment = async (req, res) => {
//   const adminId = getUserId(req);
//   const { manualPaymentId } = req.params;

//   const {
//     bankCreditVerified,
//     bankCreditReference,
//     bankCreditAmount,
//     bankCreditDate,
//     remark,
//   } = req.body || {};

//   let session = null;

//   let purchaseHistoryId = null;
//   let paymentId = null;

//   let alreadyProcessed = false;

//   try {
//     // ========================================================
//     // 1. VALIDATE ADMIN AND MANUAL PAYMENT ID
//     // ========================================================

//     if (!isId(adminId) || !isId(manualPaymentId)) {
//       throw createError(
//         400,
//         "Invalid admin or manual payment ID"
//       );
//     }

//     // ========================================================
//     // 2. NORMALIZE SINGLE OR MULTIPLE BANK REFERENCES
//     // ========================================================

//     // Examples:
//     //
//     // Single:
//     // "UTR123456789"
//     //
//     // Multiple:
//     // "UTR123456789, UTR987654321"
//     //
//     // normalizeMultipleUTRs() already supports both.

//     const {
//       transactionId: creditRef,
//       transactionIds: verifiedTransactionIds,
//       isMultiplePayment,
//     } = normalizeMultipleUTRs(bankCreditReference);

//     // ========================================================
//     // 3. VALIDATE BANK CREDIT DETAILS
//     // ========================================================

//     if (
//       bankCreditVerified !== true ||
//       !Number.isFinite(toPaise(bankCreditAmount)) ||
//       !validDate(bankCreditDate)
//     ) {
//       throw createError(
//         400,
//         "Valid verified bank credit details are required"
//       );
//     }

//     // ========================================================
//     // 4. START MONGODB SESSION
//     // ========================================================

//     session = await mongoose.startSession();

//     await session.withTransaction(async () => {
//       // ======================================================
//       // 5. FETCH MANUAL PAYMENT
//       // ======================================================

//       const manual = await ManualPayment.findById(
//         manualPaymentId
//       ).session(session);

//       if (!manual) {
//         throw createError(
//           404,
//           "Manual payment not found"
//         );
//       }

//       // ======================================================
//       // 6. FETCH AND VALIDATE ORDER
//       // ======================================================

//       const order = await Order.findById(
//         manual.orderId
//       ).session(session);

//       if (
//         !order ||
//         order.paymentGateway !== "MANUAL" ||
//         !sameId(order.userId, manual.userId) ||
//         !sameId(order.assetId, manual.assetId)
//       ) {
//         throw createError(
//           409,
//           "Order and manual payment mismatch"
//         );
//       }

//       // ======================================================
//       // 7. IDEMPOTENCY: ALREADY APPROVED
//       // ======================================================

//       if (
//         manual.status === "APPROVED" &&
//         order.status === "COMPLETED"
//       ) {
//         const existingPurchase =
//           await PurchaseHistory.findOne({
//             orderId: order._id,
//           }).session(session);

//         if (
//           !existingPurchase ||
//           !manual.paymentId ||
//           !sameId(
//             existingPurchase.paymentId,
//             manual.paymentId
//           )
//         ) {
//           throw createError(
//             409,
//             "Previous approval requires reconciliation"
//           );
//         }

//         const existingPayment =
//           await Payment.findById(
//             manual.paymentId
//           ).session(session);

//         if (
//           !existingPayment ||
//           existingPayment.status !== "SUCCESS"
//         ) {
//           throw createError(
//             409,
//             "Existing payment is inconsistent"
//           );
//         }

//         paymentId = existingPayment._id;
//         purchaseHistoryId = existingPurchase._id;

//         alreadyProcessed = true;

//         return;
//       }

//       // ======================================================
//       // 8. VALIDATE PENDING APPROVAL STATUS
//       // ======================================================

//       if (
//         order.status !== "PENDING_VERIFICATION" ||
//         !REVIEW_STATUSES.includes(manual.status)
//       ) {
//         throw createError(
//           409,
//           "Payment is not awaiting approval"
//         );
//       }

//       // ======================================================
//       // 9. VALIDATE SUBMITTED PAYMENT PROOF
//       // ======================================================

//       if (
//         !manual.transactionId ||
//         !Array.isArray(manual.paymentScreenshots) ||
//         manual.paymentScreenshots.length < 1 ||
//         manual.paymentScreenshots.length > 3
//       ) {
//         throw createError(
//           409,
//           "Transaction ID or payment screenshots missing"
//         );
//       }

//       // ======================================================
//       // 10. NORMALIZE SUBMITTED TRANSACTION IDs
//       // ======================================================

//       // Support both new and existing manual payment records.
//       //
//       // New records may contain:
//       // normalizedTransactionIds: ["UTR1", "UTR2"]
//       //
//       // Existing records may only contain:
//       // transactionId: "UTR1"

//       const submittedTransactionIds =
//         normalizeMultipleUTRs(
//           manual.transactionId
//         ).transactionIds;

//       // ======================================================
//       // 11. COMPARE ALL TRANSACTION IDs
//       // ======================================================

//       const submittedSet = new Set(
//         submittedTransactionIds
//       );

//       const verifiedSet = new Set(
//         verifiedTransactionIds
//       );

//       const referencesMatch =
//         submittedSet.size === verifiedSet.size &&
//         [...submittedSet].every(
//           (utr) => verifiedSet.has(utr)
//         );

//       if (!referencesMatch) {
//         throw createError(
//           409,
//           "Bank references do not match all submitted transaction IDs"
//         );
//       }

//       // ======================================================
//       // 12. VALIDATE VERIFIED AMOUNT
//       // ======================================================

//       const orderAmountPaise = toPaise(
//         order.totalAmount
//       );

//       const manualAmountPaise = toPaise(
//         manual.totalAmount
//       );

//       const submittedAmountPaise = toPaise(
//         manual.amountPaid
//       );

//       const verifiedAmountPaise = toPaise(
//         bankCreditAmount
//       );

//       if (
//         orderAmountPaise !== manualAmountPaise ||
//         orderAmountPaise !== submittedAmountPaise ||
//         orderAmountPaise !== verifiedAmountPaise
//       ) {
//         throw createError(
//           409,
//           "Verified total bank credit amount does not match order amount"
//         );
//       }

//       // IMPORTANT:
//       // Admin must verify each transaction against
//       // actual bank credits before approving.
//       //
//       // A matching UTR string alone does not establish
//       // that the payment was received.

//       // ======================================================
//       // 13. CHECK EXISTING PAYMENT
//       // ======================================================

//       const existingPayment =
//         await Payment.findOne({
//           orderId: order._id,
//         }).session(session);

//       if (existingPayment) {
//         throw createError(
//           409,
//           "Payment already exists for this order"
//         );
//       }

//       // ======================================================
//       // 14. CHECK EXISTING PURCHASE HISTORY
//       // ======================================================

//       const existingPurchase =
//         await PurchaseHistory.findOne({
//           orderId: order._id,
//         }).session(session);

//       if (existingPurchase) {
//         throw createError(
//           409,
//           "Purchase history already exists"
//         );
//       }

//       // ======================================================
//       // 15. VALIDATE FRACTIONS
//       // ======================================================

//       const count = Number(order.fractions);

//       if (
//         !Number.isSafeInteger(count) ||
//         count <= 0
//       ) {
//         throw createError(
//           409,
//           "Invalid fraction count"
//         );
//       }

//       // ======================================================
//       // 16. ALLOCATE AVAILABLE FRACTIONS
//       // ======================================================

//       // Manual orders do not reserve fractions.
//       // So availability is checked during approval.
//       //
//       // IMPORTANT:
//       // Confirm allocateFractions() does not also
//       // decrement availableFractions.

//       const asset = await Asset.findOneAndUpdate(
//         {
//           _id: order.assetId,

//           status: "ACTIVE",

//           availableFractions: {
//             $gte: count,
//           },
//         },
//         {
//           $inc: {
//             availableFractions: -count,
//           },
//         },
//         {
//           new: true,
//           session,
//         }
//       );

//       if (!asset) {
//         throw createError(
//           409,
//           "Fractions unavailable. Verified payment requires reconciliation or refund."
//         );
//       }

//       // ======================================================
//       // 17. CREATE OWNERSHIP ALLOCATION
//       // ======================================================

//       await allocateFractions({
//         assetId: order.assetId,
//         userId: order.userId,
//         fractions: count,
//         session,
//       });

//       // ======================================================
//       // 18. CREATE SUCCESSFUL PAYMENT
//       // ======================================================

//       const paidAt = new Date(bankCreditDate);

//       const [payment] = await Payment.create(
//         [
//           {
//             userId: order.userId,

//             orderId: order._id,

//             paymentGateway: "MANUAL",

//             amount: Number(order.totalAmount),

//             currency: "INR",

//             status: "SUCCESS",

//             paymentMethod: manual.paymentMethod,

//             paidAt,
//           },
//         ],
//         {
//           session,
//         }
//       );

//       paymentId = payment._id;

//       // ======================================================
//       // 19. FETCH CUSTOMER INFORMATION
//       // ======================================================

//       const user = await User.findById(
//         order.userId
//       )
//         .select(
//           "name fullName email phone mobile fullPhone"
//         )
//         .session(session)
//         .lean();

//       if (!user) {
//         throw createError(
//           404,
//           "Customer not found"
//         );
//       }

//       // ======================================================
//       // 20. CREATE PURCHASE HISTORY
//       // ======================================================

//       const [purchase] =
//         await PurchaseHistory.create(
//           [
//             {
//               userId: order.userId,

//               assetId: order.assetId,

//               orderId: order._id,

//               paymentId: payment._id,

//               paymentGateway: "MANUAL",

//               fractionsPurchased: count,

//               amountPerFraction: Number(
//                 order.amountPerFraction
//               ),

//               totalAmount: Number(
//                 order.totalAmount
//               ),

//               userSnapshot:
//                 buildUserSnapshot(user),

//               assetSnapshot:
//                 buildAssetSnapshot(asset, count),

//               paymentStatus: "SUCCESS",

//               paymentMethod:
//                 manual.paymentMethod,

//               // Store one or multiple bank UTRs
//               // as a comma-separated string.
//               transactionReference: creditRef,

//               paidAt,

//               paymentEmailStatus: "PENDING",

//               paymentEmailAttempts: 0,

//               paymentEmailSentAt: null,

//               paymentEmailClaimedAt: null,
//             },
//           ],
//           {
//             session,
//           }
//         );

//       purchaseHistoryId = purchase._id;

//       // ======================================================
//       // 21. COMPLETE ORDER
//       // ======================================================

//       order.status = "COMPLETED";

//       await order.save({
//         session,
//       });

//       // ======================================================
//       // 22. APPROVE MANUAL PAYMENT
//       // ======================================================

//       const now = new Date();

//       manual.status = "APPROVED";

//       manual.bankCreditVerified = true;

//       // One or multiple UTRs, comma-separated.
//       manual.bankCreditReference = creditRef;

//       // Combined verified bank credit amount.
//       manual.bankCreditAmount = Number(
//         bankCreditAmount
//       );

//       manual.bankCreditDate = paidAt;

//       manual.verifiedBy = adminId;

//       manual.verifiedAt = now;

//       manual.approvedAt = now;

//       manual.adminRemark =
//         String(remark || "").trim() || null;

//       manual.paymentId = payment._id;

//       manual.purchaseHistoryId =
//         purchase._id;

//       // Preserve normalized individual references
//       // for records created before the new schema.
//       manual.normalizedTransactionIds =
//         submittedTransactionIds;

//       await manual.save({
//         session,
//       });
//     });

//     // ========================================================
//     // 23. SEND WELCOME EMAIL AFTER COMMIT
//     // ========================================================

//     // Send only when this request performed the approval.
//     // Avoid duplicate welcome emails on repeated approval.

//     if (
//       !alreadyProcessed &&
//       purchaseHistoryId
//     ) {
//       await sendEmailSafely(
//         sendPurchaseConfirmation,
//         purchaseHistoryId
//       );
//     }

//     // ========================================================
//     // 24. SUCCESS RESPONSE
//     // ========================================================

//     return res.status(200).json({
//       success: true,

//       alreadyProcessed,

//       message: alreadyProcessed
//         ? "Manual payment was already approved"
//         : "Manual payment approved. Ownership, Payment and PurchaseHistory created successfully.",

//       data: {
//         manualPaymentId,

//         paymentId,

//         purchaseHistoryId,

//         status: "APPROVED",

//         paymentGateway: "MANUAL",

//         transactionId: creditRef,

//         transactionIds: verifiedTransactionIds,

//         isMultiplePayment,

//         transactionCount:
//           verifiedTransactionIds.length,

//         bankCreditVerified: true,

//         bankCreditAmount: Number(
//           bankCreditAmount
//         ),

//         bankCreditDate: new Date(
//           bankCreditDate
//         ),

//         welcomeEmailTriggered:
//           !alreadyProcessed &&
//           Boolean(purchaseHistoryId),
//       },
//     });

//   } catch (error) {
//     return handleError(
//       res,
//       error,
//       "APPROVE MANUAL PAYMENT"
//     );
//   } finally {
//     if (session) {
//       await session.endSession();
//     }
//   }
// };





export const approveManualPayment = async (req, res) => {
  const adminId = getUserId(req);
  const { manualPaymentId } = req.params;

  const {
    action = "APPROVE",
    transactionId,
    bankCreditVerified,
    bankCreditReference,
    bankCreditAmount,
    bankCreditDate,
    remark,
    reason,
    bankCreditConfirmedAbsent,
  } = req.body || {};

  const selectedAction = String(action).trim().toUpperCase();

  let session = null;
  let result = null;
  let welcomePurchaseId = null;
  let rejectionOrderId = null;

  try {
    // ====================================================
    // 1. BASIC VALIDATION
    // ====================================================

    if (!isId(adminId) || !isId(manualPaymentId)) {
      throw createError(400, "Invalid admin or manual payment ID");
    }

    if (
      !["APPROVE", "UPDATE_REFERENCE", "REJECT"].includes(
        selectedAction
      )
    ) {
      throw createError(
        400,
        "Invalid action. Use APPROVE, UPDATE_REFERENCE or REJECT"
      );
    }

    const isApprove = selectedAction === "APPROVE";
    const isUpdate = selectedAction === "UPDATE_REFERENCE";
    const isReject = selectedAction === "REJECT";

    const adminRemark = String(remark || "").trim();

    // ====================================================
    // 2. PARSE REFERENCE / BANK DETAILS
    // ====================================================

    let submittedCorrection = null;
    let verifiedReference = null;
    let creditDate = null;

    if (!isReject) {
      // Correction is optional for first approval,
      // but mandatory when updating payment details.

      if (transactionId !== undefined) {
        submittedCorrection = normalizeMultipleUTRs(
          transactionId
        );
      }

      if (isUpdate && !submittedCorrection) {
        throw createError(
          400,
          "transactionId is required for UPDATE_REFERENCE"
        );
      }

      verifiedReference = normalizeMultipleUTRs(
        bankCreditReference
      );

      creditDate = parseAdminBankCreditDate(
        bankCreditDate
      );

      if (bankCreditVerified !== true) {
        throw createError(
          400,
          "bankCreditVerified must be boolean true"
        );
      }

      if (!Number.isFinite(toPaise(bankCreditAmount))) {
        throw createError(
          400,
          "Valid positive bankCreditAmount is required"
        );
      }

      if (isUpdate && !adminRemark) {
        throw createError(
          400,
          "Admin correction remark is required"
        );
      }
    }

    // ====================================================
    // 3. REJECTION VALIDATION
    // ====================================================

    const rejectionReason = String(
      reason || remark || ""
    ).trim();

    if (isReject) {
      if (!rejectionReason) {
        throw createError(
          400,
          "Rejection reason is required"
        );
      }

      if (bankCreditConfirmedAbsent !== true) {
        throw createError(
          400,
          "bankCreditConfirmedAbsent must be boolean true"
        );
      }
    }

    // ====================================================
    // 4. CASE-INSENSITIVE REFERENCE COMPARISON
    // ====================================================

    const sameReferences = (first, second) => {
      if (!first || !second) return false;

      const a = new Set(
        first.normalizedTransactionIds
      );

      const b = new Set(
        second.normalizedTransactionIds
      );

      return (
        a.size === b.size &&
        [...a].every((value) => b.has(value))
      );
    };

    if (
      !isReject &&
      submittedCorrection &&
      !sameReferences(submittedCorrection, verifiedReference)
    ) {
      throw createError(
        409,
        "transactionId and bankCreditReference do not match"
      );
    }

    // ====================================================
    // 5. START MONGODB TRANSACTION
    // ====================================================

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const now = new Date();

      // ------------------------------------------------
      // 5.1 FETCH MANUAL PAYMENT AND ORDER
      // ------------------------------------------------

      const manual = await ManualPayment.findById(
        manualPaymentId
      ).session(session);

      if (!manual) {
        throw createError(404, "Manual payment not found");
      }

      const order = await Order.findById(
        manual.orderId
      ).session(session);

      if (
        !order ||
        order.paymentGateway !== "MANUAL" ||
        !sameId(order.userId, manual.userId) ||
        !sameId(order.assetId, manual.assetId)
      ) {
        throw createError(
          409,
          "Manual payment and order mismatch"
        );
      }

      const isApproved =
        manual.status === "APPROVED" &&
        order.status === "COMPLETED";

      const isPending =
        REVIEW_STATUSES.includes(manual.status) &&
        order.status === "PENDING_VERIFICATION";

      const isRejected =
        manual.status === "REJECTED" &&
        order.status === "REJECTED";

      // ====================================================
      // 6. REJECT ACTION
      // ====================================================

      if (isReject) {
        if (isRejected) {
          result = {
            success: true,
            alreadyRejected: true,
            message: "Manual payment was already rejected",
            data: {
              manualPaymentId: manual._id,
              orderId: order._id,
              status: "REJECTED",
            },
          };

          return;
        }

        if (!isPending) {
          throw createError(
            409,
            "Only pending payments can be rejected. Approved payments require a separate refund/reversal process."
          );
        }

        // Prevent rejection if a successful payment
        // or purchase has already been created.
        const payment = await Payment.findOne({
          orderId: order._id,
        }).session(session);

        const purchase = await PurchaseHistory.findOne({
          orderId: order._id,
        }).session(session);

        if (payment || purchase) {
          throw createError(
            409,
            "Payment or PurchaseHistory already exists. Reconciliation required."
          );
        }

        manual.status = "REJECTED";
        manual.rejectionReason = rejectionReason;
        manual.rejectedAt = now;

        manual.bankCreditVerified = false;
        manual.verifiedBy = adminId;
        manual.verifiedAt = now;
        manual.adminRemark = rejectionReason;

        order.status = "REJECTED";

        await manual.save({ session });
        await order.save({ session });

        rejectionOrderId = order._id;

        result = {
          success: true,
          alreadyRejected: false,
          message: "Manual payment rejected successfully",
          data: {
            manualPaymentId: manual._id,
            orderId: order._id,
            status: "REJECTED",
            rejectionReason,
            rejectedAt: now,
            paymentApproved: false,
            ownershipAllocated: false,
          },
        };

        return;
      }

      // ====================================================
      // 7. VALIDATE UPDATE / APPROVE STATUS
      // ====================================================

      if (!isApproved && !isPending) {
        throw createError(
          409,
          "Payment cannot be updated or approved in its current status"
        );
      }

      // ------------------------------------------------
      // 7.1 ORIGINAL & FINAL REFERENCES
      // ------------------------------------------------

      const previousReference = normalizeMultipleUTRs(
        manual.transactionId
      );

      const finalReference =
        submittedCorrection || previousReference;

      const previousDate = manual.bankCreditDate
        ? new Date(manual.bankCreditDate)
        : null;

      const transactionIdEdited =
        manual.transactionId !== finalReference.transactionId;

      const bankCreditDateEdited =
        !previousDate ||
        previousDate.getTime() !== creditDate.getTime();

      // ------------------------------------------------
      // 7.2 VERIFY REFERENCES
      // ------------------------------------------------

      if (
        !sameReferences(finalReference, verifiedReference)
      ) {
        throw createError(
          409,
          "Verified bank references do not match transaction IDs"
        );
      }

      // ------------------------------------------------
      // 7.3 CHECK DUPLICATE TRANSACTIONS
      // ------------------------------------------------

      const duplicate = await ManualPayment.findOne({
        _id: { $ne: manual._id },

        $or: [
          {
            normalizedTransactionIds: {
              $in: finalReference.normalizedTransactionIds,
            },
          },
          {
            normalizedTransactionId: {
              $in: finalReference.normalizedTransactionIds,
            },
          },
        ],
      }).session(session);

      if (duplicate) {
        throw createError(
          409,
          "One or more transaction IDs are already associated with another payment"
        );
      }

      // ------------------------------------------------
      // 7.4 VALIDATE AMOUNT
      // ------------------------------------------------

      const expectedAmount = toPaise(
        order.totalAmount
      );

      if (
        expectedAmount !== toPaise(manual.totalAmount) ||
        expectedAmount !== toPaise(manual.amountPaid) ||
        expectedAmount !== toPaise(bankCreditAmount)
      ) {
        throw createError(
          409,
          "Verified bank credit amount does not match order amount"
        );
      }

      // ====================================================
      // 8. UPDATE_REFERENCE ACTION
      // ====================================================

      if (isUpdate) {
        let payment = null;
        let purchase = null;

        // ----------------------------------------------
        // 8.1 APPROVED PAYMENT RECORDS
        // ----------------------------------------------

        if (isApproved) {
          payment = manual.paymentId
            ? await Payment.findById(
                manual.paymentId
              ).session(session)
            : null;

          purchase = await PurchaseHistory.findOne({
            orderId: order._id,
          }).session(session);

          if (
            !payment ||
            payment.status !== "SUCCESS" ||
            !purchase ||
            !sameId(purchase.paymentId, payment._id)
          ) {
            throw createError(
              409,
              "Approved payment records require reconciliation"
            );
          }
        }

        // ----------------------------------------------
        // 8.2 SAVE OLD DETAILS FOR AUDIT
        // ----------------------------------------------

        const before = {
          transactionId: manual.transactionId,

          normalizedTransactionIds:
            manual.normalizedTransactionIds || [],

          bankCreditReference:
            manual.bankCreditReference || null,

          bankCreditAmount:
            manual.bankCreditAmount ?? null,

          bankCreditDate:
            manual.bankCreditDate || null,

          status: manual.status,
        };

        // ----------------------------------------------
        // 8.3 UPDATE MANUAL PAYMENT
        // ----------------------------------------------

        manual.transactionId =
          finalReference.transactionId;

        manual.normalizedTransactionId =
          finalReference.normalizedTransactionId;

        manual.normalizedTransactionIds =
          finalReference.normalizedTransactionIds;

        manual.bankCreditDate = creditDate;

        manual.adminRemark = adminRemark;

        if (isApproved) {
          // Keep approved status.
          // Admin confirms the bank records again.
          manual.bankCreditVerified = true;

          manual.bankCreditReference =
            verifiedReference.transactionId;

          manual.bankCreditAmount =
            Number(bankCreditAmount);

          manual.verifiedBy = adminId;
          manual.verifiedAt = now;

          // Synchronize existing records.
          // Do NOT create any new records.
          purchase.transactionReference =
            finalReference.transactionId;

          purchase.paidAt = creditDate;
          payment.paidAt = creditDate;

          await payment.save({ session });
          await purchase.save({ session });

        } else {
          // Still pending verification.
          // Editing does not automatically approve.
          manual.status = "PENDING_VERIFICATION";

          manual.bankCreditVerified = false;
          manual.bankCreditReference = null;
          manual.bankCreditAmount = null;

          manual.verifiedBy = null;
          manual.verifiedAt = null;
        }

        await manual.save({ session });

        // ----------------------------------------------
        // 8.4 APPEND-ONLY ADMIN AUDIT LOG
        // ----------------------------------------------

        await mongoose.connection
          .collection("manual_payment_corrections")
          .insertOne(
            {
              manualPaymentId: manual._id,
              orderId: order._id,
              adminId,
              action: "UPDATE_REFERENCE",
              before,

              after: {
                transactionId: manual.transactionId,

                normalizedTransactionIds:
                  finalReference.normalizedTransactionIds,

                bankCreditReference:
                  manual.bankCreditReference || null,

                bankCreditAmount:
                  manual.bankCreditAmount ?? null,

                bankCreditDate:
                  manual.bankCreditDate || null,

                status: manual.status,
              },

              remark: adminRemark,
              correctedAt: now,
            },
            { session }
          );

        result = {
          success: true,

          message:
            "Manual payment details updated successfully",

          data: {
            manualPaymentId: manual._id,
            orderId: order._id,

            status: manual.status,
            paymentApproved: isApproved,

            previousTransactionId:
              before.transactionId,

            transactionId:
              finalReference.transactionId,

            transactionIds:
              finalReference.transactionIds,

            transactionCount:
              finalReference.transactionIds.length,

            transactionIdEdited,
            bankCreditDateEdited,

            bankCreditReference:
              manual.bankCreditReference || null,

            bankCreditAmount:
              manual.bankCreditAmount ?? null,

            bankCreditDate:
              manual.bankCreditDate,

            newPaymentCreated: false,
            ownershipReallocated: false,
            welcomeEmailTriggered: false,
          },
        };

        return;
      }

      // ====================================================
      // 9. APPROVE ACTION — ALREADY APPROVED
      // ====================================================

      if (isApproved) {
        const payment = manual.paymentId
          ? await Payment.findById(
              manual.paymentId
            ).session(session)
          : null;

        const purchase = await PurchaseHistory.findOne({
          orderId: order._id,
        }).session(session);

        if (
          !payment ||
          payment.status !== "SUCCESS" ||
          !purchase ||
          !sameId(purchase.paymentId, payment._id)
        ) {
          throw createError(
            409,
            "Existing approval requires reconciliation"
          );
        }

        // APPROVE is idempotent.
        // To edit, explicitly use UPDATE_REFERENCE.

        result = {
          success: true,
          alreadyProcessed: true,

          message:
            "Manual payment was already approved. Use UPDATE_REFERENCE to edit details.",

          data: {
            manualPaymentId: manual._id,
            orderId: order._id,

            paymentId: payment._id,
            purchaseHistoryId: purchase._id,

            status: "APPROVED",

            transactionId: manual.transactionId,
            bankCreditReference:
              manual.bankCreditReference,

            bankCreditAmount:
              manual.bankCreditAmount,

            bankCreditDate:
              manual.bankCreditDate,

            welcomeEmailTriggered: false,
          },
        };

        return;
      }

      // ====================================================
      // 10. APPROVE — VALIDATE PAYMENT PROOF
      // ====================================================

      if (
        !Array.isArray(manual.paymentScreenshots) ||
        manual.paymentScreenshots.length < 1 ||
        manual.paymentScreenshots.length > 3
      ) {
        throw createError(
          409,
          "Payment screenshots are missing or invalid"
        );
      }

      // Independently verify each bank credit
      // before calling APPROVE.
      // The API validates values but does not
      // contact the bank.

      // ====================================================
      // 11. PREVENT DUPLICATE PAYMENT/PURCHASE
      // ====================================================

      const existingPayment = await Payment.findOne({
        orderId: order._id,
      }).session(session);

      if (existingPayment) {
        throw createError(
          409,
          "Payment already exists for this order"
        );
      }

      const existingPurchase =
        await PurchaseHistory.findOne({
          orderId: order._id,
        }).session(session);

      if (existingPurchase) {
        throw createError(
          409,
          "PurchaseHistory already exists for this order"
        );
      }

      // ====================================================
      // 12. VERIFY FRACTIONS
      // ====================================================

      const fractionCount = Number(
        order.fractions
      );

      if (
        !Number.isSafeInteger(fractionCount) ||
        fractionCount <= 0
      ) {
        throw createError(
          409,
          "Invalid fraction count"
        );
      }

      // ====================================================
      // 13. DEDUCT AVAILABLE FRACTIONS
      // ====================================================

      const asset = await Asset.findOneAndUpdate(
        {
          _id: order.assetId,
          status: "ACTIVE",
          availableFractions: {
            $gte: fractionCount,
          },
        },
        {
          $inc: {
            availableFractions: -fractionCount,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!asset) {
        throw createError(
          409,
          "Fractions unavailable. Payment requires reconciliation or refund."
        );
      }

      // ====================================================
      // 14. ALLOCATE OWNERSHIP
      // ====================================================

      // IMPORTANT:
      // Verify that allocateFractions() uses this session
      // for all writes and does not also decrement
      // availableFractions.

      await allocateFractions({
        assetId: order.assetId,
        userId: order.userId,
        fractions: fractionCount,
        session,
      });

      // ====================================================
      // 15. CREATE SUCCESSFUL PAYMENT
      // ====================================================

      const [payment] = await Payment.create(
        [
          {
            userId: order.userId,
            orderId: order._id,

            paymentGateway: "MANUAL",

            amount: Number(
              order.totalAmount
            ),

            currency: "INR",
            status: "SUCCESS",

            paymentMethod:
              manual.paymentMethod,

            paidAt: creditDate,
          },
        ],
        { session }
      );

      // ====================================================
      // 16. FETCH USER
      // ====================================================

      const user = await User.findById(
        order.userId
      )
        .select(
          "name fullName email phone mobile fullPhone"
        )
        .session(session)
        .lean();

      if (!user) {
        throw createError(
          404,
          "Customer not found"
        );
      }

      // ====================================================
      // 17. CREATE PURCHASE HISTORY
      // ====================================================

      const [purchase] = await PurchaseHistory.create(
        [
          {
            userId: order.userId,
            assetId: order.assetId,

            orderId: order._id,
            paymentId: payment._id,

            paymentGateway: "MANUAL",

            fractionsPurchased: fractionCount,

            amountPerFraction: Number(
              order.amountPerFraction
            ),

            totalAmount: Number(
              order.totalAmount
            ),

            userSnapshot:
              buildUserSnapshot(user),

            assetSnapshot:
              buildAssetSnapshot(
                asset,
                fractionCount
              ),

            paymentStatus: "SUCCESS",

            paymentMethod:
              manual.paymentMethod,

            transactionReference:
              finalReference.transactionId,

            paidAt: creditDate,

            paymentEmailStatus: "PENDING",
            paymentEmailAttempts: 0,

            paymentEmailSentAt: null,
            paymentEmailClaimedAt: null,
          },
        ],
        { session }
      );

      // ====================================================
      // 18. COMPLETE ORDER
      // ====================================================

      order.status = "COMPLETED";

      await order.save({ session });

      // ====================================================
      // 19. MARK MANUAL PAYMENT APPROVED
      // ====================================================

      manual.transactionId =
        finalReference.transactionId;

      manual.normalizedTransactionId =
        finalReference.normalizedTransactionId;

      manual.normalizedTransactionIds =
        finalReference.normalizedTransactionIds;

      manual.bankCreditVerified = true;

      manual.bankCreditReference =
        verifiedReference.transactionId;

      manual.bankCreditAmount =
        Number(bankCreditAmount);

      manual.bankCreditDate = creditDate;

      manual.status = "APPROVED";

      manual.verifiedBy = adminId;
      manual.verifiedAt = now;
      manual.approvedAt = now;

      manual.paymentId = payment._id;
      manual.purchaseHistoryId = purchase._id;

      manual.adminRemark =
        adminRemark ||
        "Bank credits verified and payment approved";

      await manual.save({ session });

      welcomePurchaseId = purchase._id;

      result = {
        success: true,
        alreadyProcessed: false,

        message:
          "Manual payment approved successfully",

        data: {
          manualPaymentId: manual._id,
          orderId: order._id,

          paymentId: payment._id,
          purchaseHistoryId: purchase._id,

          status: "APPROVED",

          transactionId:
            finalReference.transactionId,

          transactionIds:
            finalReference.transactionIds,

          transactionCount:
            finalReference.transactionIds.length,

          bankCreditVerified: true,

          bankCreditReference:
            verifiedReference.transactionId,

          bankCreditAmount:
            Number(bankCreditAmount),

          bankCreditDate:
            creditDate,

          ownershipAllocated: true,
          welcomeEmailTriggered: true,
        },
      };
    });

    // ====================================================
    // 20. EMAIL AFTER SUCCESSFUL TRANSACTION COMMIT
    // ====================================================

    if (rejectionOrderId) {
      await sendEmailSafely(
        sendManualPaymentRejectedEmail,
        rejectionOrderId
      );
    }

    if (welcomePurchaseId) {
      await sendEmailSafely(
        sendPurchaseConfirmation,
        welcomePurchaseId
      );
    }

    return res.status(200).json(result);

  } catch (error) {
    return handleError(
      res,
      error,
      "ADMIN MANUAL PAYMENT ACTION"
    );

  } finally {
    if (session) {
      await session.endSession();
    }
  }
};



// ============================================================
// 9. ADMIN: REJECT MANUAL PAYMENT
// ============================================================

export const rejectManualPayment = async (req, res) => {
  const adminId = getUserId(req);

  const { manualPaymentId } = req.params;

  const { reason, bankCreditConfirmedAbsent } = req.body || {};

  if (
    !isId(adminId) ||
    !isId(manualPaymentId) ||
    !String(reason || "").trim() ||
    bankCreditConfirmedAbsent !== true
  ) {
    return res.status(400).json({
      success: false,

      message: "Rejection reason and bank non-receipt confirmation required",
    });
  }

  const session = await mongoose.startSession();

  let orderId = null;
  let alreadyRejected = false;

  try {
    await session.withTransaction(async () => {
      const manual =
        await ManualPayment.findById(manualPaymentId).session(session);

      if (!manual) {
        throw createError(404, "Manual payment not found");
      }

      const order = await Order.findById(manual.orderId).session(session);

      if (
        !order ||
        order.paymentGateway !== "MANUAL" ||
        !sameId(order.userId, manual.userId) ||
        !sameId(order.assetId, manual.assetId)
      ) {
        throw createError(409, "Order mismatch");
      }

      orderId = order._id;

      if (manual.status === "REJECTED" && order.status === "REJECTED") {
        alreadyRejected = true;
        return;
      }

      if (
        order.status !== "PENDING_VERIFICATION" ||
        !REVIEW_STATUSES.includes(manual.status)
      ) {
        throw createError(409, "Payment cannot be rejected");
      }

      const purchase = await PurchaseHistory.exists({
        orderId: order._id,
      }).session(session);

      if (purchase) {
        throw createError(409, "Purchase already exists");
      }

      const payment = await Payment.findOne({
        orderId: order._id,
        status: "SUCCESS",
      }).session(session);

      if (payment) {
        throw createError(409, "Successful payment already exists");
      }

      const now = new Date();

      // No inventory modifications.
      manual.status = "REJECTED";

      manual.rejectionReason = String(reason).trim();

      manual.rejectedAt = now;

      manual.verifiedBy = adminId;
      manual.verifiedAt = now;

      manual.bankCreditVerified = false;

      await manual.save({
        session,
      });

      order.status = "REJECTED";

      await order.save({
        session,
      });
    });

    // Email only after transaction commits.
    if (!alreadyRejected && orderId) {
      await sendEmailSafely(sendManualPaymentRejectedEmail, orderId);
    }

    return res.status(200).json({
      success: true,

      alreadyRejected,

      orderId,
      manualPaymentId,

      message: alreadyRejected
        ? "Manual payment was already rejected"
        : "Manual payment rejected successfully",
    });
  } catch (error) {
    return handleError(res, error, "REJECT MANUAL PAYMENT");
  } finally {
    await session.endSession();
  }
};

// ============================================================
// 10. ADMIN: MARK PAYMENT REVIEW REQUIRED
// ============================================================

export const markManualReviewRequired = async (req, res) => {
  try {
    const { manualPaymentId } = req.params;

    const remark = String(req.body?.remark || "").trim();

    if (!isId(manualPaymentId) || !remark) {
      throw createError(400, "Manual payment ID and remark required");
    }

    const manual = await ManualPayment.findOneAndUpdate(
      {
        _id: manualPaymentId,

        status: "PENDING_VERIFICATION",
      },
      {
        $set: {
          status: "REVIEW_REQUIRED",

          adminRemark: remark,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!manual) {
      throw createError(409, "Payment is not pending verification");
    }

    return res.status(200).json({
      success: true,

      manualPaymentId,

      status: manual.status,

      message: "Manual payment marked for reconciliation",
    });
  } catch (error) {
    return handleError(res, error, "MARK MANUAL REVIEW");
  }
};

// ============================================================
// CHECK EXISTING PENDING MANUAL ORDER
// ============================================================

export const checkPendingManualOrder = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { assetId } = req.params;

    if (!isId(userId)) {
      throw createError(401, "User authentication required");
    }

    if (!isId(assetId)) {
      throw createError(400, "Invalid asset ID");
    }

    const now = new Date();

    // Find only the latest pending manual order
    const order = await Order.findOne({
      userId,
      assetId,
      paymentGateway: "MANUAL",
      $or: [
        {
          status: "PENDING_PAYMENT",
          expiresAt: { $gt: now },
        },
        {
          status: "PENDING_VERIFICATION",
        },
      ],
    })
      .select(
        "_id userId assetId paymentGateway fractions amountPerFraction totalAmount status expiresAt bankDetailsSentAt createdAt",
      )
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    if (!order) {
      return res.status(200).json({
        success: true,
        pendingOrderExists: false,
        email_sent: false,
        message: "No pending manual payment order found for this asset",
        order: null,
      });
    }

    const manualPayment = await ManualPayment.findOne({
      orderId: order._id,
    })
      .select("_id status transactionId amountPaid paymentMethod submittedAt")
      .lean();

    const emailSent = Boolean(order.bankDetailsSentAt);

    const proofSubmitted =
      order.status === "PENDING_VERIFICATION" || Boolean(manualPayment);

    return res.status(200).json({
      success: true,
      pendingOrderExists: true,
      email_sent: emailSent,
      message: "Latest pending manual payment order found",

      order: {
        orderId: order._id,
        userId: order.userId,
        assetId: order.assetId,
        paymentGateway: order.paymentGateway,
        fractions: order.fractions,
        amountPerFraction: order.amountPerFraction,
        totalAmount: order.totalAmount,
        status: order.status,
        expiresAt: order.expiresAt,

        email_sent: emailSent,
        bankDetailsSentAt: order.bankDetailsSentAt,

        proofSubmitted,

        canUploadProof:
          order.status === "PENDING_PAYMENT" &&
          emailSent &&
          new Date(order.expiresAt).getTime() > Date.now(),

        manualPayment: manualPayment
          ? {
              manualPaymentId: manualPayment._id,
              status: manualPayment.status,
              transactionId: manualPayment.transactionId,
              amountPaid: manualPayment.amountPaid,
              paymentMethod: manualPayment.paymentMethod,
              submittedAt: manualPayment.submittedAt,
            }
          : null,

        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    return handleError(res, error, "CHECK PENDING MANUAL ORDER");
  }
};


export const deleteManualOrder = async (req, res) => {
  const adminId = getUserId(req);
  const { orderId } = req.params;

  let session = null;

  try {
    if (!isId(adminId) || !isId(orderId)) {
      throw createError(400, "Invalid admin or order ID");
    }

    session = await mongoose.startSession();

    let result = null;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw createError(404, "Order not found");
      }

      if (order.paymentGateway !== "MANUAL") {
        throw createError(
          400,
          "Only manual payment orders can be deleted"
        );
      }

      if (
        order.status === "COMPLETED" ||
        order.status === "PAYMENT_SUCCESS"
      ) {
        throw createError(
          409,
          "Completed or paid orders cannot be deleted"
        );
      }

      const manual = await ManualPayment.findOne({
        orderId: order._id,
      }).session(session);

      if (
        manual &&
        ![
          "NOT_SUBMITTED",
          "PENDING_VERIFICATION",
          "REVIEW_REQUIRED",
          "REJECTED",
          "EXPIRED",
        ].includes(manual.status)
      ) {
        throw createError(
          409,
          "Manual payment cannot be deleted in its current status"
        );
      }

      const purchase = await PurchaseHistory.exists({
        orderId: order._id,
      }).session(session);

      if (purchase) {
        throw createError(
          409,
          "Order has purchase history and cannot be deleted"
        );
      }

      const payment = await Payment.findOne({
        orderId: order._id,
      }).session(session);

      if (payment) {
        throw createError(
          409,
          "Order has an associated payment record and cannot be deleted"
        );
      }

      if (manual?.paymentId || manual?.purchaseHistoryId) {
        throw createError(
          409,
          "Order has already been linked to payment or purchase records"
        );
      }

      const deletedManual = manual
        ? await ManualPayment.deleteOne(
            { _id: manual._id },
            { session }
          )
        : null;

      const deletedOrder = await Order.deleteOne(
        { _id: order._id },
        { session }
      );

      if (deletedOrder.deletedCount !== 1) {
        throw createError(409, "Unable to delete manual order");
      }

      await mongoose.connection
        .collection("manual_order_deletion_audits")
        .insertOne(
          {
            adminId,
            orderId: order._id,
            manualPaymentId: manual?._id || null,
            userId: order.userId,
            assetId: order.assetId,
            orderStatus: order.status,
            manualPaymentStatus: manual?.status || null,
            transactionId: manual?.transactionId || null,
            deletedAt: new Date(),
          },
          { session }
        );

      result = {
        orderId: order._id,
        manualPaymentId: manual?._id || null,
        deletedOrder: true,
        deletedManualPayment: deletedManual?.deletedCount === 1,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Manual payment order deleted successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "DELETE MANUAL ORDER");
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
