import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import User from "../model/userModel.js";
import Otp from "../model/otpModel.js";
import { sendOtpSms } from "./msgService.js";

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizePhone = (phoneValue) => {
  let phone = String(phoneValue ?? "").replace(/\D/g, "");

  if (/^91[6-9]\d{9}$/.test(phone)) {
    phone = phone.slice(2);
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw createError(
      400,
      "Please enter a valid 10-digit Indian mobile number"
    );
  }

  return phone;
};

const findUserByPhone = async (phone) => {
  return User.findOne({
    phone: {
      $in: [phone, `91${phone}`, `+91${phone}`],
    },
  });
};

export const sendLoginOtpService = async (phoneValue) => {
  const phone = normalizePhone(phoneValue);

  const user = await findUserByPhone(phone);

  if (!user) {
    throw createError(
      404,
      "No account found with this mobile number"
    );
  }

  const resendSeconds =
    Number(process.env.OTP_RESEND_SECONDS) || 60;

  const latestOtp = await Otp.findOne({
    phone,
    purpose: "LOGIN",
  }).sort({ createdAt: -1 });

  if (latestOtp?.createdAt) {
    const nextAllowedAt =
      latestOtp.createdAt.getTime() +
      resendSeconds * 1000;

    if (nextAllowedAt > Date.now()) {
      const remainingSeconds = Math.ceil(
        (nextAllowedAt - Date.now()) / 1000
      );

      throw createError(
        429,
        `Please wait ${remainingSeconds} seconds before requesting another OTP`
      );
    }
  }

  // Previous active OTP invalidate karo
  await Otp.updateMany(
    {
      phone,
      purpose: "LOGIN",
      isUsed: false,
    },
    {
      $set: {
        isUsed: true,
      },
    }
  );

  const otp = crypto.randomInt(100000, 1000000).toString();

  const otpHash = await bcrypt.hash(otp, 10);

  const expiryMinutes =
    Number(process.env.OTP_EXPIRE_MINUTES) || 10;

  const otpRecord = await Otp.create({
    phone,
    userId: user._id,
    purpose: "LOGIN",
    otpHash,
    expiresAt: new Date(
      Date.now() + expiryMinutes * 60 * 1000
    ),
  });

  try {
    await sendOtpSms({
      phone,
      otp,
    });
  } catch (error) {
    await Otp.deleteOne({
      _id: otpRecord._id,
    });

    throw error;
  }

  return {
    phone,
    expiresInMinutes: expiryMinutes,

    // Production mein OTP response mein nahi jayegi
    ...(process.env.USE_REAL_SMS !== "true"
      ? {
          developmentOtp: otp,
        }
      : {}),
  };
};

export const verifyLoginOtpService = async ({
  phone: phoneValue,
  otp: otpValue,
}) => {
  const phone = normalizePhone(phoneValue);
  const otp = String(otpValue ?? "").trim();

  if (!/^\d{6}$/.test(otp)) {
    throw createError(400, "Please enter a valid 6-digit OTP");
  }

  const user = await findUserByPhone(phone);

  if (!user) {
    throw createError(404, "User not found");
  }

  const otpRecord = await Otp.findOne({
    phone,
    userId: user._id,
    purpose: "LOGIN",
    isUsed: false,
  })
    .sort({ createdAt: -1 })
    .select("+otpHash");

  if (!otpRecord) {
    throw createError(
      400,
      "OTP not found or already used. Request a new OTP"
    );
  }

  if (otpRecord.expiresAt.getTime() <= Date.now()) {
    otpRecord.isUsed = true;
    await otpRecord.save();

    throw createError(
      400,
      "OTP has expired. Please request a new OTP"
    );
  }

  const maximumAttempts =
    Number(process.env.OTP_MAX_ATTEMPTS) || 5;

  if (otpRecord.attempts >= maximumAttempts) {
    otpRecord.isUsed = true;
    await otpRecord.save();

    throw createError(
      429,
      "Maximum OTP attempts exceeded. Request a new OTP"
    );
  }

  const isOtpCorrect = await bcrypt.compare(
    otp,
    otpRecord.otpHash
  );

  otpRecord.attempts += 1;

  if (!isOtpCorrect) {
    if (otpRecord.attempts >= maximumAttempts) {
      otpRecord.isUsed = true;
    }

    await otpRecord.save();

    throw createError(400, "Invalid OTP");
  }

  otpRecord.isUsed = true;
  otpRecord.verifiedAt = new Date();

  await otpRecord.save();

  // Number ko consistent format mein save karo
  user.phone = phone;

  await user.save();

  return user;
};