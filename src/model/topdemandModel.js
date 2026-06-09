import mongoose from "mongoose";

const topInDemandSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    serialNo:{
      type: Number,
      required: true,
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
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