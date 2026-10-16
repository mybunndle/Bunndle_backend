import "dotenv/config";
import { SQSClient } from "@aws-sdk/client-sqs";

// ========================================================
// AWS SQS CONFIGURATION
// ========================================================

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";

export const PAYMENT_QUEUE_URL = process.env.SQS_PAYMENT_QUEUE_URL;

// ========================================================
// ENV VALIDATION
// ========================================================

if (!PAYMENT_QUEUE_URL) {
  throw new Error("SQS_PAYMENT_QUEUE_URL is missing in .env");
}

// ========================================================
// INITIALIZE SQS CLIENT
// ========================================================

export const sqsClient = new SQSClient({
  region: AWS_REGION,
  maxAttempts: 3,
});

// Optional alias for existing services
export const SQS_QUEUE_URL = PAYMENT_QUEUE_URL;

console.log("AWS SQS configuration loaded");
console.log("AWS Region:", AWS_REGION);
