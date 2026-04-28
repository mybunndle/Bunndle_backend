import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true, // ⭐ allows multiple nulls
      trim: true
    },

  email: {
  type: String,
  unique: true,
  sparse: true, // important for Google/Apple users without email (edge cases)
  trim: true,
  lowercase: true
},

    password: {
      type: String,
      select: false,
      required: function () {
        return this.authProvider === "local";
      },
    },

    /* ===== AUTH ===== */
    authProvider: {
      type: String,
      enum: ["local", "google","apple"],
      default: "local",
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    appleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    /* ===== PROFILE ===== */
    dob: Date,

    profileImage: String,
    profileImageId: String,

    kycStatus: {
        type: String,
        enum: ["NOT_STARTED", "PENDING", "VERIFIED"],
        default: "NOT_STARTED",
     },

    isKycVerified: {
        type: Boolean,
        default: false,
   },

    kycVerifiedAt: Date,




    /* ===== RESET PASSWORD ===== */
    resetOtpHash: {
      type: String,
      select: false,
    },

    resetOtpExpiry: Date,
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema)
