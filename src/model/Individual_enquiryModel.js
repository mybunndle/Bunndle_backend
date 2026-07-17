import mongoose from "mongoose";

const individualEnquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
  
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
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

const IndividualEnquiry =
  mongoose.models.IndividualEnquiry ||
  mongoose.model("IndividualEnquiry", individualEnquirySchema);

export default IndividualEnquiry;