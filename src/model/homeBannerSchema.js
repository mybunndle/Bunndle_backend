import mongoose from "mongoose";

const homeBannerSchema = new mongoose.Schema(
  {
    rentalAssets: {
      type: [String], // 3 image URLs
      default: [],
      validate: {
        validator: (arr) => arr.length <= 3,
        message: "Rental Assets can have a maximum of 3 images.",
      },
    },

    popularDeals: {
      type: [String], // 3 image URLs
      default: [],
      validate: {
        validator: (arr) => arr.length <= 3,
        message: "Popular Deals can have a maximum of 3 images.",
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("HomeBanner", homeBannerSchema);