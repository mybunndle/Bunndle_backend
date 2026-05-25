import mongoose from "mongoose";

const aadhaarVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fullName: {
      type: String,
      trim: true,
    },

    maskedAadhaar: {
      type: String,
      required: true,
    },

    gender: {
      type: String,
    },

    dob: {
      type: String,
    },

    state: {
      type: String,
    },

    mobileLinked: {
      type: Boolean,
      default: false,
    },

    verificationId: String,

    apiProvider: {
      type: String,
      default: "IDSPay",
    },

    verified: {
      type: Boolean,
      default: false,
    },

    rawResponse: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "AadhaarVerification",
  aadhaarVerificationSchema
);