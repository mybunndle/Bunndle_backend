import mongoose from "mongoose";
const web_assetSchema = new mongoose.Schema(
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
      type: String,
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

export default mongoose.model("WebAsset", web_assetSchema);
