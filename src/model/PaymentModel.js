import mongoose from "mongoose";

const getIndianTime = () => {
  const istOffset = 5.5 * 60 * 60 * 1000;

  return new Date(Date.now() + istOffset);
};

const paymentSchema = new mongoose.Schema(
  {
    // ========================================
    // USER
    // ========================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ========================================
    // INTERNAL ORDER
    // ========================================

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    // ========================================
    // RAZORPAY DETAILS
    // ========================================

    razorpayOrderId: {
      type: String,
      default: null,
    },
    // ========================================
    // PAYMENT GATEWAY
    // ========================================

    paymentGateway: {
      type: String,
      enum: ["RAZORPAY", "CASHFREE"],
      default: "RAZORPAY",
      required: true,
      index: true,
    },

    // ========================================
    // CASHFREE DETAILS
    // ========================================

    cashfreeOrderId: {
      type: String,
      default: null,
    },

    cashfreeCfOrderId: {
      type: String,
      default: null,
    },

    cashfreePaymentId: {
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

      // Do not return signature in normal queries
      select: false,
    },

    // ========================================
    // PAYMENT DETAILS
    // ========================================

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    paymentMethod: {
      type: String,
      default: null,

      // Example:
      // upi
      // card
      // netbanking
      // wallet
    },

    // ========================================
    // PAYMENT STATUS
    // ========================================

    status: {
      type: String,

      enum: ["PENDING", "SUCCESS", "FAILED", "EXPIRED", "REFUNDED"],

      default: "PENDING",
      index: true,
    },

    // ========================================
    // VERIFICATION
    // ========================================

    signatureVerified: {
      type: Boolean,
      default: false,
    },

    webhookVerified: {
      type: Boolean,
      default: false,
    },

    // ========================================
    // SUCCESS TIME
    // ========================================

    paidAt: {
      type: Date,
      default: null,
    },

    // ========================================
    // PURCHASE HISTORY REFERENCE
    // ========================================

    purchaseHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseHistory",
      default: null,
    },
  },

  {
    timestamps: {
      currentTime: getIndianTime,
    },
  },
);

// ========================================
// INDEXES
// ========================================

paymentSchema.index({
  userId: 1,
  createdAt: -1,
});

// Razorpay Order ID should identify
// the payment record quickly.
paymentSchema.index({
  razorpayOrderId: 1,
});

// Payment ID is received only after payment,
// therefore use partial unique index.
//
// Multiple pending payments can have
// razorpayPaymentId = null.
paymentSchema.index(
  {
    razorpayPaymentId: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      razorpayPaymentId: {
        $type: "string",
      },
    },
  },
);

paymentSchema.index(
  { cashfreeOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      cashfreeOrderId: { $type: "string" },
    },
  },
);

paymentSchema.index(
  { cashfreePaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      cashfreePaymentId: { $type: "string" },
    },
  },
);

// Useful for finding payment by internal order
paymentSchema.index({
  orderId: 1,
  status: 1,
});

export default mongoose.model("Payment", paymentSchema);
