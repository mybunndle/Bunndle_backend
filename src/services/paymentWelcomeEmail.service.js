import sendEmail from "../utils/email.js";
import paymentSuccessTemplate from "../utils/paymentSuccessTemplate.js";

export const sendPaymentWelcomeEmail = async ({
  email,
  name,
  assetName,
  assetCode,
  registeredLegalOwner,
  totalAssetValue,
  totalFractions,
  amountPerFraction,
  fractionsPurchased,
  totalAmountPaid,
  acquisitionDate,
  monthlyRentalPerFraction,
  totalFixedMonthlyRental,
  transactionId,
}) => {
  if (!email) {
    throw new Error("Customer email is required");
  }
   console.log(email, registeredLegalOwner,
  totalAssetValue,
  totalFractions,
  amountPerFraction,
  fractionsPurchased,
  totalAmountPaid,
  acquisitionDate,
  monthlyRentalPerFraction,
  totalFixedMonthlyRental,
  transactionId);
  const html = paymentSuccessTemplate({
    customerName: name || "Customer",
    assetName,
    assetCode,
    registeredLegalOwner,
    totalAssetValue,
    totalFractions,
    amountPerFraction,
    fractionsAcquired: fractionsPurchased,
    totalAmountPaid,
    acquisitionDate,
    monthlyRentalPerFraction,
    totalFixedMonthlyRental,
    transactionId,
  });

  return sendEmail({
    to: email,
    subject: "Payment Successful! Welcome to Bunndle Co-Ownership 🎉",
    html,
  });
};