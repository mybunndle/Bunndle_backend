import "dotenv/config";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

import {
  sqsClient,
  PAYMENT_QUEUE_URL,
} from "../config/sqs.js";

import NotificationOutbox from "../model/notificationOutbox.model.js";

// ========================================================
// CONFIGURATION
// ========================================================

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const POLL_INTERVAL_MS = 1000;
const ERROR_RETRY_MS = 5000;
const LEASE_DURATION_MS = 120000;

let running = true;

// ========================================================
// VALIDATE ENVIRONMENT
// ========================================================

const validateEnvironment = () => {
  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is missing in .env"
    );
  }

  if (!process.env.AWS_REGION) {
    throw new Error(
      "AWS_REGION is missing in .env"
    );
  }

  if (!PAYMENT_QUEUE_URL) {
    throw new Error(
      "SQS_PAYMENT_QUEUE_URL is missing in .env"
    );
  }
};

// ========================================================
// PUBLISH ONE OUTBOX EVENT
// ========================================================

const publishOne = async () => {
  const now = new Date();
  const claimId = randomUUID();

  // 1. Atomically claim pending event
  const event = await NotificationOutbox.findOneAndUpdate(
    {
      $or: [
        {
          status: "PENDING",
          nextAttemptAt: { $lte: now },
        },
        {
          status: "PROCESSING",
          lockedUntil: { $lte: now },
        },
      ],
    },
    {
      $set: {
        status: "PROCESSING",
        claimId,
        lockedUntil: new Date(
          Date.now() + LEASE_DURATION_MS
        ),
      },
      $inc: {
        attempts: 1,
      },
    },
    {
      new: true,
      sort: {
        createdAt: 1,
      },
    }
  );

  if (!event) {
    return false;
  }

  try {
    // 2. Publish event to AWS SQS
    const response = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: PAYMENT_QUEUE_URL,

        MessageBody: JSON.stringify({
          eventKey: event.eventKey,
          eventType: event.eventType,
          purchaseHistoryId: String(
            event.purchaseHistoryId
          ),
        }),
      })
    );

    // 3. Mark event as published
    const updated = await NotificationOutbox.updateOne(
      {
        _id: event._id,
        claimId,
        status: "PROCESSING",
      },
      {
        $set: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
        $unset: {
          claimId: "",
          lockedUntil: "",
          lastError: "",
        },
      }
    );

    if (updated.modifiedCount === 1) {
      console.log("✅ SQS EVENT PUBLISHED", {
        eventKey: event.eventKey,
        messageId: response.MessageId,
      });
    } else {
      console.warn(
        "⚠️ SQS event published but database claim expired:",
        event.eventKey
      );
    }
  } catch (error) {
    // 4. Retry with exponential backoff
    const delay = Math.min(
      300000,
      5000 * 2 ** Math.min(event.attempts - 1, 6)
    );

    await NotificationOutbox.updateOne(
      {
        _id: event._id,
        claimId,
        status: "PROCESSING",
      },
      {
        $set: {
          status: "PENDING",
          nextAttemptAt: new Date(
            Date.now() + delay
          ),
          lastError: error.message,
        },
        $unset: {
          claimId: "",
          lockedUntil: "",
        },
      }
    );

    console.error("❌ SQS PUBLISH ERROR:", {
      eventKey: event.eventKey,
      error: error.message,
    });
  }

  return true;
};

// ========================================================
// START OUTBOX PUBLISHER
// ========================================================

const start = async () => {
  validateEnvironment();

  // FIX: Use MONGO_URI instead of MONGODB_URI
  await mongoose.connect(process.env.MONGO_URI);

  console.log("✅ MongoDB Connected Successfully");
  console.log("✅ Bunndle Outbox Publisher Started");
  console.log("AWS Region:", process.env.AWS_REGION);

  try {
    while (running) {
      try {
        const processed = await publishOne();

        if (!processed) {
          await sleep(POLL_INTERVAL_MS);
        }
      } catch (error) {
        console.error(
          "❌ OUTBOX WORKER ERROR:",
          error.message
        );

        await sleep(ERROR_RETRY_MS);
      }
    }
  } finally {
    await mongoose.disconnect();
    sqsClient.destroy();

    console.log("Outbox Publisher Stopped");
  }
};

// ========================================================
// GRACEFUL SHUTDOWN
// ========================================================

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Stopping publisher...");
  running = false;
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Stopping publisher...");
  running = false;
});

// ========================================================
// EXECUTE
// ========================================================

start().catch((error) => {
  console.error(
    "❌ OUTBOX PUBLISHER STARTUP ERROR:",
    error
  );

  process.exit(1);
});