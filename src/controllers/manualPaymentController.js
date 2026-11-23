import mongoose from "mongoose";

import Order from "../model/OrderModel.js";
import Payment from "../model/PaymentModel.js";
import Asset from "../model/coAssetModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";
import User from "../model/userModel.js";

import { allocateFractions } from "../services/ownerShipService.js";

import { sendPurchaseConfirmation } from "../services/finalizeSuccessfulPaymentService.js";

import {
  uploadManualPaymentScreenshot,
  deleteManualPaymentScreenshot,
  getManualPaymentScreenshotSignedUrl,
} from "../services/imageStorage.service.js";

import { notifyManualPayment } from "../services/manualPaymentNotification.js";

// ======================================================
// CONSTANTS
// ======================================================

const MANUAL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const REVIEW_STATUSES = ["PENDING_VERIFICATION", "REVIEW_REQUIRED"];

// ======================================================
// COMMON HELPERS
// ======================================================

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isValidId = (id) => mongoose.isValidObjectId(id);

const getUserId = (req) => req.user?._id || req.user?.id || req.user?.userId;

const sameId = (a, b) => String(a) === String(b);

const normalizeUTR = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const toPaise = (value) => {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return NaN;
  }

  return Math.round(number * 100);
};

const validDate = (value) => {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now() + 600000;
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

const sendEmailSafely = async (type, details) => {
  try {
    await notifyManualPayment(type, details);
  } catch (error) {
    console.error(`MANUAL PAYMENT EMAIL ${type} FAILED:`, error);
  }
};

// ======================================================
// ASSET SNAPSHOT
// ======================================================

const buildAssetSnapshot = (asset, fractionsPurchased) => ({
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
      : Number(asset.rentalAmountPerFraction) * fractionsPurchased,

  durationMonths: asset.durationMonths ?? null,
  lockInMonths: asset.lockInMonths ?? null,
});

// ======================================================
// 1. CREATE MANUAL ORDER
// POST /api/manual-payments/orders
//
// IMPORTANT:
// NO FRACTIONS RESERVED HERE.
// ======================================================

export const createManualOrder = async (req, res) => {
  const userId = getUserId(req);

  const { assetId, fractions } = req.body || {};

  if (
    !isValidId(userId) ||
    !isValidId(assetId) ||
    !Number.isSafeInteger(Number(fractions)) ||
    Number(fractions) <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid assetId and fractions are required",
    });
  }

  const count = Number(fractions);
  const session = await mongoose.startSession();

  let order = null;
  let payment = null;

  try {
    const user = await User.findById(userId).select(
      "name email kycStatus isKycVerified",
    );

    if (!user) {
      throw createError(404, "User not found");
    }

    if (user.kycStatus !== "VERIFIED" || !user.isKycVerified) {
      throw createError(403, "KYC verification is required");
    }

    await session.withTransaction(async () => {
      // Check available fractions only.
      // Do not modify Asset inventory.

      const asset = await Asset.findOne({
        _id: assetId,
        status: "ACTIVE",
        availableFractions: {
          $gte: count,
        },
      }).session(session);

      if (!asset) {
        throw createError(409, "Requested fractions are unavailable");
      }

      // Follow Bunndle's existing
      // 80% public purchase restriction.

      const publicLimit = Math.floor(Number(asset.totalFractions) * 0.8);

      const publicUsed =
        Number(asset.totalFractions) - Number(asset.availableFractions);

      if (!Number.isFinite(publicLimit) || publicUsed + count > publicLimit) {
        throw createError(409, "Maximum public ownership limit reached");
      }

      const amountPerFraction = Number(asset.amountPerFraction);

      const totalAmount = amountPerFraction * count;

      if (!Number.isFinite(toPaise(totalAmount))) {
        throw createError(400, "Invalid asset payment amount");
      }

      const expiresAt = new Date(Date.now() + MANUAL_EXPIRY_MS);

      // =====================================
      // CREATE ORDER
      // =====================================

      const createdOrders = await Order.create(
        [
          {
            userId,
            assetId,

            paymentGateway: "MANUAL",

            fractions: count,

            amountPerFraction,
            totalAmount,

            status: "PENDING_PAYMENT",
            expiresAt,
          },
        ],
        { session },
      );

      order = createdOrders[0];

      // =====================================
      // CREATE PENDING PAYMENT
      // =====================================

      const createdPayments = await Payment.create(
        [
          {
            userId,
            orderId: order._id,

            paymentGateway: "MANUAL",

            amount: totalAmount,
            currency: "INR",

            status: "PENDING",

            manualVerificationStatus: "NOT_SUBMITTED",

            manualScreenshots: [],
          },
        ],
        { session },
      );

      payment = createdPayments[0];
    });

    await sendEmailSafely("INSTRUCTIONS", {
      orderId: String(order._id),
    });

    return res.status(201).json({
      success: true,

      message: "Manual payment order created successfully",

      orderId: order._id,
      paymentId: payment._id,

      assetId,
      fractions: count,

      amountPerFraction: order.amountPerFraction,

      totalAmount: order.totalAmount,

      paymentGateway: "MANUAL",

      orderStatus: "PENDING_PAYMENT",

      expiresAt: order.expiresAt,

      note: "Fractions are not reserved for manual payments. Availability will be checked again during admin approval.",
    });
  } catch (error) {
    return handleError(res, error, "CREATE MANUAL ORDER");
  } finally {
    await session.endSession();
  }
};

