import mongoose from "mongoose";

const paymentScreenshotSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },

    fileId: {
      type: String,
      default: null,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const manualPaymentSchema = new mongoose.Schema(
  {
    // =====================================
    // REFERENCES
    // =====================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      immutable: true,
    },

    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoAsset",
      required: true,
      immutable: true,
    },

    // =====================================
    // PAYMENT DETAILS
    // =====================================

    fractions: {
      type: Number,
      required: true,
      min: 1,
      immutable: true,
      validate: Number.isInteger,
    },

    amountPerFraction: {
      type: Number,
      required: true,
      min: 0,
      immutable: true,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      immutable: true,
    },

    amountPaid: {
      type: Number,
      required: true,
      min: 0.01,
    },

    currency: {
      type: String,
      default: "INR",
      enum: ["INR"],
    },

    paymentMethod: {
      type: String,
      enum: ["BANK_TRANSFER", "IMPS", "NEFT", "RTGS", "UPI"],
      default: "BANK_TRANSFER",
    },

    transactionId: {
      type: String,
      required: true,
      trim: true,
    },

    normalizedTransactionId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    normalizedTransactionIds: {
      type: [String],
      default: [],
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    // =====================================
    // PAYMENT SCREENSHOTS (1 TO 3)
    // =====================================

    paymentScreenshots: {
      type: [paymentScreenshotSchema],
      required: true,

      validate: {
        validator: function (screenshots) {
          return (
            Array.isArray(screenshots) &&
            screenshots.length >= 1 &&
            screenshots.length <= 3
          );
        },

        message: "Please upload at least 1 and at most 3 payment screenshots",
      },
    },

    // =====================================
    // ADMIN VERIFICATION
    // =====================================

    status: {
      type: String,
      enum: ["PENDING_VERIFICATION", "REVIEW_REQUIRED", "APPROVED", "REJECTED"],
      default: "PENDING_VERIFICATION",
      index: true,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    bankCreditVerified: {
      type: Boolean,
      default: false,
    },

    bankCreditReference: {
      type: String,
      default: null,
    },

    bankCreditAmount: {
      type: Number,
      default: null,
    },

    bankCreditDate: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    adminRemark: {
      type: String,
      default: null,
    },

    // =====================================
    // FINALIZATION REFERENCES
    // =====================================

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    purchaseHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseHistory",
      default: null,
    },

    // =====================================
    // EXPIRY
    // =====================================

    expiresAt: {
      type: Date,
      required: true,
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);

// =====================================
// UNIQUE TRANSACTION REFERENCE
// =====================================

manualPaymentSchema.index(
  { normalizedTransactionId: 1 },
  {
    unique: true,
  },
);

// Admin filters
manualPaymentSchema.index({
  status: 1,
  createdAt: -1,
});

// User history
manualPaymentSchema.index({
  userId: 1,
  createdAt: -1,
});

// =====================================
// MODEL EXPORT
// =====================================

const ManualPayment =
  mongoose.models.ManualPayment ||
  mongoose.model("ManualPayment", manualPaymentSchema);

export default ManualPayment;
