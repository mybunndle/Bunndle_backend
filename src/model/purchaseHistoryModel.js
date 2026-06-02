import mongoose from "mongoose";

const purchaseHistorySchema =
  new mongoose.Schema(
    {
      assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Asset",
        required: true,
      },

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      fractionsPurchased: {
        type: Number,
        required: true,
      },

      amountPerFraction: {
        type: Number,
        required: true,
      },

      totalAmount: {
        type: Number,
        required: true,
      },

      paymentStatus: {
        type: String,
        enum: [
          "PENDING",
          "SUCCESS",
          "FAILED",
          "REFUNDED",
        ],
        default: "PENDING",
      },

      // Razorpay Details
      razorpayOrderId: {
        type: String,
        default: null,
      },

      razorpayPaymentId: {
        type: String,
        default: null,
      },

      razorpaySignature: {
        type: String,
        default: null,
      },

      transactionReference: {
        type: String,
      },
    },
    {
      timestamps: true,
    }
  );

// Useful indexes
purchaseHistorySchema.index({
  userId: 1,
  createdAt: -1,
});

purchaseHistorySchema.index({
  assetId: 1,
});

purchaseHistorySchema.index({
  razorpayPaymentId: 1,
});

export default mongoose.model(
  "PurchaseHistory",
  purchaseHistorySchema
);