// ======================================================
// 2. SUBMIT PAYMENT PROOF
// POST /api/manual-payments/orders/:orderId/proof
//
// 1 TO 3 SCREENSHOTS
// NO FRACTION ALLOCATION
// ======================================================

export const submitManualProof = async (req, res) => {
  const userId = getUserId(req);
  const { orderId } = req.params;

  const { transactionId, paymentMethod, amountPaid, paymentDate } =
    req.body || {};

  const utr = normalizeUTR(transactionId);

  const allowedMethods = ["BANK_TRANSFER", "IMPS", "NEFT", "RTGS", "UPI"];

  if (
    !isValidId(userId) ||
    !isValidId(orderId) ||
    !/^[A-Z0-9-]{6,80}$/.test(utr) ||
    !allowedMethods.includes(paymentMethod) ||
    !Number.isFinite(toPaise(amountPaid)) ||
    !validDate(paymentDate) ||
    !Array.isArray(req.files) ||
    req.files.length < 1 ||
    req.files.length > 3
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Valid UTR, payment method, date, amount and 1-3 screenshots required",
    });
  }

  const uploads = [];
  const session = await mongoose.startSession();

  let committed = false;

  try {
    const order = await Order.findOne({
      _id: orderId,
      userId,
      paymentGateway: "MANUAL",
    }).lean();

    if (!order) {
      throw createError(404, "Manual order not found");
    }

    if (
      order.status !== "PENDING_PAYMENT" ||
      !order.expiresAt ||
      new Date(order.expiresAt).getTime() <= Date.now()
    ) {
      throw createError(
        409,
        "Order expired or no longer accepts payment proof",
      );
    }

    if (toPaise(amountPaid) !== toPaise(order.totalAmount)) {
      throw createError(
        409,
        "Paid amount does not match order amount. Contact support for reconciliation.",
      );
    }

    // =====================================
    // UPLOAD SCREENSHOTS TO IMAGEKIT
    // =====================================

    for (const file of req.files) {
      const uploaded = await uploadManualPaymentScreenshot(file, orderId);

      uploads.push(uploaded);
    }

    // =====================================
    // UPDATE PAYMENT + ORDER
    // =====================================

    await session.withTransaction(async () => {
      const now = new Date();

      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: orderId,
          userId,

          paymentGateway: "MANUAL",

          status: "PENDING_PAYMENT",

          expiresAt: {
            $gt: now,
          },
        },
        {
          $set: {
            status: "PENDING_VERIFICATION",
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!updatedOrder) {
        throw createError(409, "Order expired or already submitted");
      }

      const payment = await Payment.findOne({
        orderId,
        userId,

        paymentGateway: "MANUAL",

        status: "PENDING",
      }).session(session);

      if (!payment || payment.manualVerificationStatus !== "NOT_SUBMITTED") {
        throw createError(409, "Payment is not awaiting proof");
      }

      // Prevent duplicate UTR.

      const duplicate = await Payment.findOne({
        _id: {
          $ne: payment._id,
        },

        paymentGateway: "MANUAL",

        manualTransactionId: utr,
      }).session(session);

      if (duplicate) {
        throw createError(409, "Transaction reference already submitted");
      }

      payment.manualTransactionId = utr;

      payment.manualPaymentMethod = paymentMethod;

      payment.manualPaymentDate = new Date(paymentDate);

      payment.manualAmountPaid = Number(amountPaid);

      payment.manualScreenshots = uploads.map((item) => ({
        url: item.url,
        fileId: item.fileId,
      }));

      payment.manualSubmittedAt = now;

      payment.manualVerificationStatus = "PENDING_VERIFICATION";

      await payment.save({ session });
    });

    committed = true;

    await sendEmailSafely("SUBMITTED", {
      orderId,
      utr,
    });

    return res.status(200).json({
      success: true,

      message: "Payment proof submitted. Awaiting admin verification.",

      orderId,

      manualTransactionId: utr,

      screenshotCount: uploads.length,

      orderStatus: "PENDING_VERIFICATION",

      paymentStatus: "PENDING",

      manualVerificationStatus: "PENDING_VERIFICATION",
    });
  } catch (error) {
    return handleError(res, error, "SUBMIT MANUAL PROOF");
  } finally {
    await session.endSession();

    // Remove newly uploaded screenshots
    // only when the DB transaction did not commit.

    if (!committed) {
      await Promise.allSettled(
        uploads.map((item) => deleteManualPaymentScreenshot(item.fileId)),
      );
    }
  }
};

