import sendEmail from "../utils/email.js";
import paymentSuccessTemplate from "../utils/paymentSuccessTemplate.js";

export const sendPaymentWelcomeEmail = async ({
  email,
  name,
  assetName,
  assetCode,
  transactionId,
  totalAmountPaid,
  fractionsPurchased,
  acquisitionDate,
  totalFixedMonthlyRental,
}) => {
  if (!email) {
    throw new Error("Customer email is required");
  }

  const subject =
    "Payment Successful! Welcome to Bunndle Co-Ownership 🎉";

  const html = paymentSuccessTemplate({
    customerName: name || "Customer",
    assetName,
    assetCode,
    transactionId,
    totalAmountPaid,
    fractionsAcquired: fractionsPurchased,
    acquisitionDate,
    totalFixedMonthlyRental,
  });

  return await sendEmail({
    to: email,
    subject,
    html,
  });
};

export default sendPaymentWelcomeEmail;