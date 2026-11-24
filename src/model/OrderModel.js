import mongoose from "mongoose";

const getIndianTime = () => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + istOffset);
};

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    paymentGateway: {
      type: String,
      enum: ["RAZORPAY", "CASHFREE", "PAYU", "MANUAL"],
      default: "RAZORPAY",
      required: true,
      index: true,
    },
    payuTxnId: {
      type: String,
      default: null,
      trim: true,
    },

    fractions: {
      type: Number,
      required: true,
      min: 1,
    },

    amountPerFraction: {
      type: Number,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    bankDetailsSentAt: {
      type: Date,
      default: null,
    },

    bankDetailsSentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    bankDetailsSendingAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "PENDING_VERIFICATION",
        "PAYMENT_SUCCESS",
        "COMPLETED",
        "FAILED",
        "REJECTED",
        "EXPIRED",
      ],
      default: "PENDING_PAYMENT",
    },
  },

  {
    timestamps: {
      currentTime: getIndianTime,
    },
  },
);

orderSchema.index(
  { payuTxnId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      payuTxnId: { $type: "string" },
    },
  },
);

export default mongoose.model("Order", orderSchema);
