// import mongoose from "mongoose";


// const getIndianTime = () => {
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   return new Date(Date.now() + istOffset);
// };

// const purchaseHistorySchema =
//   new mongoose.Schema(
//     {
//       assetId: {
//         type: mongoose.Schema.Types.ObjectId,
//          ref: "CoAsset",
//         required: true,
//       },

//       userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true,
//       },

//       fractionsPurchased: {
//         type: Number,
//         required: true,
//       },

//       amountPerFraction: {
//         type: Number,
//         required: true,
//       },

//       totalAmount: {
//         type: Number,
//         required: true,
//       },

//       paymentStatus: {
//         type: String,
//         enum: [
//           "PENDING",
//           "SUCCESS",
//           "FAILED",
//           "REFUNDED",
//         ],
//         default: "PENDING",
//       },

//       // Razorpay Details
//       razorpayOrderId: {
//         type: String,
//         default: null,
//       },

//       razorpayPaymentId: {
//         type: String,
//         default: null,
//       },

//       razorpaySignature: {
//         type: String,
//         default: null,
//       },

//       transactionReference: {
//         type: String,
//       },
//     },
//     {
//       timestamps: {
//         currentTime: getIndianTime,
//       },
//     }
//   );

// // Useful indexes
// purchaseHistorySchema.index({
//   userId: 1,
//   createdAt: -1,
// });

// purchaseHistorySchema.index({
//   assetId: 1,
// });

// purchaseHistorySchema.index({
//   razorpayPaymentId: 1,
// });

// export default mongoose.model(
//   "PurchaseHistory",
//   purchaseHistorySchema
// );


import mongoose from "mongoose";

const getIndianTime = () => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + istOffset);
};

const documentSchema = new mongoose.Schema(
  {
    documentNumber: {
      type: String,
      default: null,
    },

    fileName: {
      type: String,
      default: null,
    },

    url: {
      type: String,
      default: null,
    },

    fileId: {
      type: String,
      default: null,
    },

    generatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const purchaseHistorySchema = new mongoose.Schema(
  {
    // ==================================================
    // REFERENCES
    // ==================================================

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },

    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoAsset",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },

    // ==================================================
    // PURCHASE DETAILS
    // ==================================================

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

    // ==================================================
    // USER SNAPSHOT
    // ==================================================

    userSnapshot: {
      name: {
        type: String,
        default: null,
      },

      email: {
        type: String,
        default: null,
      },

      phone: {
        type: String,
        default: null,
      },
    },

    // ==================================================
    // ASSET SNAPSHOT
    // ==================================================

    assetSnapshot: {
      assetName: {
        type: String,
        default: null,
      },

      assetCode: {
        type: String,
        default: null,
      },

      specification: {
        type: String,
        default: null,
      },

      assetCost: {
        type: Number,
        default: null,
      },

      rentalAmountPerFraction: {
        type: Number,
        default: null,
      },

      totalMonthlyRental: {
        type: Number,
        default: null,
      },

      durationMonths: {
        type: Number,
        default: null,
      },

      lockInMonths: {
        type: Number,
        default: null,
      },
    },

    // ==================================================
    // PAYMENT DETAILS
    // ==================================================

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
      select: false,
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    currency: {
      type: String,
      default: "INR",
    },

    transactionReference: {
      type: String,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    // ==================================================
    // GENERATED PDF DOCUMENTS
    // ==================================================

    documents: {
      digitalAgreement: {
        type: documentSchema,
        default: null,
      },

      paymentReceipt: {
        type: documentSchema,
        default: null,
      },
    },

    documentGenerationStatus: {
      type: String,
      enum: [
        "NOT_STARTED",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
      ],
      default: "NOT_STARTED",
    },

    documentGenerationError: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: {
      currentTime: getIndianTime,
    },
  }
);

// ==================================================
// INDEXES
// ==================================================

purchaseHistorySchema.index({
  userId: 1,
  createdAt: -1,
});

purchaseHistorySchema.index({
  assetId: 1,
});

purchaseHistorySchema.index(
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
  }
);

export default mongoose.model(
  "PurchaseHistory",
  purchaseHistorySchema
);