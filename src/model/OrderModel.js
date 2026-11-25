// import mongoose from "mongoose";

// const getIndianTime = () => {
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   return new Date(Date.now() + istOffset);
// };

// const orderSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },

//     assetId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Asset",
//       required: true,
//       index: true,
//     },
//     paymentGateway: {
//       type: String,
//       enum: ["RAZORPAY", "CASHFREE", "PAYU", "MANUAL"],
//       default: "RAZORPAY",
//       required: true,
//       index: true,
//     },
//     payuTxnId: {
//       type: String,
//       default: null,
//       trim: true,
//     },

//     fractions: {
//       type: Number,
//       required: true,
//       min: 1,
//     },

//     amountPerFraction: {
//       type: Number,
//       required: true,
//     },

//     totalAmount: {
//       type: Number,
//       required: true,
//     },
//     expiresAt: {
//       type: Date,
//       required: true,
//     },
//     bankDetailsSentAt: {
//       type: Date,
//       default: null,
//     },

//     bankDetailsSentBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },

//     bankDetailsSendingAt: {
//       type: Date,
//       default: null,
//     },

//     status: {
//       type: String,
//       enum: [
//         "PENDING_PAYMENT",
//         "PENDING_VERIFICATION",
//         "PAYMENT_SUCCESS",
//         "COMPLETED",
//         "FAILED",
//         "REJECTED",
//         "EXPIRED",
//       ],
//       default: "PENDING_PAYMENT",
//     },
//   },

//   {
//     timestamps: {
//       currentTime: getIndianTime,
//     },
//   },
// );

// orderSchema.index(
//   { payuTxnId: 1 },
//   {
//     unique: true,
//     partialFilterExpression: {
//       payuTxnId: { $type: "string" },
//     },
//   },
// );

// export default mongoose.model("Order", orderSchema);





import mongoose from "mongoose";

// ============================================================
// INDIAN TIME
// ============================================================

const getIndianTime = () => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + istOffset);
};

// ============================================================
// ORDER SCHEMA
// ============================================================

const orderSchema = new mongoose.Schema(
  {
    // ========================================================
    // USER & ASSET DETAILS
    // ========================================================

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

    // ========================================================
    // PAYMENT GATEWAY
    // ========================================================

    paymentGateway: {
      type: String,
      enum: [
        "RAZORPAY",
        "CASHFREE",
        "PAYU",
        "MANUAL",
      ],
      default: "RAZORPAY",
      required: true,
      index: true,
    },

    payuTxnId: {
      type: String,
      default: null,
      trim: true,
    },

    // ========================================================
    // ASSET OWNERSHIP DETAILS
    // ========================================================

    fractions: {
      type: Number,
      required: true,
      min: 1,
    },

    amountPerFraction: {
      type: Number,
      required: true,
      min: 0,
    },

    // ========================================================
    // PAYMENT AMOUNT BREAKDOWN
    // ========================================================

    // Actual asset purchase amount.
    // Excludes payment processing charges.
    //
    // Example: 300000

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Additional fee percentage applied to online payments.
    //
    // Example: 0.5 means 0.5%, not 50%.
    //
    // MANUAL payment = 0%.

    processingFeePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Actual payment processing charge.
    //
    // Example:
    // 300000 x 0.5% = 1500

    processingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Final amount charged through payment gateway.
    //
    // Example:
    // 300000 + 1500 = 301500
    //
    // Historical orders can have null.
    // Payment verification should then fall back
    // to the existing totalAmount field.

    totalPayableAmount: {
      type: Number,
      default: null,
      min: 0,
    },

    // ========================================================
    // ORDER EXPIRATION
    // ========================================================

    expiresAt: {
      type: Date,
      required: true,
    },

    // ========================================================
    // MANUAL PAYMENT BANK DETAILS
    // ========================================================

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

    // ========================================================
    // ORDER STATUS
    // ========================================================

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
      index: true,
    },
  },
  {
    timestamps: {
      currentTime: getIndianTime,
    },
  }
);

// ============================================================
// INDEXES
// ============================================================

// Unique PayU transaction ID.
// Multiple null/missing values are allowed.

orderSchema.index(
  { payuTxnId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      payuTxnId: { $type: "string" },
    },
  }
);

// ============================================================
// EXPORT
// ============================================================

export default mongoose.model("Order", orderSchema);
