import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const mode = (
  process.env.CASHFREE_ENV || ""
).trim().toUpperCase();

if (!["SANDBOX", "PRODUCTION"].includes(mode)) {
  throw new Error("Invalid CASHFREE_ENV");
}

const baseURL =
  mode === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

if (
  !process.env.CASHFREE_CLIENT_ID ||
  !process.env.CASHFREE_CLIENT_SECRET
) {
  throw new Error("Cashfree credentials missing");
}

const client = axios.create({
  baseURL,

  headers: {
    "Content-Type": "application/json",
    "x-client-id": process.env.CASHFREE_CLIENT_ID,
    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
    "x-api-version":
      process.env.CASHFREE_API_VERSION || "2025-01-01",
  },

  timeout: 15000,
});

// Preserve your existing controller method names.
const cashfree = {
  PGCreateOrder: (payload) =>
    client.post("/orders", payload),

  PGFetchOrder: (orderId) =>
    client.get(`/orders/${encodeURIComponent(orderId)}`),

  PGOrderFetchPayments: (orderId) =>
    client.get(
      `/orders/${encodeURIComponent(orderId)}/payments`
    ),
};

console.log("Cashfree Environment:", mode);
console.log("Cashfree API URL:", baseURL);

export default cashfree;