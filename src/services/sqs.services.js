import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient, SQS_QUEUE_URL } from "../config/sqs.js";

export const publishWelcomeEmailEvent = async ({
  purchaseHistoryId,
}) => {
  if (!purchaseHistoryId) {
    throw new Error("Purchase history ID is required");
  }

  const command = new SendMessageCommand({
    QueueUrl: SQS_QUEUE_URL,

    MessageBody: JSON.stringify({
      eventType: "COOWN_PAYMENT_SUCCESS",
      purchaseHistoryId: String(purchaseHistoryId),
      createdAt: new Date().toISOString(),
    }),
  });

  const result = await sqsClient.send(command);

  console.log("SQS MESSAGE PUBLISHED:", result.MessageId);

  return result.MessageId;
};