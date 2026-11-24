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

const validDate = (value) => {
  if (!value) return false;

  const time = new Date(value).getTime();

  return Number.isFinite(time) && time <= Date.now() + 10 * 60 * 1000;
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
    User.findById(order.userId)
      .select("name email")
      .lean(),

    Asset.findById(order.assetId)
      .select("assetName")
      .lean(),
  ]);

  const {
    customerHtml,
    adminHtml,
  } = manualOrderCreatedTemplates({
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
    notifications.map(({ promise }) => promise)
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
        failure.result.reason
      );
    }

    throw new Error(
      `Manual order notification failed for: ${
        failures.map(({ label }) => label).join(", ")
      }`
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
    User.findById(order.userId)
      .select("name email")
      .lean(),

    Asset.findById(order.assetId)
      .select("assetName")
      .lean(),

    ManualPayment.findOne({ orderId })
      .select(
        "transactionId amountPaid paymentMethod status"
      )
      .lean(),
  ]);

  if (!manual) {
    throw new Error(
      "Manual payment record not found for notification"
    );
  }

  const {
    customerHtml,
    adminHtml,
  } = manualPaymentSubmittedTemplates({
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
    notifications.map(({ promise }) => promise)
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
        failure.result.reason
      );
    }

    throw new Error(
      `Manual payment notification failed for: ${
        failures.map(({ label }) => label).join(", ")
      }`
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

  try {
    // Validate .env configuration.
    getBankDetails();

    const claimTime = new Date();

    // Atomic claim prevents concurrent admin sends.
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,

        paymentGateway: "MANUAL",

        status: "PENDING_PAYMENT",

        bankDetailsSentAt: null,
        bankDetailsSendingAt: null,

        expiresAt: { $gt: claimTime },
      },
      {
        $set: {
          bankDetailsSendingAt: claimTime,
        },
      },
      { new: true },
    );

    if (!order) {
      throw createError(
        409,
        "Order expired, bank details already sent, or sending is in progress",
      );
    }

    claimed = true;

    const [user, asset] = await Promise.all([
      User.findById(order.userId).select("name email").lean(),

      Asset.findById(order.assetId).select("assetName").lean(),
    ]);

    if (!user?.email || !asset) {
      throw createError(409, "Customer email or asset not found");
    }

    // Uses manualBankDetailsTemplate.js
    // through manualBankDetailsEmail.service.js.
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

    emailAccepted = true;

    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,

        paymentGateway: "MANUAL",

        status: "PENDING_PAYMENT",

        bankDetailsSentAt: null,

        bankDetailsSendingAt: claimTime,
      },
      {
        $set: {
          bankDetailsSentAt: new Date(),
          bankDetailsSentBy: adminId,
        },

        $unset: {
          bankDetailsSendingAt: "",
        },
      },
      { new: true },
    );

    if (!updated) {
      throw createError(
        409,
        "Email sent but order update failed. Admin reconciliation required.",
      );
    }

    claimed = false;

    return res.status(200).json({
      success: true,

      message: "Bank details emailed successfully",

      data: {
        orderId: updated._id,

        assetName: asset.assetName,

        customerName: user.name || "Customer",

        customerEmail: user.email,

        paymentGateway: updated.paymentGateway,

        status: updated.status,

        totalAmount: updated.totalAmount,

        bankDetailsSent: true,

        bankDetailsSentAt: updated.bankDetailsSentAt,

        expiresAt: updated.expiresAt,
      },
    });
  } catch (error) {
    if (claimed && !emailAccepted) {
      // Keep the send lock when delivery is uncertain.
      // Check mail provider logs before unlocking.
      console.error("MANUAL BANK EMAIL NEEDS RECONCILIATION:", {
        orderId,
        error: error.message,
      });
    }

    return handleError(res, error, "SEND MANUAL BANK DETAILS");
  }
};

