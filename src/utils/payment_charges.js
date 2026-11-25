
/**
 * Bunndle Payment Charges
 *
 * Online payment processing fee: 0.5%
 *
 * Supported online gateways:
 * RAZORPAY, CASHFREE, PAYU
 *
 * MANUAL payments have no processing fee.
 */

// ============================================================
// CONFIGURATION
// ============================================================

export const ONLINE_PAYMENT_CHARGE_PERCENT = 0.5;

const ONLINE_GATEWAYS = new Set([
  "RAZORPAY",
  "CASHFREE",
  "PAYU",
]);

const ALL_GATEWAYS = new Set([
  ...ONLINE_GATEWAYS,
  "MANUAL",
]);

// ============================================================
// CONVERT INR TO PAISE
// ============================================================

export const convertToPaise = (amount) => {
  if (
    amount === null ||
    amount === undefined ||
    amount === ""
  ) {
    throw new Error("Payment amount is required");
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error("Invalid payment amount");
  }

  const amountPaise = Math.round(numericAmount * 100);

  if (
    !Number.isSafeInteger(amountPaise) ||
    amountPaise <= 0
  ) {
    throw new Error("Invalid payment amount precision");
  }

  return amountPaise;
};

// ============================================================
// CALCULATE ONLINE PROCESSING CHARGES
// ============================================================

export const calculateOrderPayment = ({
  baseAmount,
  paymentGateway,
}) => {
  const gateway = String(paymentGateway || "")
    .trim()
    .toUpperCase();

  if (!ALL_GATEWAYS.has(gateway)) {
    throw new Error("Invalid payment gateway");
  }

  const basePaise = convertToPaise(baseAmount);

  const isOnlinePayment = ONLINE_GATEWAYS.has(gateway);

  // 0.5% = 5 / 1000
  // All calculations are in paise.

  const processingFeePaise = isOnlinePayment
    ? Math.round(
        (basePaise * ONLINE_PAYMENT_CHARGE_PERCENT) / 100
      )
    : 0;

  const totalPayablePaise =
    basePaise + processingFeePaise;

  if (
    !Number.isSafeInteger(totalPayablePaise) ||
    totalPayablePaise <= 0
  ) {
    throw new Error("Invalid total payable amount");
  }

  return {
    baseAmount: basePaise / 100,

    processingFeePercentage: isOnlinePayment
      ? ONLINE_PAYMENT_CHARGE_PERCENT
      : 0,

    processingFee: processingFeePaise / 100,

    totalPayableAmount: totalPayablePaise / 100,

    totalPayablePaise,

    paymentGateway: gateway,

    isOnlinePayment,
  };
};

// ============================================================
// GET EXPECTED PAYMENT AMOUNT
//
// Used for:
// 1. PayU verification
// 2. Cashfree verification
// 3. Razorpay verification
// 4. finalizeSuccessfulPayment
//
// Returns amount in PAISE.
// ============================================================

export const getExpectedPaymentAmount = (order) => {
  if (!order) {
    throw new Error("Order is required");
  }

  // New orders: totalPayableAmount includes processing fee.
  // Old orders: fallback to totalAmount.
  //
  // Do not calculate 0.5% again here.

  const payableAmount =
    order.totalPayableAmount ?? order.totalAmount;

  return convertToPaise(payableAmount);
};

// ============================================================
// VALIDATE STORED PAYMENT AMOUNT
//
// payment.amount is stored in INR.
// ============================================================

export const validateOrderPaymentAmount = (
  order,
  payment
) => {
  if (!order || !payment) {
    throw new Error("Order and payment are required");
  }

  const expectedPaise =
    getExpectedPaymentAmount(order);

  const actualPaise =
    convertToPaise(payment.amount);

  if (expectedPaise !== actualPaise) {
    console.error("PAYMENT AMOUNT MISMATCH:", {
      orderId: String(order._id),

      paymentId: String(payment._id),

      paymentGateway: order.paymentGateway,

      baseAmount: order.totalAmount,

      processingFee: order.processingFee ?? 0,

      totalPayableAmount:
        order.totalPayableAmount ?? order.totalAmount,

      storedPaymentAmount: payment.amount,

      expectedPaise,
      actualPaise,
    });

    const error = new Error(
      "Stored order and payment amount mismatch"
    );

    error.statusCode = 409;

    throw error;
  }

  return {
    valid: true,
    expectedPaise,
    actualPaise,
    amount: expectedPaise / 100,
  };
};
