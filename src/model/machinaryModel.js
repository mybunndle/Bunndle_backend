import mongoose from "mongoose";

const machinarySchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ FIXED
    logo: {
      url: {
        type: String,
        required: true,
      },

      fileId: {
        type: String,
        required: true,
      },

      filename: {
        type: String,
      },
    },
  },

  {
    timestamps: true,
  }
);

const Machinary = mongoose.model("Machinary", machinarySchema);

export default Machinary;