import mongoose from "mongoose";

const machinarySchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ Proper nested object schema
    logo: {
      type: {
        url: {
          type: String,
          required: true,
          trim: true,
        },

        fileId: {
          type: String,
          required: true,
          trim: true,
        },

        filename: {
          type: String,
          trim: true,
          default: "",
        },
      },

      required: true,
    },
  },

  {
    timestamps: true,
  }
);

const Machinary = mongoose.model("Machinary", machinarySchema);

export default Machinary;