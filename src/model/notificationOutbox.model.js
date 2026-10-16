import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
    },
    purchaseHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PUBLISHED"],
      default: "PENDING",
    },
    attempts: {
      type: Number,
      default: 0,
    },
    claimId: String,
    lockedUntil: Date,
    nextAttemptAt: {
      type: Date,
      default: Date.now,
    },
    publishedAt: Date,
    lastError: String,
  },
  { timestamps: true }
);

schema.index({ status: 1, nextAttemptAt: 1 });

export default mongoose.model("NotificationOutbox", schema);