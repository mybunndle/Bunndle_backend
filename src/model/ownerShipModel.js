import mongoose from "mongoose";

const ownershipSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoAsset",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fractionsOwned: {
      type: Number,
      default: 0,
      min: 0,
    },

    investedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
   
    averagePurchasePrice: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ownershipSchema.index(
  {
    assetId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model(
  "Ownership",
  ownershipSchema
);



