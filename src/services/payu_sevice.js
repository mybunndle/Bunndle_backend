
import crypto from "node:crypto";
import axios from "axios";

const VERIFY_URL =
  "https://info.payu.in/merchant/postservice.php?form=2";

const sha512 = (value) =>
  crypto
    .createHash("sha512")
    .update(value, "utf8")
    .digest("hex");

const credentials = () => {
  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT;

  if (
    process.env.PAYU_ENV !== "PRODUCTION" ||
    !key ||
    !salt
  ) {
    throw new Error("PayU LIVE configuration missing");
  }

  return { key, salt };
};

export const toPaise = (value) => {
  const raw = String(value ?? "");

  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    return null;
  }

  const [whole, decimal = ""] = raw.split(".");

  return (
    BigInt(whole) * 100n +
    BigInt(decimal.padEnd(2, "0"))
  );
};

// ==========================================
// STANDARD CHECKOUT PAYMENT HASH
// ==========================================

export const createPayUPaymentHash = ({
  txnid,
  amount,
  productinfo,
  firstname,
  email,
}) => {
  const { key, salt } = credentials();

  const fields = [
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    "", "", "", "", "", // UDF1-UDF5
    "", "", "", "", "", // Reserved fields
    salt,
  ];

  return sha512(fields.join("|"));
};

// ==========================================
// VERIFY CALLBACK / WEBHOOK HASH
// ==========================================

export const verifyPayUResponseHash = (body) => {
  const { key, salt } = credentials();

  if (
    !body ||
    body.key !== key ||
    typeof body.hash !== "string" ||
    !/^[a-fA-F0-9]{128}$/.test(body.hash)
  ) {
    return false;
  }

  for (const field of [
    "status",
    "txnid",
    "amount",
    "productinfo",
    "firstname",
    "email",
  ]) {
    if (typeof body[field] !== "string") {
      return false;
    }
  }

  // Advanced split-payment hashes are not
  // supported by this standard configuration.
  if (
    body.splitInfo != null ||
    body.splitinfo != null
  ) {
    return false;
  }

  const reverseParts = [
    salt,
    body.status,
    "", "", "", "", "", // Five empty fields
    body.udf5 ?? "",
    body.udf4 ?? "",
    body.udf3 ?? "",
    body.udf2 ?? "",
    body.udf1 ?? "",
    body.email,
    body.firstname,
    body.productinfo,
    body.amount,
    body.txnid,
    body.key,
  ];

  const charges =
    body.additional_charges ??
    body.additionalCharges;

  const stringToHash =
    charges == null
      ? reverseParts.join("|")
      : `${charges}|${reverseParts.join("|")}`;

  const expected = Buffer.from(
    sha512(stringToHash),
    "hex",
  );

  const received = Buffer.from(
    body.hash,
    "hex",
  );

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
};

// ==========================================
// VERIFY PAYMENT DIRECTLY WITH PAYU
// ==========================================

export const fetchPayUTransaction = async (
  txnid,
) => {
  const { key, salt } = credentials();

  if (
    typeof txnid !== "string" ||
    !/^[A-Za-z0-9]{1,25}$/.test(txnid)
  ) {
    throw new Error("Invalid PayU transaction ID");
  }

  const command = "verify_payment";

  const hash = sha512(
    `${key}|${command}|${txnid}|${salt}`,
  );

  const params = new URLSearchParams({
    key,
    command,
    var1: txnid,
    hash,
  });

  const response = await axios.post(
    VERIFY_URL,
    params.toString(),
    {
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      timeout: 15000,
    },
  );

  const data = response.data;

  if (Number(data?.status) !== 1) {
    return {
      verified: false,
      status: "NOT_CONFIRMED",
      transaction: null,
    };
  }

  const transaction =
    data?.transaction_details?.[txnid];

  if (
    !transaction ||
    transaction.status === "Not Found"
  ) {
    return {
      verified: false,
      status: "NOT_FOUND",
      transaction: null,
    };
  }

  const status = String(
    transaction.status ?? "",
  ).toLowerCase();

  return {
    verified: status === "success",
    status: status.toUpperCase(),
    transaction,
  };
};
