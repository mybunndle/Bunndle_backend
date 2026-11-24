
import sendEmail from "../utils/email.js";

import manualBankDetailsTemplate from "../utils/manualBankEmailTemplates.js";

// ============================================================
// SEND MANUAL BANK DETAILS EMAIL
// ============================================================

export const sendManualBankDetailsEmail = async ({
  email,
  customerName,
  orderId,
  assetName,
  fractions,
  amountPerFraction,
  totalAmount,
  expiresAt,
}) => {
  // ==========================================
  // 1. VALIDATE CUSTOMER EMAIL
  // ==========================================

  if (!email || !String(email).trim()) {
    throw new Error("Customer email is required");
  }

  // ==========================================
  // 2. LOAD BANK DETAILS FROM ENV
  // ==========================================

  const bankAccountHolder =
    process.env.MANUAL_BANK_ACCOUNT_HOLDER?.trim();

  const bankName =
    process.env.MANUAL_BANK_NAME?.trim();

  const bankAccountNumber =
    process.env.MANUAL_BANK_ACCOUNT_NUMBER?.trim();

  const bankIfsc =
    process.env.MANUAL_BANK_IFSC?.trim();

  if (
    !bankAccountHolder ||
    !bankName ||
    !bankAccountNumber ||
    !bankIfsc
  ) {
    throw new Error(
      "Manual payment bank details are missing in .env"
    );
  }

  // ==========================================
  // 3. GENERATE HTML EMAIL
  // ==========================================

  const html = manualBankDetailsTemplate({
    customerName,
    orderId,
    assetName,
    fractions,
    amountPerFraction,
    totalAmount,
    expiresAt,

    bankAccountHolder,
    bankName,
    bankAccountNumber,
    bankIfsc,
  });

  // ==========================================
  // 4. SEND EMAIL
  // ==========================================

  return await sendEmail({
    to: String(email).trim(),

    subject:
      `Bank Transfer & Payment Instructions – ${assetName} | Bunndle`,

    html,
  });
};
