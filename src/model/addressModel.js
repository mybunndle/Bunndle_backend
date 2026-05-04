// import mongoose from "mongoose";

// const addressSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     phone: {
//       type: String,

//       trim: true,
//     },

//     pinCode: {
//       type: String,
//       required: true,
//     },

//     state: {
//       type: String,
//       required: true,
//     },

//     city: {
//       type: String,
    
//     },

//     locality: {
//       type: String,
    
//     },

//     addressLine: {
//       type: String,
  
//     },

//     addressType: {
//       type: String,
//       enum: ["Home", "Office","work","Other"],
//       default: "Home",
//     },
//     customType: {
//      type: String,
//       trim: true,
//     },

//     isDefault: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.model("Address", addressSchema);




import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    pinCode: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    city: {
      type: String,
    },

    locality: {
      type: String,
    },

    addressLine: {
      type: String,
    },

    addressType: {
      type: String,
      enum: ["Home", "Office", "Work", "Other"], // ✅ fixed enum
      default: "Home",
    },

    customType: {
      type: String,
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);


// 🔥 Unique index (per user for specific types)

export default mongoose.model("Address", addressSchema);