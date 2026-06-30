// import mongoose from "mongoose";

// const assetEnquirySchema =
//   new mongoose.Schema(
//     {

//       assetId: {
//         type:
//           mongoose.Schema.Types.ObjectId,

//         ref: "Asset",

//         required: true,

//         index: true,
//       },

//       userId: {
//         type:
//           mongoose.Schema.Types.ObjectId,

//         ref: "User",

//         required: true,

//         index: true,
//       },

//       status: {
//         type: String,

//         enum: [
//           "active",
//           "removed",
//         ],

//         default: "active",
//       },

//     },
//     {
//       timestamps: true,
//     }
//   );


// // ✅ Prevent duplicate enquiry
// assetEnquirySchema.index(
//   {
//     assetId: 1,
//     userId: 1,
//   },
//   {
//     unique: true,
//   }
// );

// export default mongoose.model(
//   "AssetEnquiry",
//   assetEnquirySchema
// );



import mongoose from "mongoose";

const adminRemarkSchema = new mongoose.Schema(
  {
    remark: {
      type: String,
      trim: true,
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedByName: {
      type: String,
      required: true,
      default: "",
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const assetEnquirySchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
    },

    adminRemarks: {
      type: [adminRemarkSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Prevent duplicate enquiry by same user on same asset
assetEnquirySchema.index(
  {
    assetId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model("AssetEnquiry", assetEnquirySchema);
