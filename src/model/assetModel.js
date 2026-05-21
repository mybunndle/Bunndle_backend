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
    assetName:{
      //can be null
      type: String,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      
    },
    subCategory:{
      type: String,
      trim: true,
    },
    purchaseYear: {
      type: String,
      required: true,
    },
    isapproved: {
      type: Boolean,
      default: false,
    },
    equiryStatus: {
      type: String,
      default: "false",
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
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Asset", assetSchema);
