import mongoose from "mongoose";

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

    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "PAYMENT_SUCCESS",
        "COMPLETED",
        "FAILED",
      ],
      default: "PENDING_PAYMENT",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Order", orderSchema);