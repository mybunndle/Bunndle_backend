import mongoose from "mongoose";

const agreementOtpSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      purchaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseHistory",
        required: true,
      },

      phone: {
        type: String,
        required: true,
      },

      otpHash: {
        type: String,
        required: true,
        select: false,
      },

      expiresAt: {
        type: Date,
        required: true,
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

      deleteAt: {
        type: Date,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );


// OTP search
agreementOtpSchema.index({
  userId: 1,
  purchaseId: 1,
  createdAt: -1,
});


// Automatically remove old OTP records
agreementOtpSchema.index(
  {
    deleteAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);


const AgreementOtp =
  mongoose.model(
    "AgreementOtp",
    agreementOtpSchema
  );


export default AgreementOtp;