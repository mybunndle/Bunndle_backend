import mongoose from "mongoose";

const corporateEnquirySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      trim: true,
    },

    pointOfContact: {
      type: String,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    city: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const CorporateEnquiry =
  mongoose.models.CorporateEnquiry ||
  mongoose.model("CorporateEnquiry", corporateEnquirySchema);

export default CorporateEnquiry;