// ======================================================
// 3. GET USER MANUAL PAYMENTS
// GET /api/manual-payments/my
// ======================================================

export const getMyManualPayments = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!isValidId(userId)) {
      throw createError(401, "Authentication required");
    }

    const payments = await Payment.find({
      userId,
      paymentGateway: "MANUAL",
    })
      .select("-manualScreenshots -bankCreditReference")
      .populate({
        path: "orderId",
        select: "assetId fractions totalAmount status expiresAt createdAt",
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    return handleError(res, error, "GET MY MANUAL PAYMENTS");
  }
};

// ======================================================
// 4. ADMIN - LIST MANUAL PAYMENTS
// GET /api/manual-payments/admin
// ======================================================

export const listAdminManualPayments = async (req, res) => {
  try {
    const allowedStatuses = [
      "NOT_SUBMITTED",
      "PENDING_VERIFICATION",
      "REVIEW_REQUIRED",
      "APPROVED",
      "REJECTED",
      "EXPIRED",
    ];

    const filter = {
      paymentGateway: "MANUAL",
    };

    if (req.query.status) {
      if (!allowedStatuses.includes(req.query.status)) {
        throw createError(400, "Invalid verification status");
      }

      filter.manualVerificationStatus = req.query.status;
    }

    const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));

    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .select("-manualScreenshots")
        .populate({
          path: "orderId",
          select: "assetId fractions totalAmount status expiresAt",
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      payments,
    });
  } catch (error) {
    return handleError(res, error, "LIST ADMIN MANUAL PAYMENTS");
  }
};

// ======================================================
// 5. ADMIN - PAYMENT DETAILS
// GET /api/manual-payments/admin/:paymentId
// ======================================================

