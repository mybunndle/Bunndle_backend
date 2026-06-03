import mongoose from "mongoose";

const coAssetSchema = new mongoose.Schema(
  {
    assetName: {
      type: String,
      required: true,
      trim: true,
    },

    assetCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
    },
   specification:{
      type: String,
      default:"",
   },
    assetCost: {
      type: Number,
      required: true,
      min: 0,
    },

    totalFractions: {
      type: Number,
      required: true,
      min: 1,
    },

    availableFractions: {
      type: Number,
      required: true,
      min: 0,
    },
    reservedFractions: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountPerFraction: {
      type: Number,
      required: true,
      min: 0,
    },

    rentalAmountPerFraction: {
      type: Number,
      required: true,
      min: 0,
    },

    durationMonths: {
      type: Number,
      required: true,
    },

    lockInMonths: {
      type: Number,
      required: true,
    },

    images: [
      {
        url: {
          type: String,
        },
        fileId: {
          type: String,
        },
      },
    ],

    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "SOLD_OUT", "INACTIVE"],
      default: "DRAFT",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

coAssetSchema.index({ status: 1 });
coAssetSchema.index({ assetName: "text" });

export default mongoose.model("CoAsset", coAssetSchema);
