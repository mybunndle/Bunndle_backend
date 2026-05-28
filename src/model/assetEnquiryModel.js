import mongoose from "mongoose";

const assetEnquirySchema =
  new mongoose.Schema(
    {

      assetId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Asset",

        required: true,

        index: true,
      },

      userId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      status: {
        type: String,

        enum: [
          "active",
          "removed",
        ],

        default: "active",
      },

    },
    {
      timestamps: true,
    }
  );


// ✅ Prevent duplicate enquiry
assetEnquirySchema.index(
  {
    assetId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model(
  "AssetEnquiry",
  assetEnquirySchema
);