export const getAdminManualPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidId(paymentId)) {
      throw createError(400, "Invalid payment ID");
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      paymentGateway: "MANUAL",
    }).lean();

    if (!payment) {
      throw createError(404, "Manual payment not found");
    }

    const order = await Order.findById(payment.orderId).lean();

    const user = await User.findById(payment.userId)
      .select("name email phone")
      .lean();

    // Signed URLs only available
    // through admin-authenticated endpoint.

    const screenshots = (payment.manualScreenshots || []).map((item) => ({
      fileId: item.fileId,

      signedUrl: getManualPaymentScreenshotSignedUrl(item.url),
    }));

    return res.status(200).json({
      success: true,

      payment: {
        ...payment,
        manualScreenshots: screenshots,
      },

      order,
      user,
    });
  } catch (error) {
    return handleError(res, error, "GET ADMIN MANUAL PAYMENT");
  }
};

// ======================================================
// 6. ADMIN - APPROVE MANUAL PAYMENT
// PATCH /api/manual-payments/admin/:paymentId/approve
//
// IMPORTANT:
// MANUAL ORDERS HAVE NO RESERVED FRACTIONS.
// DEDUCT AVAILABLE FRACTIONS ONLY ON APPROVAL.
// ======================================================

export const approveManualPayment = async (req, res) => {
  const adminId = getUserId(req);
  const { paymentId } = req.params;

  const {
    bankCreditVerified,
    bankCreditReference,
    bankCreditAmount,
    bankCreditDate,
    remark,
  } = req.body || {};

  const creditRef = normalizeUTR(bankCreditReference);

  if (!isValidId(adminId) || !isValidId(paymentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin or payment ID",
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
      message: "Verified bank credit reference, amount and date are required",
    });
  }

  // Admin must independently confirm bank credit
  // using the official bank statement.
  // Do not treat this request flag as bank proof.

  const session = await mongoose.startSession();

  let purchaseHistoryId = null;
  let alreadyProcessed = false;

  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: paymentId,
        paymentGateway: "MANUAL",
      }).session(session);

      if (!payment) {
        throw createError(404, "Manual payment not found");
      }

      const order = await Order.findById(payment.orderId).session(session);

      if (
        !order ||
        order.paymentGateway !== "MANUAL" ||
        !sameId(order.userId, payment.userId)
      ) {
        throw createError(409, "Order and payment mismatch");
      }

      // ====================================
      // PREVENT DUPLICATE FINALIZATION
      // ====================================

      const existingPurchase = await PurchaseHistory.findOne({
        $or: [{ orderId: order._id }, { paymentId: payment._id }],
      }).session(session);

      if (existingPurchase) {
        if (
          order.status !== "COMPLETED" ||
          payment.status !== "SUCCESS" ||
          payment.manualVerificationStatus !== "APPROVED" ||
          !sameId(existingPurchase.orderId, order._id) ||
          !sameId(existingPurchase.paymentId, payment._id)
        ) {
          throw createError(
            409,
            "Previous finalization inconsistent. Reconciliation required.",
          );
        }

        purchaseHistoryId = existingPurchase._id;

        alreadyProcessed = true;
        return;
      }

      if (
        order.status !== "PENDING_VERIFICATION" ||
        payment.status !== "PENDING" ||
        !REVIEW_STATUSES.includes(payment.manualVerificationStatus)
      ) {
        throw createError(409, "Payment is not awaiting approval");
      }

      // ====================================
      // CHECK SUBMITTED PAYMENT DETAILS
      // ====================================

      if (
        !payment.manualTransactionId ||
        !Array.isArray(payment.manualScreenshots) ||
        payment.manualScreenshots.length < 1 ||
        payment.manualScreenshots.length > 3
      ) {
        throw createError(409, "UTR or payment screenshots missing");
      }

      if (
        toPaise(order.totalAmount) !== toPaise(payment.amount) ||
        toPaise(payment.amount) !== toPaise(payment.manualAmountPaid) ||
        toPaise(payment.amount) !== toPaise(bankCreditAmount)
      ) {
        throw createError(
          409,
          "Bank credit amount does not match order amount",
        );
      }

      if (
        normalizeUTR(payment.manualTransactionId) !== creditRef &&
        !String(remark || "").trim()
      ) {
        throw createError(
          409,
          "Bank reference mismatch. Admin reconciliation remark required.",
        );
      }

      // ====================================
      // PREVENT DUPLICATE BANK REFERENCE
      // ====================================

      const usedReference = await Payment.findOne({
        _id: { $ne: payment._id },

        paymentGateway: "MANUAL",

        $or: [
          {
            manualTransactionId: creditRef,
          },
          {
            bankCreditReference: creditRef,
          },
        ],
      }).session(session);

      if (usedReference) {
        throw createError(
          409,
          "Bank transaction already associated with another payment",
        );
      }

      // ====================================
      // CHECK FRACTIONS
      // ====================================

      const count = Number(order.fractions);

      if (!Number.isSafeInteger(count) || count <= 0) {
        throw createError(409, "Invalid order fraction count");
      }

      // ====================================
      // DEDUCT AVAILABLE FRACTIONS
      // MANUAL: NO RESERVED FRACTIONS
      // ====================================

      // This matches the 80% public limit
      // already used in Bunndle's online orders.

      const assetResult = await Asset.findOneAndUpdate(
        {
          _id: order.assetId,

          status: "ACTIVE",

          availableFractions: {
            $gte: count,
          },

          $expr: {
            $lte: [
              {
                $add: [
                  {
                    $subtract: ["$totalFractions", "$availableFractions"],
                  },
                  count,
                ],
              },
              {
                $floor: {
                  $multiply: ["$totalFractions", 0.8],
                },
              },
            ],
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

      if (!assetResult) {
        throw createError(
          409,
          "Fractions unavailable or public ownership limit reached. Keep payment for reconciliation or refund.",
        );
      }

      // ====================================
      // ALLOCATE OWNERSHIP
      // ====================================

      // Must be session-aware and must not
      // decrement availableFractions again.

      await allocateFractions({
        assetId: order.assetId,
        userId: order.userId,
        fractions: count,
        session,
      });

      // ====================================
      // UPDATE PAYMENT
      // ====================================

      const paidAt = new Date(bankCreditDate);

      payment.status = "SUCCESS";
      payment.paidAt = paidAt;

      payment.paymentMethod = "BANK_TRANSFER";

      payment.manualVerificationStatus = "APPROVED";

      payment.manualVerifiedBy = adminId;
      payment.manualVerifiedAt = new Date();

      payment.bankCreditVerified = true;

      payment.bankCreditReference = creditRef;

      payment.bankCreditAmount = Number(bankCreditAmount);

      payment.bankCreditDate = paidAt;

      payment.manualAdminRemark = String(remark || "").trim() || null;

      await payment.save({ session });

      // ====================================
      // COMPLETE ORDER
      // ====================================

      order.status = "COMPLETED";

      await order.save({ session });

      // ====================================
      // USER SNAPSHOT
      // ====================================

      const user = await User.findById(order.userId)
        .select("name fullName email phone mobile fullPhone")
        .session(session)
        .lean();

      const userSnapshot = {
        name: user?.name || user?.fullName || null,

        email: user?.email || null,

        phone: user?.fullPhone || user?.phone || user?.mobile || null,
      };

      // ====================================
      // ASSET SNAPSHOT
      // ====================================

      const assetSnapshot = buildAssetSnapshot(assetResult, count);

      // ====================================
      // CREATE PURCHASE HISTORY
      // ====================================

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

            userSnapshot,
            assetSnapshot,

            paymentStatus: "SUCCESS",

            paymentMethod: "BANK_TRANSFER",

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
    });

    // ====================================
    // SEND CONFIRMATION AFTER COMMIT
    // ====================================

    if (!alreadyProcessed && purchaseHistoryId) {
      try {
        await sendPurchaseConfirmation(purchaseHistoryId);
      } catch (emailError) {
        console.error("MANUAL PURCHASE EMAIL ERROR:", emailError);
      }
    }

    return res.status(200).json({
      success: true,
      alreadyProcessed,

      paymentId,
      purchaseHistoryId,

      message:
        "Manual payment approved. Ownership and purchase history created successfully.",
    });
  } catch (error) {
    return handleError(res, error, "APPROVE MANUAL PAYMENT");
  } finally {
    await session.endSession();
  }
};

