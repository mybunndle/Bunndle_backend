
export const ONLINE_PAYMENT_CHARGE_PERCENT = 0.5;

const ONLINE_GATEWAYS = new Set([
  "RAZORPAY",
  "CASHFREE",
  "PAYU",
]);

export const calculateOrderPayment = ({
  baseAmount,
  paymentGateway,
}) => {
  const amount = Number(baseAmount);
  const gateway = String(paymentGateway || "")
    .trim()
    .toUpperCase();

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error("Invalid base payment amount");
  }

  // Convert to paise to avoid floating-point errors.
  const basePaise = Math.round(amount * 100);

  const isOnlinePayment = ONLINE_GATEWAYS.has(gateway);

  // 0.5% = 5 / 1000
  const processingFeePaise = isOnlinePayment
    ? Math.round(basePaise * 5 / 1000)
    : 0;

  const payablePaise =
    basePaise + processingFeePaise;

  return {
    baseAmount: basePaise / 100,

    processingFeePercentage: isOnlinePayment
      ? ONLINE_PAYMENT_CHARGE_PERCENT
      : 0,

    processingFee: processingFeePaise / 100,

    totalPayableAmount: payablePaise / 100,

    totalPayablePaise: payablePaise,

    paymentGateway: gateway,

    isOnlinePayment,
  };
};
