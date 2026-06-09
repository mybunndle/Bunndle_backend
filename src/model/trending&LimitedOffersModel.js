import mongoose from "mongoose";

const trendingOffersSchema = new mongoose.Schema(
  {
  
    category: {
      type: String,
      trim: true,
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

    brand: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["Trending", "Offers"],
    },
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

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const TrendingOffers = mongoose.model(
  "TrendingOffers",
  trendingOffersSchema
);

export default TrendingOffers;