// ======================================================
// 7. ADMIN - REJECT MANUAL PAYMENT
// PATCH /api/manual-payments/admin/:paymentId/reject
//
// NO FRACTIONS TO RELEASE.
// ======================================================

export const rejectManualPayment = async (req, res) => {
  const adminId = getUserId(req);
  const { paymentId } = req.params;

  const { reason, bankCreditConfirmedAbsent } = req.body || {};

  if (
    !isValidId(adminId) ||
    !isValidId(paymentId) ||
    !String(reason || "").trim() ||
    bankCreditConfirmedAbsent !== true
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Valid payment ID, reason and confirmation of absent bank credit required",
    });
  }

  const session = await mongoose.startSession();

  let orderId = null;
  let alreadyRejected = false;

  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: paymentId,
        paymentGateway: "MANUAL",
      }).session(session);

      if (!payment) {
        throw createError(404, "Manual payment not found");
      }

      const order = await Order.findById(payment.orderId).session(session);

      if (
        !order ||
        order.paymentGateway !== "MANUAL" ||
        !sameId(order.userId, payment.userId)
      ) {
        throw createError(409, "Order mismatch");
      }

      orderId = order._id;

      if (
        payment.manualVerificationStatus === "REJECTED" &&
        order.status === "REJECTED"
      ) {
        alreadyRejected = true;
        return;
      }

      if (
        order.status !== "PENDING_VERIFICATION" ||
        payment.status !== "PENDING" ||
        !REVIEW_STATUSES.includes(payment.manualVerificationStatus)
      ) {
        throw createError(409, "Payment cannot be rejected in current status");
      }

      const existingPurchase = await PurchaseHistory.exists({
        orderId: order._id,
      }).session(session);

      if (existingPurchase) {
        throw createError(409, "Purchase already exists");
      }

      // No inventory updates.
      // Manual orders never reserved fractions.

      payment.status = "FAILED";

      payment.manualVerificationStatus = "REJECTED";

      payment.manualRejectionReason = String(reason).trim();

      payment.manualVerifiedBy = adminId;
      payment.manualVerifiedAt = new Date();

      await payment.save({ session });

      order.status = "REJECTED";

      await order.save({ session });
    });

    if (!alreadyRejected) {
      await sendEmailSafely("REJECTED", {
        orderId: String(orderId),
        reason: String(reason).trim(),
      });
    }

    return res.status(200).json({
      success: true,
      alreadyRejected,

      orderId,

      message: "Manual payment rejected successfully",
    });
  } catch (error) {
    return handleError(res, error, "REJECT MANUAL PAYMENT");
  } finally {
    await session.endSession();
  }
};

// ======================================================
// 8. ADMIN - MARK FOR REVIEW
// PATCH /api/manual-payments/admin/:paymentId/review
// ======================================================

export const markManualReviewRequired = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const remark = String(req.body?.remark || "").trim();

    if (!isValidId(paymentId) || !remark) {
      throw createError(400, "Payment ID and remark required");
    }

    const payment = await Payment.findOneAndUpdate(
      {
        _id: paymentId,

        paymentGateway: "MANUAL",

        status: "PENDING",

        manualVerificationStatus: "PENDING_VERIFICATION",
      },
      {
        $set: {
          manualVerificationStatus: "REVIEW_REQUIRED",

          manualAdminRemark: remark,
        },
      },
      { new: true },
    );

    if (!payment) {
      throw createError(409, "Payment is not pending verification");
    }

    return res.status(200).json({
      success: true,

      message: "Payment marked for further review",
    });
  } catch (error) {
    return handleError(res, error, "MARK MANUAL REVIEW");
  }
};
