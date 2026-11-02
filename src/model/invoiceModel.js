import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    purchaseHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseHistory",
      required: true,
      unique: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    invoiceDate: {
      type: String,
      required: true,
      trim: true,
    },

    invoiceTime: {
      type: String,
      required: true,
    },

    customerGstNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },

    hsnCode: {
      type: String,
      required: true,
      trim: true,
    },

    gstPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);
