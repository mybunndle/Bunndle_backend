import mongoose from "mongoose";

const exploreDealAndRecomendedSchema = new mongoose.Schema(
  {
    image: {
      url: {
        type: String,
        required: true,
      },
      fileId: {
        type: String,
      },
      filename: {
        type: String,
      },
    },
    brand: {
      type: String,
      trim: true,
    },
    category: {
      type: String,

      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const ExploreDealAndRecomended = mongoose.model(
  "ExploreDealAndRecomended",
  exploreDealAndRecomendedSchema,
);

export default ExploreDealAndRecomended;
