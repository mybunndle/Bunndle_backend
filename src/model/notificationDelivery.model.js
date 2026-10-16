import mongoose from "mongoose";

const notificationDeliverySchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
    },

    purchaseHistoryId: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "SENDING", "SENT"],
      default: "PENDING",
    },

    claimId: {
      type: String,
      default: null,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    brevoMessageId: {
      type: String,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "NotificationDelivery",
  notificationDeliverySchema
);