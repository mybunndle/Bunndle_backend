import mongoose from "mongoose";
const assetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      required: true,
    },
    price: {
      type: Number,
    },
    assetName: {
      //can be null
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    purchaseYear: {
      type: String,
      required: true,
    },
    isapproved: {
      type: String,
      enum: ["approved", "rejected", "pending"],
      default: "pending",
    },
    deleteRequest: {
      type: Boolean,
      default: false,
    },
    deleteRequestAt: {
      type: Date,
    },

    files: [
      {
        url: {
          type: String,
          required: true,
        },
        filename: {
          type: String,
          required: true,
        },
        fileId: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Asset", assetSchema);
