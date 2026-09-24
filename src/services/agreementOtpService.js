import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import User from "../model/userModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";
import AgreementOtp from "../model/agreementOtpModel.js";

import { sendOtpSms } from "./msgService.js";

// ============================================================
// CREATE ERROR
// ============================================================

const createError = (statusCode, message) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

// ============================================================
// NORMALIZE PHONE
// ============================================================

const normalizePhone = (phoneValue) => {
  let phone = String(phoneValue ?? "").replace(/\D/g, "");

  // Remove +91 / 91
  if (/^91[6-9]\d{9}$/.test(phone)) {
    phone = phone.slice(2);
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw createError(
      400,
      "Please enter a valid 10-digit Indian mobile number",
    );
  }

  return phone;
};

// ============================================================
// VALIDATE PURCHASE
// ============================================================

const getValidatedPurchase = async ({ userId, purchaseId }) => {
  // ========================================================
  // USER ID
  // ========================================================

  if (!mongoose.isValidObjectId(userId)) {
    throw createError(401, "Invalid user");
  }

  // ========================================================
  // PURCHASE ID
  // ========================================================

  if (!mongoose.isValidObjectId(purchaseId)) {
    throw createError(400, "Invalid purchase id");
  }

  // ========================================================
  // FIND PURCHASE
  // ========================================================

  const purchase = await PurchaseHistory.findById(purchaseId).lean();

  if (!purchase) {
    throw createError(404, "Purchase history not found");
  }

  // ========================================================
  // PURCHASE OWNER CHECK
  // ========================================================

  if (String(purchase.userId) !== String(userId)) {
    throw createError(
      403,
      "This purchase does not belong to the logged-in user",
    );
  }

  // ========================================================
  // PAYMENT STATUS
  // ========================================================

  if (purchase.paymentStatus !== "SUCCESS") {
    throw createError(
      400,
      `Agreement OTP can only be used after successful payment. Current payment status: ${purchase.paymentStatus}`,
    );
  }

  // ========================================================
  // AGREEMENT ALREADY GENERATED
  // ========================================================

  const agreementUrl = purchase.documents?.digitalAgreement?.url;

  if (agreementUrl || purchase.documentGenerationStatus === "COMPLETED") {
    throw createError(409, "Agreement has already been generated");
  }

  // ========================================================
  // AGREEMENT GENERATION PROCESSING
  // ========================================================

  if (purchase.documentGenerationStatus === "PROCESSING") {
    throw createError(409, "Agreement generation is already in progress");
  }

  return purchase;
};

// ============================================================
// SEND AGREEMENT OTP
// ============================================================

