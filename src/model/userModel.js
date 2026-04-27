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
      
      sparse: true, // ⭐ allows multiple nulls
      trim: true,

    },

  email: {
  type: String,
  unique: true,
  sparse: true, // important for Google/Apple users without email (edge cases)
  trim: true,
  lowercase: true,
  index: true,
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
      index: true,
      unique: true,
      
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

export default mongoose.model("User", userSchema);

// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true, // ✅ duplicate allowed
//     },

//     phone: {
//     type: String,
//     unique: true,
//     sparse: true   // ⭐ REQUIRED
//    },

//     email: {
//       type: String,
//       required: true,
//       unique: true, // ✅ must be unique
//       lowercase: true,
//       trim: true,
//       index: true,
//     },

//     password: {
//       type: String,

//       select: false, // 🔒 never return password by default
//     },
//     dob: {
//       type: Date, // ✅ DOB field
//     },
//     profileImage: {
//       type: String,
//     },
//     profileImageId: {
//       type: String, // ImageKit fileId (for delete/replace later)
//     },

//     // 🔐 Forgot / Reset password support
//     resetOtpHash: {
//       type: String,
//       select: false, // 🔒 hide from queries
//     },

//     resetOtpExpiry: {
//       type: Date,
//     },
//   },
//   { timestamps: true }
// );

// const User = mongoose.model("User", userSchema);
// export default User;

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     phone: {
//       type: String,
//       unique: true,
//       sparse: true, // ✅ allows null for Google users
//       trim: true,
//     },

//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//       index: true,
//     },

//     password: {
//       type: String,
//       select: false,
//       required: function () {
//         return this.authProvider === "local"; // ✅ required ONLY for normal signup
//       },
//     },

//     // 🔐 AUTH PROVIDER
//     authProvider: {
//       type: String,
//       enum: ["local", "google"],
//       default: "local",
//     },

//     googleId: {
//       type: String,
//       index: true,
//     },

//     dob: Date,

//     profileImage: String,
//     profileImageId: String,

//     resetOtpHash: {
//       type: String,
//       select: false,
//     },

//     resetOtpExpiry: Date,
//   },
//   { timestamps: true }
// );

// export default mongoose.model("User", userSchema);
