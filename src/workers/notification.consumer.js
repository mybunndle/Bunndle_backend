import "dotenv/config";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

import { sqsClient, PAYMENT_QUEUE_URL } from "../config/sqs.js";

import NotificationDelivery from
  "../models/notificationDelivery.model.js";

import { getPurchaseEmailData } from
  "../services/purchaseEmailData.service.js";

import { sendCoOwnershipWelcomeEmail } from
  "../services/brevo.service.js";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

let running = true;

async function processNotification(event) {
  const {
    eventKey,
    eventType,
    purchaseHistoryId,
  } = event;

  if (
    eventType !== "COOWN_PAYMENT_SUCCESS" ||
    !eventKey ||
    !purchaseHistoryId
  ) {
    throw new Error("Invalid SQS notification event");
  }

  await NotificationDelivery.updateOne(
    { eventKey },
    {
      $setOnInsert: {
        eventKey,
        purchaseHistoryId,
        status: "PENDING",
      },
    },
    { upsert: true }
  );

  const claimId = randomUUID();
  const now = new Date();

  const delivery = await NotificationDelivery.findOneAndUpdate(
    {
      eventKey,
      $or: [
        { status: "PENDING" },
        {
          status: "SENDING",
          lockedUntil: { $lte: now },
        },
      ],
    },
    {
      $set: {
        status: "SENDING",
        claimId,
        lockedUntil: new Date(Date.now() + 90000),
      },
      $inc: {
        attempts: 1,
      },
    },
    { new: true }
  );

  if (!delivery) {
    const current = await NotificationDelivery.findOne({
      eventKey,
    });

    if (current?.status === "SENT") {
      console.log("Welcome email already sent:", eventKey);
      return;
    }

    throw new Error("Notification is already being processed");
  }

  try {
    const emailData = await getPurchaseEmailData(
      purchaseHistoryId
    );

    if (!emailData?.email) {
      throw new Error("Customer email not found");
    }

    const result = await sendCoOwnershipWelcomeEmail(
      emailData
    );

    const update = await NotificationDelivery.updateOne(
      {
        _id: delivery._id,
        claimId,
        status: "SENDING",
      },
      {
        $set: {
          status: "SENT",
          brevoMessageId: result.messageId,
          sentAt: new Date(),
        },
        $unset: {
          claimId: "",
          lockedUntil: "",
          lastError: "",
        },
      }
    );

    if (update.modifiedCount !== 1) {
      throw new Error("Notification claim lost");
    }

    console.log(
      "BREVO WELCOME EMAIL ACCEPTED:",
      eventKey,
      result.messageId
    );
  } catch (error) {
    await NotificationDelivery.updateOne(
      {
        _id: delivery._id,
        claimId,
        status: "SENDING",
      },
      {
        $set: {
          status: "PENDING",
          lastError: error.message,
        },
        $unset: {
          claimId: "",
          lockedUntil: "",
        },
      }
    );

    throw error;
  }
}

async function start() {
  if (!PAYMENT_QUEUE_URL) {
    throw new Error("SQS_PAYMENT_QUEUE_URL missing");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  console.log("Bunndle Notification Worker Started");

  while (running) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: PAYMENT_QUEUE_URL,
          WaitTimeSeconds: 20,
          MaxNumberOfMessages: 1,
          VisibilityTimeout: 120,
        })
      );

      for (const message of response.Messages || []) {
        try {
          const event = JSON.parse(message.Body);

          await processNotification(event);

          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: PAYMENT_QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            })
          );
        } catch (error) {
          console.error(
            "NOTIFICATION PROCESSING ERROR:",
            error.message
          );

          // Do not delete failed messages.
          // SQS will retry and eventually use the DLQ.
        }
      }
    } catch (error) {
      console.error("SQS RECEIVE ERROR:", error.message);
      await sleep(5000);
    }
  }

  await mongoose.disconnect();
  sqsClient.destroy();
}

process.on("SIGTERM", () => {
  running = false;
});

process.on("SIGINT", () => {
  running = false;
});

start().catch((error) => {
  console.error(error);
  process.exit(1);
});