export const sendAgreementOtpService = async ({ userId, purchaseId }) => {
  // ========================================================
  // VALIDATE PURCHASE
  // ========================================================

  await getValidatedPurchase({
    userId,
    purchaseId,
  });

  // ========================================================
  // FIND USER
  // ========================================================

  const user = await User.findById(userId);

  if (!user) {
    throw createError(404, "User not found");
  }

  if (!user.phone) {
    throw createError(400, "Mobile number is not available");
  }

  // ========================================================
  // NORMALIZE PHONE
  // ========================================================

  const phone = normalizePhone(user.phone);

  // ========================================================
  // RESEND COOLDOWN
  // ========================================================

  const resendSeconds = Number(process.env.OTP_RESEND_SECONDS) || 60;

  const latestOtp = await AgreementOtp.findOne({
    userId,
    purchaseId,
  }).sort({
    createdAt: -1,
  });

  if (latestOtp?.createdAt) {
    const nextAllowedAt = latestOtp.createdAt.getTime() + resendSeconds * 1000;

    if (nextAllowedAt > Date.now()) {
      const remainingSeconds = Math.ceil((nextAllowedAt - Date.now()) / 1000);

      throw createError(
        429,
        `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      );
    }
  }

  // ========================================================
  // INVALIDATE PREVIOUS UNUSED OTP
  // ========================================================

  await AgreementOtp.updateMany(
    {
      userId,
      purchaseId,

      isUsed: false,
    },

    {
      $set: {
        isUsed: true,
      },
    },
  );

  // ========================================================
  // GENERATE OTP
  // ========================================================

  const otp = crypto.randomInt(100000, 1000000).toString();

  // ========================================================
  // HASH OTP
  // ========================================================

  const otpHash = await bcrypt.hash(otp, 10);

  // ========================================================
  // OTP EXPIRY
  // ========================================================

  const expiryMinutes = Number(process.env.OTP_EXPIRE_MINUTES) || 10;

  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // ========================================================
  // TTL DELETE
  // ========================================================

  const deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // ========================================================
  // CREATE OTP RECORD
  // ========================================================

  const otpRecord = await AgreementOtp.create({
    userId,

    purchaseId,

    phone,

    otpHash,

    expiresAt,

    deleteAt,

    attempts: 0,

    isUsed: false,

    verifiedAt: null,
  });

  // ========================================================
  // SEND OTP SMS
  // ========================================================

  try {
    await sendOtpSms({
      phone,
      otp,
    });
  } catch (error) {
    // SMS failed -> remove OTP
    await AgreementOtp.deleteOne({
      _id: otpRecord._id,
    });

    throw error;
  }

  // ========================================================
  // RESPONSE
  //
  // IMPORTANT:
  // No agreement verification token is generated here.
  //
  // Token will only be generated after OTP verification.
  // ========================================================

  return {
    maskedPhone: `******${phone.slice(-4)}`,

    expiresInMinutes: expiryMinutes,

    ...(process.env.USE_REAL_SMS !== "true"
      ? {
          developmentOtp: otp,
        }
      : {}),
  };
};

// ============================================================
// VERIFY AGREEMENT OTP
// ============================================================

export const verifyAgreementOtpService = async ({
  userId,
  purchaseId,

  otp: otpValue,
}) => {
  // ========================================================
  // OTP FORMAT
  // ========================================================

  const otp = String(otpValue ?? "").trim();

  if (!/^\d{6}$/.test(otp)) {
    throw createError(400, "Please enter a valid 6-digit OTP");
  }

  // ========================================================
  // VALIDATE PURCHASE
  // ========================================================

  await getValidatedPurchase({
    userId,
    purchaseId,
  });

  // ========================================================
  // FIND LATEST ACTIVE OTP
  // ========================================================

  const otpRecord = await AgreementOtp.findOne({
    userId,

    purchaseId,

    isUsed: false,
  })
    .sort({
      createdAt: -1,
    })
    .select("+otpHash");

  if (!otpRecord) {
    throw createError(400, "OTP not found or already used. Request a new OTP");
  }

  // ========================================================
  // CHECK OTP EXPIRY
  // ========================================================

  if (otpRecord.expiresAt.getTime() <= Date.now()) {
    otpRecord.isUsed = true;

    await otpRecord.save();

    throw createError(400, "OTP has expired. Please request a new OTP");
  }

  // ========================================================
  // MAX ATTEMPTS
  // ========================================================

  const maximumAttempts = Number(process.env.OTP_MAX_ATTEMPTS) || 5;

  if (otpRecord.attempts >= maximumAttempts) {
    otpRecord.isUsed = true;

    await otpRecord.save();

    throw createError(429, "Maximum OTP attempts exceeded. Request a new OTP");
  }

  // ========================================================
  // COMPARE OTP
  // ========================================================

  const isOtpCorrect = await bcrypt.compare(otp, otpRecord.otpHash);

  otpRecord.attempts += 1;

  // ========================================================
  // WRONG OTP
  // ========================================================

  if (!isOtpCorrect) {
    if (otpRecord.attempts >= maximumAttempts) {
      otpRecord.isUsed = true;
    }

    await otpRecord.save();

    const attemptsRemaining = Math.max(maximumAttempts - otpRecord.attempts, 0);

    if (attemptsRemaining <= 0) {
      throw createError(
        429,
        "Maximum OTP attempts exceeded. Request a new OTP",
      );
    }

    throw createError(
      400,
      `Invalid OTP. ${attemptsRemaining} attempts remaining`,
    );
  }

  // ========================================================
  // OTP VERIFIED
  // ========================================================

  otpRecord.isUsed = true;

  otpRecord.verifiedAt = new Date();

  await otpRecord.save();

  // ========================================================
  // CHECK JWT SECRET
  // ========================================================

  if (!process.env.JWT_SECRET) {
    throw createError(500, "JWT_SECRET is not configured");
  }

  // ========================================================
  // GENERATE AGREEMENT VERIFICATION TOKEN
  //
  // This token is NOT a login token.
  //
  // It proves:
  // - OTP was verified
  // - For this user
  // - For this exact purchase
  //
  // Valid for 10 minutes.
  // ========================================================

  const agreementVerificationToken = jwt.sign(
    {
      userId: String(userId),

      purchaseId: String(purchaseId),

      otpId: String(otpRecord._id),

      purpose: "AGREEMENT_VERIFICATION",
    },

    process.env.JWT_SECRET,

    {
      expiresIn: "10m",

      issuer: "bunndle-api",

      audience: "bunndle-agreement",
    },
  );

  // ========================================================
  // VERIFY RESPONSE
  // ========================================================

  return {
    verified: true,

    verifiedAt: otpRecord.verifiedAt,

    agreementVerificationToken,

    expiresInSeconds: 600,
  };
};