// ============================================================
// 3. CUSTOMER SUBMITS PAYMENT PROOF
// ============================================================


export const submitManualProof = async (req, res) => {
  const userId = getUserId(req);
  const { orderId } = req.params;

  const {
    transactionId,
    paymentMethod,
    amountPaid,
    paymentDate,
  } = req.body || {};

  const utr = normalizeUTR(transactionId);

  const skipBankEmailCheck =
    process.env.NODE_ENV === "development" &&
    process.env.MANUAL_PAYMENT_SKIP_BANK_EMAIL_CHECK === "true";

  if (!isId(userId) || !isId(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user or order ID",
    });
  }

  if (
    !/^[A-Z0-9-]{6,80}$/.test(utr) ||
    !PAYMENT_METHODS.includes(paymentMethod) ||
    !Number.isFinite(toPaise(amountPaid)) ||
    !validDate(paymentDate) ||
    !Array.isArray(req.files) ||
    req.files.length < 1 ||
    req.files.length > 3
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Valid UTR, payment method, amount, date and 1–3 screenshots required",
    });
  }

  const uploadedFiles = [];
  let oldScreenshots = [];

  let committed = false;
  let session = null;

  let manualPaymentId = null;
  let isUpdated = false;

  try {
    const order = await Order.findOne({
      _id: orderId,
      userId,
      paymentGateway: "MANUAL",
    }).lean();

    if (!order) {
      throw createError(404, "Manual order not found");
    }

    const allowedOrderStatuses = [
      "PENDING_PAYMENT",
      "PENDING_VERIFICATION",
    ];

    if (!allowedOrderStatuses.includes(order.status)) {
      throw createError(
        409,
        "This order no longer accepts payment proof",
      );
    }

    if (
      !order.expiresAt ||
      new Date(order.expiresAt).getTime() <= Date.now()
    ) {
      throw createError(
        409,
        "Manual payment order has expired",
      );
    }

    if (
      !skipBankEmailCheck &&
      !order.bankDetailsSentAt
    ) {
      throw createError(
        409,
        "Bank details have not been sent for this order",
      );
    }

    if (
      toPaise(amountPaid) !==
      toPaise(order.totalAmount)
    ) {
      throw createError(
        409,
        "Payment amount does not match order amount",
      );
    }

    const currentManual = await ManualPayment.findOne({
      orderId,
    }).lean();

    if (
      currentManual &&
      ![
        "PENDING_VERIFICATION",
        "REVIEW_REQUIRED",
      ].includes(currentManual.status)
    ) {
      throw createError(
        409,
        "Payment has already been finalized and cannot be modified",
      );
    }

    if (
      currentManual &&
      order.status !== "PENDING_VERIFICATION"
    ) {
      throw createError(
        409,
        "Existing payment and order status are inconsistent",
      );
    }

    if (
      !currentManual &&
      order.status !== "PENDING_PAYMENT"
    ) {
      throw createError(
        409,
        "Payment proof is missing for an order awaiting verification",
      );
    }

    const duplicateUTR = await ManualPayment.findOne({
      normalizedTransactionId: utr,
      orderId: { $ne: order._id },
    }).lean();

    if (duplicateUTR) {
      throw createError(
        409,
        "This transaction reference is already associated with another order",
      );
    }

    for (const file of req.files) {
      const uploaded =
        await uploadManualPaymentScreenshot(
          file,
          orderId,
        );

      uploadedFiles.push(uploaded);
    }

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const now = new Date();

      const currentOrder = await Order.findOne({
        _id: orderId,
        userId,
        paymentGateway: "MANUAL",
      }).session(session);

      if (!currentOrder) {
        throw createError(
          404,
          "Manual order not found",
        );
      }

      if (
        !allowedOrderStatuses.includes(
          currentOrder.status
        )
      ) {
        throw createError(
          409,
          "Order no longer accepts payment proof",
        );
      }

      if (
        !currentOrder.expiresAt ||
        new Date(currentOrder.expiresAt) <= now
      ) {
        throw createError(
          409,
          "Manual order has expired",
        );
      }

      if (
        !skipBankEmailCheck &&
        !currentOrder.bankDetailsSentAt
      ) {
        throw createError(
          409,
          "Bank details not sent",
        );
      }

      const duplicate = await ManualPayment.findOne({
        normalizedTransactionId: utr,
        orderId: { $ne: currentOrder._id },
      }).session(session);

      if (duplicate) {
        throw createError(
          409,
          "Transaction reference already used for another order",
        );
      }

      const existing = await ManualPayment.findOne({
        orderId: currentOrder._id,
      }).session(session);

      const screenshots = uploadedFiles.map((file) => ({
        url: file.url,
        fileId: file.fileId,
        uploadedAt: now,
      }));

      if (existing) {
        if (
          currentOrder.status !==
          "PENDING_VERIFICATION"
        ) {
          throw createError(
            409,
            "Order and payment status mismatch",
          );
        }

        if (
          ![
            "PENDING_VERIFICATION",
            "REVIEW_REQUIRED",
          ].includes(existing.status)
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
          throw createError(
            409,
            "Manual payment ownership mismatch",
          );
        }

        oldScreenshots = (
          existing.paymentScreenshots || []
        ).map((file) => ({
          fileId: file.fileId,
        }));

        existing.transactionId = utr;
        existing.normalizedTransactionId = utr;

        existing.paymentMethod = paymentMethod;
        existing.amountPaid = Number(amountPaid);
        existing.paymentDate = new Date(paymentDate);

        existing.paymentScreenshots = screenshots;

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
        if (
          currentOrder.status !== "PENDING_PAYMENT"
        ) {
          throw createError(
            409,
            "Order already awaiting verification",
          );
        }

        const [manual] = await ManualPayment.create(
          [
            {
              userId,
              orderId: currentOrder._id,
              assetId: currentOrder.assetId,

              fractions: currentOrder.fractions,

              amountPerFraction:
                currentOrder.amountPerFraction,

              totalAmount:
                currentOrder.totalAmount,

              amountPaid: Number(amountPaid),

              paymentMethod,

              transactionId: utr,
              normalizedTransactionId: utr,

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

        currentOrder.status =
          "PENDING_VERIFICATION";

        await currentOrder.save({ session });

        isUpdated = false;
      }
    });

    committed = true;

    if (isUpdated && oldScreenshots.length > 0) {
      const cleanup = await Promise.allSettled(
        oldScreenshots
          .filter((file) => file.fileId)
          .map((file) =>
            deleteManualPaymentScreenshot(file.fileId)
          ),
      );

      for (const result of cleanup) {
        if (result.status === "rejected") {
          console.error(
            "OLD MANUAL SCREENSHOT CLEANUP FAILED:",
            result.reason,
          );
        }
      }
    }

    await sendEmailSafely(
      sendManualPaymentSubmittedEmail,
      orderId,
    );

    return res.status(isUpdated ? 200 : 201).json({
      success: true,

      message: isUpdated
        ? "Manual payment proof updated successfully"
        : "Manual payment proof submitted successfully",

      data: {
        manualPaymentId,
        orderId,

        transactionId: utr,
        paymentMethod,
        amountPaid: Number(amountPaid),
        paymentDate: new Date(paymentDate),

        screenshotCount: uploadedFiles.length,

        status: "PENDING_VERIFICATION",

        isUpdated,
      },

      note:
        "Payment will be verified by the Bunndle admin team.",
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "SUBMIT MANUAL PROOF",
    );
  } finally {
    if (session) {
      await session.endSession();
    }

    if (!committed) {
      await Promise.allSettled(
        uploadedFiles.map((file) =>
          deleteManualPaymentScreenshot(file.fileId)
        ),
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

export const approveManualPayment = async (req, res) => {
  const adminId = getUserId(req);

  const { manualPaymentId } = req.params;

  const {
    bankCreditVerified,
    bankCreditReference,
    bankCreditAmount,
    bankCreditDate,
    remark,
  } = req.body || {};

  const creditRef = normalizeUTR(bankCreditReference);

  if (!isId(adminId) || !isId(manualPaymentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin or manual payment ID",
    });
  }

  if (
    bankCreditVerified !== true ||
    !/^[A-Z0-9-]{6,80}$/.test(creditRef) ||
    !Number.isFinite(toPaise(bankCreditAmount)) ||
    !validDate(bankCreditDate)
  ) {
    return res.status(400).json({
      success: false,
      message: "Verified bank credit details required",
    });
  }

  const session = await mongoose.startSession();

  let purchaseHistoryId = null;
  let paymentId = null;

  let alreadyProcessed = false;

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
        throw createError(409, "Order and manual payment mismatch");
      }

      // ----------------------------------------
      // IDEMPOTENCY
      // ----------------------------------------

      if (manual.status === "APPROVED" && order.status === "COMPLETED") {
        const existing = await PurchaseHistory.findOne({
          orderId: order._id,
        }).session(session);

        if (
          !existing ||
          !manual.paymentId ||
          !sameId(existing.paymentId, manual.paymentId)
        ) {
          throw createError(409, "Previous approval requires reconciliation");
        }

        const existingPayment = await Payment.findById(
          manual.paymentId,
        ).session(session);

        if (!existingPayment || existingPayment.status !== "SUCCESS") {
          throw createError(409, "Existing payment is inconsistent");
        }

        paymentId = existingPayment._id;

        purchaseHistoryId = existing._id;

        alreadyProcessed = true;
        return;
      }

      if (
        order.status !== "PENDING_VERIFICATION" ||
        !REVIEW_STATUSES.includes(manual.status)
      ) {
        throw createError(409, "Payment is not awaiting approval");
      }

      // ----------------------------------------
      // VALIDATE SUBMITTED PROOF
      // ----------------------------------------

      if (
        !manual.normalizedTransactionId ||
        !manual.paymentScreenshots ||
        manual.paymentScreenshots.length < 1 ||
        manual.paymentScreenshots.length > 3
      ) {
        throw createError(409, "UTR or payment screenshots missing");
      }

      if (normalizeUTR(manual.normalizedTransactionId) !== creditRef) {
        throw createError(409, "Bank reference does not match submitted UTR");
      }

      if (
        toPaise(order.totalAmount) !== toPaise(manual.totalAmount) ||
        toPaise(order.totalAmount) !== toPaise(manual.amountPaid) ||
        toPaise(order.totalAmount) !== toPaise(bankCreditAmount)
      ) {
        throw createError(409, "Verified amount does not match order");
      }

      const existingPayment = await Payment.findOne({
        orderId: order._id,
      }).session(session);

      if (existingPayment) {
        throw createError(409, "Payment already exists for this order");
      }

      const existingPurchase = await PurchaseHistory.findOne({
        orderId: order._id,
      }).session(session);

      if (existingPurchase) {
        throw createError(409, "Purchase history already exists");
      }

      // ----------------------------------------
      // ALLOCATE AVAILABLE FRACTIONS
      // ----------------------------------------

      const count = Number(order.fractions);

      if (!Number.isSafeInteger(count) || count <= 0) {
        throw createError(409, "Invalid fraction count");
      }

      // IMPORTANT:
      // This deduction assumes allocateFractions()
      // does NOT deduct availableFractions.
      //
      // Confirm this against ownerShipService.js.
      // Available fractions are checked at approval,
      // because manual orders do not reserve them.

      const asset = await Asset.findOneAndUpdate(
        {
          _id: order.assetId,

          status: "ACTIVE",

          availableFractions: {
            $gte: count,
          },
        },
        {
          $inc: {
            availableFractions: -count,
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!asset) {
        throw createError(
          409,
          "Fractions unavailable. Verified payment requires reconciliation or refund.",
        );
      }

      await allocateFractions({
        assetId: order.assetId,
        userId: order.userId,
        fractions: count,
        session,
      });

      // ----------------------------------------
      // CREATE SUCCESSFUL PAYMENT
      // ----------------------------------------

      const paidAt = new Date(bankCreditDate);

      const [payment] = await Payment.create(
        [
          {
            userId: order.userId,
            orderId: order._id,

            paymentGateway: "MANUAL",

            amount: Number(order.totalAmount),

            currency: "INR",

            status: "SUCCESS",

            paymentMethod: manual.paymentMethod,

            paidAt,
          },
        ],
        { session },
      );

      paymentId = payment._id;

      // ----------------------------------------
      // CREATE PURCHASE HISTORY
      // ----------------------------------------

      const user = await User.findById(order.userId)
        .select("name fullName email phone mobile fullPhone")
        .session(session)
        .lean();

      if (!user) {
        throw createError(404, "Customer not found");
      }

      const [purchase] = await PurchaseHistory.create(
        [
          {
            userId: order.userId,
            assetId: order.assetId,

            orderId: order._id,
            paymentId: payment._id,

            paymentGateway: "MANUAL",

            fractionsPurchased: count,

            amountPerFraction: Number(order.amountPerFraction),

            totalAmount: Number(order.totalAmount),

            userSnapshot: buildUserSnapshot(user),

            assetSnapshot: buildAssetSnapshot(asset, count),

            paymentStatus: "SUCCESS",

            paymentMethod: manual.paymentMethod,

            transactionReference: creditRef,

            paidAt,

            paymentEmailStatus: "PENDING",

            paymentEmailAttempts: 0,

            paymentEmailSentAt: null,

            paymentEmailClaimedAt: null,
          },
        ],
        { session },
      );

      purchaseHistoryId = purchase._id;

      // ----------------------------------------
      // COMPLETE ORDER
      // ----------------------------------------

      order.status = "COMPLETED";

      await order.save({
        session,
      });

      // ----------------------------------------
      // APPROVE MANUAL PAYMENT
      // ----------------------------------------

      const now = new Date();

      manual.status = "APPROVED";

      manual.bankCreditVerified = true;

      manual.bankCreditReference = creditRef;

      manual.bankCreditAmount = Number(bankCreditAmount);

      manual.bankCreditDate = paidAt;

      manual.verifiedBy = adminId;

      manual.verifiedAt = now;

      manual.approvedAt = now;

      manual.adminRemark = String(remark || "").trim() || null;

      manual.paymentId = payment._id;

      manual.purchaseHistoryId = purchase._id;

      await manual.save({
        session,
      });
    });

    // ----------------------------------------
    // SEND SUCCESS EMAIL AFTER COMMIT
    // ----------------------------------------

    if (!alreadyProcessed && purchaseHistoryId) {
      await sendEmailSafely(sendPurchaseConfirmation, purchaseHistoryId);
    }

    return res.status(200).json({
      success: true,

      alreadyProcessed,

      manualPaymentId,
      paymentId,
      purchaseHistoryId,

      message:
        "Manual payment approved. Ownership, Payment and PurchaseHistory created successfully.",
    });
  } catch (error) {
    return handleError(res, error, "APPROVE MANUAL PAYMENT");
  } finally {
    await session.endSession();
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
        "_id userId assetId paymentGateway fractions amountPerFraction totalAmount status expiresAt bankDetailsSentAt createdAt"
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
      .select(
        "_id status transactionId amountPaid paymentMethod submittedAt"
      )
      .lean();

    const emailSent = Boolean(order.bankDetailsSentAt);

    const proofSubmitted =
      order.status === "PENDING_VERIFICATION" ||
      Boolean(manualPayment);

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


