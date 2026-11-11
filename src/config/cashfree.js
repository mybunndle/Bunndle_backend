import { Cashfree } from "cashfree-pg";
import dotenv from "dotenv";

dotenv.config();

const environment = process.env.CASHFREE_ENV?.toUpperCase();

if (!["PRODUCTION", "SANDBOX"].includes(environment)) {
  throw new Error("Invalid CASHFREE_ENV");
}

if (
  !process.env.CASHFREE_CLIENT_ID ||
  !process.env.CASHFREE_CLIENT_SECRET
) {
  throw new Error("Cashfree credentials are missing");
}

const cashfree = new Cashfree(
  environment === "PRODUCTION"
    ? Cashfree.PRODUCTION
    : Cashfree.SANDBOX,
  process.env.CASHFREE_CLIENT_ID,
  process.env.CASHFREE_CLIENT_SECRET
);

export default cashfree;