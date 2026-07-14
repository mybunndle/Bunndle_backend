import mongoose from "mongoose";

const topInDemandSchema = new mongoose.Schema(
  {
    assetName: {
      type: String,
      trim: true,
    },
    brand: {
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

    serialNo:{
      type: Number,
      required: true,
    },

    model: {
      type: String,
  
      trim: true,
    },

    price: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("TopInDemand", topInDemandSchema);