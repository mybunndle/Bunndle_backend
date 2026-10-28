import mongoose from "mongoose";

const ownershipExitRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    ownershipId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    purchaseHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseHistory",
      required: true,
      index: true,
    },

    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    requestedFractions: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Requested fractions must be an integer",
      },
    },
    
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      required: true,
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    adminRemark: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ownershipExitRequestSchema.index(
  { purchaseHistoryId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "PENDING",
    },
    name: "unique_pending_exit_per_purchase",
  },
);

const OwnershipExitRequest =
  mongoose.models.OwnershipExitRequest ||
  mongoose.model("OwnershipExitRequest", ownershipExitRequestSchema);

export default OwnershipExitRequest;
