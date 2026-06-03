import cron from "node-cron";

import {
  releaseExpiredReservations,
} from "./releaseExpiry.js";

cron.schedule("* * * * *", async () => {
  console.log(
    "Checking expired reservations..."
  );

  await releaseExpiredReservations();
});