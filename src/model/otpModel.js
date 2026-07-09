import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    purpose: {
      type: String,
      enum: ["LOGIN", "PHONE_VERIFY", "RESET_PASSWORD"],
      default: "LOGIN",
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    isUsed: {
      type: Boolean,
      default: false,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Expired OTP documents automatically delete honge
otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model("Otp", otpSchema);