import NotificationOutbox from "../model/notificationOutbox.model.js";

export const createPaymentWelcomeEvent = async ({
  purchaseHistoryId,
  session,
}) => {
  if (!purchaseHistoryId || !session) {
    throw new Error("purchaseHistoryId and MongoDB session are required");
  }

  const eventKey = `COOWN_WELCOME:${String(purchaseHistoryId)}`;

  await NotificationOutbox.updateOne(
    { eventKey },
    {
      $setOnInsert: {
        eventKey,
        eventType: "COOWN_PAYMENT_SUCCESS",
        purchaseHistoryId,
        status: "PENDING",
        nextAttemptAt: new Date(),
      },
    },
    {
      upsert: true,
      session,
    },
  );
};
