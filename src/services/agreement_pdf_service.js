// import fs from "fs/promises";
// import path from "path";
// import { fileURLToPath } from "url";

// import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// import PurchaseHistory from "../model/purchaseHistoryModel.js";
// import Asset from "../model/coAssetModel.js";
// import BankAccount from "../model/bankAccountModel.js";

// import { uploadAgreementPdf } from "./imageStorageService.js";

// // ============================================================
// // TEMPLATE PATH
// // ============================================================

// const __filename = fileURLToPath(import.meta.url);

// const __dirname = path.dirname(__filename);

// const AGREEMENT_TEMPLATE_PATH = path.join(
//   __dirname,
//   "../templates/Fraction-Ownership-Agreement.pdf",
// );

// // ============================================================
// // INDIAN TIME
// //
// // Existing approach preserved for generatedAt.
// // ============================================================

// const getIndianTime = () => {
//   const istOffset = 5.5 * 60 * 60 * 1000;

//   return new Date(Date.now() + istOffset);
// };

// // ============================================================
// // DATE / TIME HELPERS
// // ============================================================

// const formatGeneratedDate = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   return new Intl.DateTimeFormat("en-IN", {
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//     timeZone: "UTC",
//   }).format(date);
// };

// const formatGeneratedTime = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   return new Intl.DateTimeFormat("en-IN", {
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//     timeZone: "UTC",
//   })
//     .format(date)
//     .toUpperCase();
// };

// const formatIndianDate = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   return new Intl.DateTimeFormat("en-IN", {
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//     timeZone: "Asia/Kolkata",
//   }).format(date);
// };

// const formatIndianTime = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   return new Intl.DateTimeFormat("en-IN", {
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//     timeZone: "Asia/Kolkata",
//   })
//     .format(date)
//     .toUpperCase();
// };

// const formatIndianDateTimeCompact = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   const datePart = new Intl.DateTimeFormat("en-IN", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//     timeZone: "Asia/Kolkata",
//   }).format(date);

//   return `${datePart} ${formatIndianTime(date)} IST`;
// };

// // ============================================================
// // AMOUNT FORMAT
// // ============================================================

// const formatAmount = (value) => {
//   return Number(value || 0).toLocaleString("en-IN", {
//     minimumFractionDigits: 2,

//     maximumFractionDigits: 2,
//   });
// };

// // ============================================================
// // NUMBER TO INDIAN WORDS
// // ============================================================

// const ONES = [
//   "",
//   "One",
//   "Two",
//   "Three",
//   "Four",
//   "Five",
//   "Six",
//   "Seven",
//   "Eight",
//   "Nine",
//   "Ten",
//   "Eleven",
//   "Twelve",
//   "Thirteen",
//   "Fourteen",
//   "Fifteen",
//   "Sixteen",
//   "Seventeen",
//   "Eighteen",
//   "Nineteen",
// ];

// const TENS = [
//   "",
//   "",
//   "Twenty",
//   "Thirty",
//   "Forty",
//   "Fifty",
//   "Sixty",
//   "Seventy",
//   "Eighty",
//   "Ninety",
// ];

// const belowHundredToWords = (number) => {
//   if (number < 20) {
//     return ONES[number];
//   }

//   const tens = Math.floor(number / 10);

//   const ones = number % 10;

//   return [TENS[tens], ONES[ones]].filter(Boolean).join(" ");
// };

// const numberToIndianWords = (value) => {
//   let number = Math.round(Number(value || 0));

//   if (number === 0) {
//     return "Zero";
//   }

//   const parts = [];

//   const crore = Math.floor(number / 10000000);

//   if (crore) {
//     parts.push(`${numberToIndianWords(crore)} Crore`);

//     number %= 10000000;
//   }

//   const lakh = Math.floor(number / 100000);

//   if (lakh) {
//     parts.push(`${numberToIndianWords(lakh)} Lakh`);

//     number %= 100000;
//   }

//   const thousand = Math.floor(number / 1000);

//   if (thousand) {
//     parts.push(`${numberToIndianWords(thousand)} Thousand`);

//     number %= 1000;
//   }

//   const hundred = Math.floor(number / 100);

//   if (hundred) {
//     parts.push(`${ONES[hundred]} Hundred`);

//     number %= 100;
//   }

//   if (number > 0) {
//     parts.push(belowHundredToWords(number));
//   }

//   return parts.join(" ");
// };

// // ============================================================
// // GENERAL HELPERS
// // ============================================================

// const addMonths = (value, months) => {
//   if (!value) {
//     return null;
//   }

//   const date = new Date(value);

//   const result = new Date(date.getTime());

//   result.setUTCMonth(result.getUTCMonth() + Number(months || 0));

//   return result;
// };

// const firstValue = (...values) => {
//   return values.find(
//     (value) => value !== undefined && value !== null && value !== "",
//   );
// };

// const requiredValue = (value, fieldName) => {
//   if (value === undefined || value === null || value === "") {
//     throw new Error(`Agreement configuration missing: ${fieldName}`);
//   }

//   return value;
// };

// const cleanText = (value) => {
//   return String(value ?? "")
//     .replace(/[\r\n\t]+/g, " ")
//     .replace(/\s+/g, " ")
//     .replace(/\s+,/g, ",")
//     .replace(/\s+\./g, ".")
//     .replace(/\s+:/g, ":")
//     .trim();
// };

// // ============================================================
// // WORD WRAPPING
// // ============================================================

// const splitTextIntoLines = ({ text, font, fontSize, maxWidth }) => {
//   const words = String(text).trim().split(/\s+/);

//   const lines = [];

//   let currentLine = "";

//   for (const word of words) {
//     const testLine = currentLine ? `${currentLine} ${word}` : word;

//     const width = font.widthOfTextAtSize(testLine, fontSize);

//     if (width <= maxWidth) {
//       currentLine = testLine;
//     } else {
//       if (currentLine) {
//         lines.push(currentLine);
//       }

//       currentLine = word;
//     }
//   }

//   if (currentLine) {
//     lines.push(currentLine);
//   }

//   return lines;
// };

// // ============================================================
// // PDF DRAW HELPERS
// // ============================================================

// const clearPdfArea = ({ page, x, top, width, height }) => {
//   const y = page.getHeight() - top - height;

//   page.drawRectangle({
//     x,
//     y,
//     width,
//     height,

//     color: rgb(1, 1, 1),
//   });
// };

// const drawSingleLine = ({
//   page,
//   text,
//   x = 51.25,
//   top,
//   width = 510,
//   height = 13.5,
//   font,
//   maxFontSize = 9.5,
//   minFontSize = 6.5,
// }) => {
//   clearPdfArea({
//     page,

//     x: x - 1,

//     top: top - 1,

//     width: width + 2,

//     height: height + 2,
//   });

//   let fontSize = maxFontSize;

//   while (
//     fontSize > minFontSize &&
//     font.widthOfTextAtSize(String(text), fontSize) > width
//   ) {
//     fontSize -= 0.25;
//   }

//   const y = page.getHeight() - top - fontSize;

//   page.drawText(String(text), {
//     x,
//     y,

//     size: fontSize,

//     font,

//     color: rgb(0, 0, 0),
//   });
// };

// const drawWrappedBlock = ({
//   page,
//   text,
//   x = 51.25,
//   top,
//   width = 510,
//   height = 29,
//   font,
//   maxLines = 2,
//   maxFontSize = 9.5,
//   minFontSize = 6.25,
//   lineGap = 3.2,
// }) => {
//   clearPdfArea({
//     page,

//     x: x - 1,

//     top: top - 1,

//     width: width + 2,

//     height: height + 2,
//   });

//   let fontSize = maxFontSize;

//   let lines = [];

//   while (fontSize >= minFontSize) {
//     lines = splitTextIntoLines({
//       text,
//       font,
//       fontSize,
//       maxWidth: width,
//     });

//     if (lines.length <= maxLines) {
//       break;
//     }

//     fontSize -= 0.25;
//   }

//   if (lines.length > maxLines) {
//     throw new Error(
//       "Agreement text is too long to fit in the PDF template. Please shorten the address/details.",
//     );
//   }

//   const lineHeight = fontSize + lineGap;

//   lines.forEach((line, index) => {
//     const y = page.getHeight() - top - fontSize - index * lineHeight;

//     page.drawText(line, {
//       x,
//       y,

//       size: fontSize,

//       font,

//       color: rgb(0, 0, 0),
//     });
//   });
// };

// // ============================================================
// // INLINE SEGMENTS
// //
// // Used for same-baseline label + value.
// // ============================================================

// const drawInlineSegments = ({
//   page,
//   x,
//   top,
//   width,
//   height = 14,
//   segments,
//   fontSize = 8,
// }) => {
//   clearPdfArea({
//     page,

//     x: x - 2,

//     top: top - 2,

//     width: width + 4,

//     height: height + 4,
//   });

//   const y = page.getHeight() - top - fontSize;

//   let cursorX = x;

//   for (const segment of segments) {
//     const text = String(segment.text ?? "");

//     page.drawText(text, {
//       x: cursorX,

//       y,

//       size: fontSize,

//       font: segment.font,

//       color: rgb(0, 0, 0),
//     });

//     cursorX += segment.font.widthOfTextAtSize(text, fontSize);
//   }
// };

// // ============================================================
// // RICH TEXT WRAPPING
// // ============================================================

// const splitRichTextIntoLines = ({ segments, fontSize, maxWidth }) => {
//   const tokens = [];

//   for (const segment of segments) {
//     const parts = String(segment.text ?? "")
//       .split(/(\s+)/)
//       .filter((part) => part !== "");

//     for (const part of parts) {
//       tokens.push({
//         text: part,

//         font: segment.font,
//       });
//     }
//   }

//   const lines = [];

//   let currentLine = [];

//   let currentWidth = 0;

//   const pushCurrentLine = () => {
//     while (
//       currentLine.length &&
//       /^\s+$/.test(currentLine[currentLine.length - 1].text)
//     ) {
//       currentLine.pop();
//     }

//     if (currentLine.length) {
//       lines.push(currentLine);
//     }

//     currentLine = [];

//     currentWidth = 0;
//   };

//   for (const token of tokens) {
//     const isWhitespace = /^\s+$/.test(token.text);

//     if (isWhitespace && currentLine.length === 0) {
//       continue;
//     }

//     const tokenWidth = token.font.widthOfTextAtSize(token.text, fontSize);

//     if (
//       !isWhitespace &&
//       currentLine.length > 0 &&
//       currentWidth + tokenWidth > maxWidth
//     ) {
//       pushCurrentLine();
//     }

//     if (isWhitespace && currentWidth + tokenWidth > maxWidth) {
//       pushCurrentLine();

//       continue;
//     }

//     currentLine.push(token);

//     currentWidth += tokenWidth;
//   }

//   pushCurrentLine();

//   return lines;
// };

// const drawRichWrappedBlock = ({
//   page,
//   segments,
//   x = 51.25,
//   top,
//   width = 510,
//   height = 29,
//   maxLines = 2,
//   maxFontSize = 9.5,
//   minFontSize = 6.25,
//   lineGap = 3.2,
// }) => {
//   clearPdfArea({
//     page,

//     x: x - 2,

//     top: top - 2,

//     width: width + 4,

//     height: height + 4,
//   });

//   let fontSize = maxFontSize;

//   let lines = [];

//   while (fontSize >= minFontSize) {
//     lines = splitRichTextIntoLines({
//       segments,
//       fontSize,

//       maxWidth: width,
//     });

//     if (lines.length <= maxLines) {
//       break;
//     }

//     fontSize -= 0.25;
//   }

//   if (lines.length > maxLines) {
//     throw new Error(
//       "Agreement identity details are too long to fit in the PDF template. Please shorten the address/details.",
//     );
//   }

//   const lineHeight = fontSize + lineGap;

//   lines.forEach((line, lineIndex) => {
//     let cursorX = x;

//     const y = page.getHeight() - top - fontSize - lineIndex * lineHeight;

//     for (const token of line) {
//       page.drawText(token.text, {
//         x: cursorX,

//         y,

//         size: fontSize,

//         font: token.font,

//         color: rgb(0, 0, 0),
//       });

//       cursorX += token.font.widthOfTextAtSize(token.text, fontSize);
//     }
//   });
// };

// // ============================================================
// // BUILD AGREEMENT DATA
// // ============================================================

// const buildAgreementData = ({
//   purchase,
//   asset,
//   bankAccount,
//   formData,
//   generatedAt,
// }) => {
//   if (!formData) {
//     throw new Error("Agreement form data is required");
//   }

//   // =========================================================
//   // CUSTOMER DETAILS
//   // =========================================================

//   const fullLegalName = cleanText(
//     requiredValue(
//       formData.fullLegalName,

//       "Full Legal Name",
//     ),
//   );

//   const fullAddress = cleanText(
//     requiredValue(
//       formData.fullAddress,

//       "Full Address",
//     ),
//   );

//   const pan = cleanText(
//     requiredValue(
//       formData.pan,

//       "PAN",
//     ),
//   ).toUpperCase();

//   const mobile = cleanText(
//     requiredValue(
//       formData.mobile,

//       "Mobile",
//     ),
//   );

//   const email = cleanText(
//     requiredValue(
//       formData.email,

//       "Email",
//     ),
//   ).toLowerCase();

//   // =========================================================
//   // PAYMENT DATE
//   // =========================================================

//   const paymentDate = requiredValue(
//     purchase.paidAt,

//     "PurchaseHistory.paidAt",
//   );

//   // =========================================================
//   // ASSET DETAILS
//   // =========================================================

//   const assetName = cleanText(
//     requiredValue(
//       firstValue(
//         purchase.assetSnapshot?.assetName,

//         asset.assetName,
//       ),

//       "Asset Name",
//     ),
//   );

//   const assetCode = cleanText(
//     requiredValue(
//       firstValue(
//         purchase.assetSnapshot?.assetCode,

//         asset.assetCode,
//       ),

//       "Asset Code",
//     ),
//   );

//   const totalAssetValue = Number(
//     firstValue(
//       purchase.assetSnapshot?.assetCost,

//       asset.assetCost,

//       0,
//     ),
//   );

//   const totalFractions = Number(
//     firstValue(
//       purchase.assetSnapshot?.totalFractions,

//       asset.totalFractions,

//       0,
//     ),
//   );

//   if (!totalFractions || totalFractions <= 0) {
//     throw new Error("Asset totalFractions is missing");
//   }

//   const fractionsAcquired = Number(purchase.fractionsPurchased || 0);

//   if (!fractionsAcquired || fractionsAcquired <= 0) {
//     throw new Error("Purchased fraction quantity is missing");
//   }

//   const amountPerFraction = Number(
//     firstValue(
//       purchase.amountPerFraction,

//       purchase.assetSnapshot?.amountPerFraction,

//       asset.amountPerFraction,

//       0,
//     ),
//   );

//   const totalAmountPaid = Number(purchase.totalAmount || 0);

//   // =========================================================
//   // RENTAL
//   // =========================================================

//   const rentalPerFraction = Number(
//     firstValue(
//       purchase.assetSnapshot?.rentalAmountPerFraction,

//       asset.rentalAmountPerFraction,

//       0,
//     ),
//   );

//   const totalMonthlyRental = rentalPerFraction * fractionsAcquired;

//   const rentalCommencementDate = firstValue(
//     purchase.rentalCommencementDate,

//     asset.rentalCommencementDate,

//     paymentDate,
//   );

//   const rentalTermMonths = Number(
//     firstValue(
//       purchase.assetSnapshot?.durationMonths,

//       asset.durationMonths,

//       0,
//     ),
//   );

//   if (!rentalTermMonths || rentalTermMonths <= 0) {
//     throw new Error("Rental term/duration is missing");
//   }

//   const rentalExpiryDate = addMonths(
//     rentalCommencementDate,

//     rentalTermMonths,
//   );

//   // =========================================================
//   // BANK DETAILS
//   //
//   // PDF needs full account number.
//   // Prefer request data because DB normally stores encrypted
//   // value + last4.
//   // =========================================================

//   const requestBank = formData.bankDetails || {};

//   const accountHolderName = cleanText(
//     requiredValue(
//       firstValue(
//         requestBank.accountHolderName,

//         formData.accountHolderName,

//         bankAccount?.accountHolderName,
//       ),

//       "Bank Account Holder Name",
//     ),
//   );

//   const bankName = cleanText(
//     requiredValue(
//       firstValue(
//         requestBank.bankName,

//         formData.bankName,

//         bankAccount?.bankName,
//       ),

//       "Bank Name",
//     ),
//   );

//   // =========================================================
//   // FULL ACCOUNT NUMBER
//   // =========================================================

//   const accountNumber = cleanText(
//     requiredValue(
//       firstValue(
//         requestBank.accountNumber,

//         formData.accountNumber,

//         bankAccount?.accountNumber,
//       ),

//       "Full Bank Account Number",
//     ),
//   );

//   const ifscCode = cleanText(
//     requiredValue(
//       firstValue(
//         requestBank.ifscCode,

//         formData.ifscCode,

//         bankAccount?.ifscCode,
//       ),

//       "IFSC Code",
//     ),
//   ).toUpperCase();

//   const accountType = cleanText(
//     firstValue(
//       requestBank.accountType,

//       formData.accountType,

//       bankAccount?.accountType,

//       "SAVINGS",
//     ),
//   ).toUpperCase();

//   // =========================================================
//   // FINAL DATA
//   // =========================================================

//   return {
//     agreementDate: paymentDate,

//     acquisitionDate: paymentDate,

//     paymentDate,

//     generatedAt,

//     // Customer
//     fullLegalName,
//     fullAddress,
//     pan,
//     mobile,
//     email,

//     // Asset
//     assetName,
//     assetCode,
//     totalAssetValue,
//     totalFractions,
//     amountPerFraction,
//     fractionsAcquired,
//     totalAmountPaid,

//     // Rental
//     rentalPerFraction,
//     totalMonthlyRental,
//     rentalCommencementDate,
//     rentalTermMonths,
//     rentalExpiryDate,

//     // Bank
//     accountHolderName,
//     bankName,
//     accountNumber,
//     ifscCode,
//     accountType,
//   };
// };

// // ============================================================
// // PAGE 1
// // ============================================================

// const fillPageOne = ({ page, data, font, boldFont }) => {
//   // =========================================================
//   // CLEAR OLD PLACEHOLDER AREAS
//   // =========================================================

//   clearPdfArea({
//     page,

//     x: 49,

//     top: 94.5,

//     width: 526,

//     height: 18,
//   });

//   clearPdfArea({
//     page,

//     x: 49,

//     top: 233.5,

//     width: 526,

//     height: 33,
//   });

//   clearPdfArea({
//     page,

//     x: 49,

//     top: 324.5,

//     width: 526,

//     height: 205.5,
//   });

//   clearPdfArea({
//     page,

//     x: 49,

//     top: 597.5,

//     width: 526,

//     height: 75.5,
//   });

//   // =========================================================
//   // AGREEMENT DATE
//   // =========================================================

//   drawSingleLine({
//     page,

//     top: 96.5,

//     height: 14,

//     font,

//     text: `This Agreement is electronically executed on ${formatIndianDate(
//       data.agreementDate,
//     )} between:`,
//   });

//   // =========================================================
//   // FRACTION OWNER DETAILS
//   // =========================================================

//   drawRichWrappedBlock({
//     page,

//     top: 235.4,

//     height: 29,

//     maxLines: 2,

//     segments: [
//       {
//         text: `${data.fullLegalName},`,

//         font: boldFont,
//       },

//       {
//         text: " residing at ",

//         font,
//       },

//       {
//         text: `${data.fullAddress},`,

//         font: boldFont,
//       },

//       {
//         text: " bearing PAN ",

//         font,
//       },

//       {
//         text: `${data.pan},`,

//         font: boldFont,
//       },

//       {
//         text: " mobile number ",

//         font,
//       },

//       {
//         text: `${data.mobile},`,

//         font: boldFont,
//       },

//       {
//         text: " and email address ",

//         font,
//       },

//       {
//         text: `${data.email},`,

//         font: boldFont,
//       },

//       {
//         text: ' hereinafter referred to as the "Fraction Owner".',

//         font,
//       },
//     ],
//   });

//   // =========================================================
//   // ASSET DETAILS
//   // =========================================================

//   drawSingleLine({
//     page,

//     top: 326.2,

//     font,

//     text: `Asset Name: ${data.assetName}`,
//   });

//   drawSingleLine({
//     page,

//     top: 340.6,

//     font,

//     text: `Asset Code: ${data.assetCode}`,
//   });

//   // =========================================================
//   // CUSTOMER NAME
//   // =========================================================

//   drawInlineSegments({
//     page,

//     x: 51.25,

//     top: 355.1,

//     width: 510,

//     height: 13.5,

//     fontSize: 9.5,

//     segments: [
//       {
//         text: "Customer Name: ",

//         font,
//       },

//       {
//         text: data.fullLegalName,

//         font: boldFont,
//       },
//     ],
//   });

//   drawSingleLine({
//     page,

//     top: 369.5,

//     font,

//     text: `Total Asset Value: INR ${formatAmount(data.totalAssetValue)}`,
//   });

//   drawSingleLine({
//     page,

//     top: 384.0,

//     font,

//     text: `Total Number of fractions: ${data.totalFractions}`,
//   });

//   drawSingleLine({
//     page,

//     top: 398.4,

//     font,

//     text: `Amount Per Fraction: INR ${formatAmount(data.amountPerFraction)}`,
//   });

//   drawSingleLine({
//     page,

//     top: 412.9,

//     font,

//     text: `Number of Fractions Acquired: ${data.fractionsAcquired}`,
//   });

//   drawSingleLine({
//     page,

//     top: 427.3,

//     font,

//     text: `Total Amount Paid: INR ${formatAmount(data.totalAmountPaid)}`,
//   });

//   drawSingleLine({
//     page,

//     top: 441.9,

//     font,

//     text: `Acquisition Date: ${formatIndianDate(data.acquisitionDate)}`,
//   });

//   // =========================================================
//   // RENTAL DETAILS
//   // =========================================================

//   drawSingleLine({
//     page,

//     top: 456.3,

//     width: 510,

//     maxFontSize: 9,

//     minFontSize: 7,

//     font,

//     text: `Fixed Monthly Rental per Fraction: INR ${formatAmount(
//       data.rentalPerFraction,
//     )}`,
//   });

//   drawSingleLine({
//     page,

//     top: 470.8,

//     width: 510,

//     maxFontSize: 9,

//     minFontSize: 7,

//     font,

//     text: `Total Fixed Monthly Rental: INR ${formatAmount(
//       data.totalMonthlyRental,
//     )}`,
//   });

//   drawSingleLine({
//     page,

//     top: 485.2,

//     font,

//     text: `Rental Commencement Date: ${formatIndianDate(
//       data.rentalCommencementDate,
//     )}`,
//   });

//   drawSingleLine({
//     page,

//     top: 499.6,

//     font,

//     text: `Rental Term: ${data.rentalTermMonths} months`,
//   });

//   drawSingleLine({
//     page,

//     top: 514.1,

//     font,

//     text: `Rental Expiry Date: ${formatIndianDate(data.rentalExpiryDate)}`,
//   });

//   // =========================================================
//   // BANK DETAILS
//   // =========================================================

//   drawSingleLine({
//     page,

//     top: 599.4,

//     font,

//     text: `Account Holder Name: ${data.accountHolderName}`,
//   });

//   drawSingleLine({
//     page,

//     top: 613.8,

//     font,

//     text: `Bank Name: ${data.bankName}`,
//   });

//   // Full account number visible in agreement
//   drawSingleLine({
//     page,

//     top: 628.3,

//     font,

//     text: `Account Number: ${data.accountNumber}`,
//   });

//   drawSingleLine({
//     page,

//     top: 642.7,

//     font,

//     text: `IFSC Code: ${data.ifscCode}`,
//   });

//   drawSingleLine({
//     page,

//     top: 657.2,

//     font,

//     text: `Account Type: ${data.accountType}`,
//   });
// };

// // ============================================================
// // PAGE 2
// // ============================================================

// const fillPageTwo = ({ page, data, font }) => {
//   clearPdfArea({
//     page,

//     x: 49,

//     top: 567,

//     width: 527,

//     height: 32.5,
//   });

//   drawWrappedBlock({
//     page,

//     top: 568.7,

//     width: 510,

//     height: 29,

//     maxLines: 2,

//     maxFontSize: 9.25,

//     minFontSize: 6.25,

//     lineGap: 3.1,

//     font,

//     text: `The Company shall pay the Fraction Owner a fixed monthly rental of INR ${formatAmount(
//       data.totalMonthlyRental,
//     )} (Rupees ${numberToIndianWords(
//       data.totalMonthlyRental,
//     )} Only) for the acquired fractions during the agreed rental term.`,
//   });
// };

// // ============================================================
// // PAGE 6
// // ============================================================

// const fillPageSix = ({ page, data, font, boldFont, italicFont }) => {
//   // =========================================================
//   // FRACTION OWNER NAME
//   // =========================================================

//   drawInlineSegments({
//     page,

//     x: 346.5,

//     top: 167.2,

//     width: 210,

//     height: 13.5,

//     fontSize: 8.5,

//     segments: [
//       {
//         text: "Name: ",

//         font,
//       },

//       {
//         text: data.fullLegalName,

//         font: boldFont,
//       },
//     ],
//   });

//   // =========================================================
//   // FRACTION OWNER PAN
//   // =========================================================

//   drawInlineSegments({
//     page,

//     x: 346.5,

//     top: 184.3,

//     width: 210,

//     height: 13.5,

//     fontSize: 8.5,

//     segments: [
//       {
//         text: "PAN No : ",

//         font,
//       },

//       {
//         text: data.pan,

//         font: boldFont,
//       },
//     ],
//   });

//   // =========================================================
//   // PAYMENT DATE & TIME
//   // =========================================================

//   const paymentDateTime = formatIndianDateTimeCompact(data.paymentDate);

//   // =========================================================
//   // COMPANY DATE & TIME
//   // =========================================================

//   drawInlineSegments({
//     page,

//     x: 91,

//     top: 199.5,

//     width: 220,

//     height: 15,

//     fontSize: 8.2,

//     segments: [
//       {
//         text: "Date & Time : ",

//         font: boldFont,
//       },

//       {
//         text: paymentDateTime,

//         font,
//       },
//     ],
//   });

//   // =========================================================
//   // FRACTION OWNER DATE & TIME
//   // =========================================================

//   drawInlineSegments({
//     page,

//     x: 350,

//     top: 199.5,

//     width: 220,

//     height: 15,

//     fontSize: 8.2,

//     segments: [
//       {
//         text: "Date & Time : ",

//         font: boldFont,
//       },

//       {
//         text: paymentDateTime,

//         font,
//       },
//     ],
//   });

//   // =========================================================
//   // GENERATED DATE / TIME
//   // =========================================================

//   const generatedDate = formatGeneratedDate(data.generatedAt);

//   const generatedTime = formatGeneratedTime(data.generatedAt);

//   // =========================================================
//   // SIGNING DATE / TIME
//   //
//   // As requested:
//   // signed timestamp = payment timestamp.
//   // =========================================================

//   const signingDate = formatIndianDate(data.paymentDate);

//   const signingTime = `${formatIndianTime(data.paymentDate)} IST`;

//   // =========================================================
//   // CLEAR OLD SIGNING PLACEHOLDERS
//   // =========================================================

//   clearPdfArea({
//     page,

//     x: 50,

//     top: 267,

//     width: 526,

//     height: 32,
//   });

//   // =========================================================
//   // GENERATED / SIGNED LINE
//   // =========================================================

//   drawWrappedBlock({
//     page,

//     x: 52.5,

//     top: 268.4,

//     width: 520,

//     height: 29,

//     maxLines: 2,

//     maxFontSize: 7.5,

//     minFontSize: 6,

//     lineGap: 2.7,

//     font: italicFont,

//     text: `This Agreement was generated on ${generatedDate} at ${generatedTime} and digitally signed on ${signingDate} at ${signingTime}.`,
//   });
// };

// // ============================================================
// // MAIN AGREEMENT PDF GENERATOR
// // ============================================================

// export const generateAgreementPdf = async (purchaseHistoryId, formData) => {
//   let purchase = null;

//   /*
//    * If user already generated an agreement before,
//    * keep its URL so that a failed regeneration does not
//    * destroy the previous successful agreement.
//    */
//   let previousAgreementUrl = null;

//   /*
//    * Capture generation time exactly once.
//    */
//   const generatedAt = getIndianTime();

//   try {
//     // ======================================================
//     // PURCHASE HISTORY
//     // ======================================================

//     purchase = await PurchaseHistory.findById(purchaseHistoryId).select(
//       "+documentGenerationError",
//     );

//     if (!purchase) {
//       const error = new Error("Purchase history not found");

//       error.statusCode = 404;

//       throw error;
//     }

//     // ======================================================
//     // PAYMENT MUST BE SUCCESS
//     // ======================================================

//     if (purchase.paymentStatus !== "SUCCESS") {
//       const error = new Error(
//         "Agreement can only be generated after successful payment",
//       );

//       error.statusCode = 400;

//       throw error;
//     }

//     // ======================================================
//     // PAID AT REQUIRED
//     // ======================================================

//     if (!purchase.paidAt) {
//       const error = new Error(
//         "Payment date is not available in purchase history",
//       );

//       error.statusCode = 400;

//       throw error;
//     }

//     // ======================================================
//     // FORM DATA REQUIRED
//     // ======================================================

//     if (!formData) {
//       const error = new Error("Agreement form data is required");

//       error.statusCode = 400;

//       throw error;
//     }

//     if (
//       !formData.fullLegalName ||
//       !formData.fullAddress ||
//       !formData.pan ||
//       !formData.mobile ||
//       !formData.email
//     ) {
//       const error = new Error("Complete agreement form details are required");

//       error.statusCode = 400;

//       throw error;
//     }

//     // ======================================================
//     // MULTIPLE PDF GENERATION
//     //
//     // IMPORTANT:
//     //
//     // COMPLETED agreement DOES NOT block regeneration.
//     //
//     // Old PDF URL is remembered so if new generation fails,
//     // previous successful PDF remains usable.
//     // ======================================================

//     previousAgreementUrl = purchase.documents?.digitalAgreement?.url || null;

//     // ======================================================
//     // MARK PROCESSING
//     // ======================================================

//     purchase.documentGenerationStatus = "PROCESSING";

//     purchase.documentGenerationError = null;

//     await purchase.save();

//     // ======================================================
//     // ASSET
//     // ======================================================

//     const asset = await Asset.findById(purchase.assetId);

//     if (!asset) {
//       const error = new Error("Asset not found");

//       error.statusCode = 404;

//       throw error;
//     }

//     // ======================================================
//     // BANK ACCOUNT
//     // ======================================================

//     let bankAccount = null;

//     if (purchase.bankAccountId) {
//       bankAccount = await BankAccount.findById(purchase.bankAccountId).lean();
//     }

//     if (!bankAccount && !formData.bankDetails) {
//       const error = new Error(
//         "Bank account details are not available for agreement generation",
//       );

//       error.statusCode = 400;

//       throw error;
//     }

//     // ======================================================
//     // BUILD AGREEMENT DATA
//     // ======================================================

//     const agreementData = buildAgreementData({
//       purchase,

//       asset,

//       bankAccount,

//       formData,

//       generatedAt,
//     });

//     // ======================================================
//     // READ TEMPLATE
//     // ======================================================

//     const templateBytes = await fs.readFile(AGREEMENT_TEMPLATE_PATH);

//     // ======================================================
//     // LOAD PDF
//     // ======================================================

//     const pdfDoc = await PDFDocument.load(templateBytes, {
//       updateMetadata: false,
//     });

//     const pages = pdfDoc.getPages();

//     if (pages.length !== 6) {
//       throw new Error(
//         `Invalid agreement template. Expected 6 pages but found ${pages.length}.`,
//       );
//     }

//     // ======================================================
//     // FONTS
//     // ======================================================

//     const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

//     // ======================================================
//     // PAGE 1
//     // ======================================================

//     fillPageOne({
//       page: pages[0],

//       data: agreementData,

//       font,

//       boldFont,
//     });

//     // ======================================================
//     // PAGE 2
//     // ======================================================

//     fillPageTwo({
//       page: pages[1],

//       data: agreementData,

//       font,
//     });

//     /*
//      * Pages 3, 4 and 5 have no dynamic placeholders
//      * in the current template.
//      */

//     // ======================================================
//     // PAGE 6
//     // ======================================================

//     fillPageSix({
//       page: pages[5],

//       data: agreementData,

//       font,

//       boldFont,

//       italicFont,
//     });

//     /*
//      * Do not flatten existing AcroForm / signature fields.
//      */

//     // ======================================================
//     // SAVE PDF
//     // ======================================================

//     const pdfBytes = await pdfDoc.save();

//     const pdfBuffer = Buffer.from(pdfBytes);

//     // ======================================================
//     // AGREEMENT NUMBER
//     // ======================================================

//     const suffix = purchase._id.toString().slice(-10).toUpperCase();

//     const agreementNumber = `BND-AGR-${suffix}`;

//     // ======================================================
//     // UNIQUE FILE NAME
//     //
//     // Multiple generation ke liye same ImageKit filename
//     // use nahi karenge.
//     //
//     // Example:
//     // BND-AGR-1234567890-1790260000123.pdf
//     // ======================================================

//     const generationId = Date.now();

//     const fileName = `${agreementNumber}-${generationId}.pdf`;

//     // ======================================================
//     // IMAGEKIT UPLOAD
//     // ======================================================

//     const uploadedPdf = await uploadAgreementPdf(
//       pdfBuffer,

//       fileName,
//     );

//     if (!uploadedPdf?.url) {
//       throw new Error("Agreement PDF URL was not returned by ImageKit");
//     }

//     // ======================================================
//     // SAVE LATEST AGREEMENT URL
//     //
//     // IMPORTANT:
//     //
//     // Existing URL can be overwritten.
//     // This enables multiple-time PDF generation.
//     //
//     // Only latest generated PDF URL remains linked to
//     // PurchaseHistory.
//     // ======================================================

//     purchase.documents = purchase.documents || {};

//     purchase.documents.digitalAgreement = {
//       url: uploadedPdf.url,
//     };

//     purchase.documentGenerationStatus = "COMPLETED";

//     purchase.documentGenerationError = null;

//     await purchase.save();

//     // ======================================================
//     // SUCCESS
//     // ======================================================

//     return {
//       success: true,

//       purchaseId: purchase._id,

//       documentGenerationStatus: purchase.documentGenerationStatus,

//       digitalAgreement: {
//         url: uploadedPdf.url,
//       },

//       generatedAt,
//     };
//   } catch (error) {
//     console.error("GENERATE AGREEMENT PDF ERROR:", error);

//     // ======================================================
//     // FAILURE HANDLING
//     //
//     // CASE 1:
//     // Previous PDF exists
//     // -> Keep old PDF
//     // -> Status remains COMPLETED
//     //
//     // CASE 2:
//     // First generation failed
//     // -> Status FAILED
//     //
//     // Payment status is never modified.
//     // ======================================================

//     if (purchase?._id) {
//       try {
//         const fallbackAgreementUrl =
//           previousAgreementUrl ||
//           purchase.documents?.digitalAgreement?.url ||
//           null;

//         const fallbackStatus = fallbackAgreementUrl ? "COMPLETED" : "FAILED";

//         await PurchaseHistory.findByIdAndUpdate(
//           purchase._id,

//           {
//             $set: {
//               documentGenerationStatus: fallbackStatus,

//               documentGenerationError: error.message,
//             },
//           },
//         );
//       } catch (statusUpdateError) {
//         console.error("FAILED TO UPDATE DOCUMENT STATUS:", statusUpdateError);
//       }
//     }

//     throw error;
//   }
// };
//-------------------------------------------------------------------------------------------------------------------------------------//

// import fs from "fs/promises";
// import path from "path";
// import { fileURLToPath } from "url";

// import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// import PurchaseHistory from "../model/purchaseHistoryModel.js";
// import Asset from "../model/coAssetModel.js";
// import BankAccount from "../model/bankAccountModel.js";

// import { uploadAgreementPdf } from "./imageStorageService.js";

// // ============================================================
// // TEMPLATE PATH
// // ============================================================

// const __filename = fileURLToPath(import.meta.url);

// const __dirname = path.dirname(__filename);

// const AGREEMENT_TEMPLATE_PATH = path.join(
//   __dirname,
//   "../templates/Fraction-Ownership-Agreement.pdf",
// );

// // ============================================================
// // INDIAN TIME
// //
// // Existing approach preserved for generatedAt.
// // ============================================================

// const getIndianTime = () => {
//   const istOffset = 5.5 * 60 * 60 * 1000;

//   return new Date(Date.now() + istOffset);
// };

// // ============================================================
// // DATE / TIME HELPERS
// // ============================================================

// const formatGeneratedDate = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   return new Intl.DateTimeFormat("en-IN", {
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//     timeZone: "UTC",
//   }).format(date);
// };

// const formatGeneratedTime = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   return new Intl.DateTimeFormat("en-IN", {
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//     timeZone: "UTC",
//   })
//     .format(date)
//     .toUpperCase();
// };

// const formatIndianDate = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   return new Intl.DateTimeFormat("en-IN", {
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//     timeZone: "Asia/Kolkata",
//   }).format(date);
// };

// const formatIndianTime = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   return new Intl.DateTimeFormat("en-IN", {
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//     timeZone: "Asia/Kolkata",
//   })
//     .format(date)
//     .toUpperCase();
// };

// const formatIndianDateTimeCompact = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(value);

//   const datePart = new Intl.DateTimeFormat("en-IN", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//     timeZone: "Asia/Kolkata",
//   }).format(date);

//   return `${datePart} ${formatIndianTime(date)} IST`;
// };

// // ============================================================
// // AMOUNT FORMAT
// // ============================================================

// const formatAmount = (value) => {
//   return Number(value || 0).toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });
// };

// // ============================================================
// // NUMBER TO INDIAN WORDS
// // ============================================================

// const ONES = [
//   "",
//   "One",
//   "Two",
//   "Three",
//   "Four",
//   "Five",
//   "Six",
//   "Seven",
//   "Eight",
//   "Nine",
//   "Ten",
//   "Eleven",
//   "Twelve",
//   "Thirteen",
//   "Fourteen",
//   "Fifteen",
//   "Sixteen",
//   "Seventeen",
//   "Eighteen",
//   "Nineteen",
// ];

// const TENS = [
//   "",
//   "",
//   "Twenty",
//   "Thirty",
//   "Forty",
//   "Fifty",
//   "Sixty",
//   "Seventy",
//   "Eighty",
//   "Ninety",
// ];

// const belowHundredToWords = (number) => {
//   if (number < 20) {
//     return ONES[number];
//   }

//   const tens = Math.floor(number / 10);

//   const ones = number % 10;

//   return [TENS[tens], ONES[ones]].filter(Boolean).join(" ");
// };

// const numberToIndianWords = (value) => {
//   let number = Math.round(Number(value || 0));

//   if (number === 0) {
//     return "Zero";
//   }

//   const parts = [];

//   const crore = Math.floor(number / 10000000);

//   if (crore) {
//     parts.push(`${numberToIndianWords(crore)} Crore`);

//     number %= 10000000;
//   }

//   const lakh = Math.floor(number / 100000);

//   if (lakh) {
//     parts.push(`${numberToIndianWords(lakh)} Lakh`);

//     number %= 100000;
//   }

//   const thousand = Math.floor(number / 1000);

//   if (thousand) {
//     parts.push(`${numberToIndianWords(thousand)} Thousand`);

//     number %= 1000;
//   }

//   const hundred = Math.floor(number / 100);

//   if (hundred) {
//     parts.push(`${ONES[hundred]} Hundred`);

//     number %= 100;
//   }

//   if (number > 0) {
//     parts.push(belowHundredToWords(number));
//   }

//   return parts.join(" ");
// };

// // ============================================================
// // GENERAL HELPERS
// // ============================================================

// const addMonths = (value, months) => {
//   if (!value) {
//     return null;
//   }

//   const date = new Date(value);

//   const result = new Date(date.getTime());

//   result.setUTCMonth(result.getUTCMonth() + Number(months || 0));

//   return result;
// };

// const firstValue = (...values) => {
//   return values.find(
//     (value) => value !== undefined && value !== null && value !== "",
//   );
// };

// const requiredValue = (value, fieldName) => {
//   if (value === undefined || value === null || value === "") {
//     throw new Error(`Agreement configuration missing: ${fieldName}`);
//   }

//   return value;
// };

// const cleanText = (value) => {
//   return String(value ?? "")
//     .replace(/[\r\n\t]+/g, " ")
//     .replace(/\s+/g, " ")
//     .replace(/\s+,/g, ",")
//     .replace(/\s+\./g, ".")
//     .replace(/\s+:/g, ":")
//     .trim();
// };

// // ============================================================
// // WORD WRAPPING
// // ============================================================

// const splitTextIntoLines = ({ text, font, fontSize, maxWidth }) => {
//   const words = String(text).trim().split(/\s+/);

//   const lines = [];

//   let currentLine = "";

//   for (const word of words) {
//     const testLine = currentLine ? `${currentLine} ${word}` : word;

//     const width = font.widthOfTextAtSize(testLine, fontSize);

//     if (width <= maxWidth) {
//       currentLine = testLine;
//     } else {
//       if (currentLine) {
//         lines.push(currentLine);
//       }

//       currentLine = word;
//     }
//   }

//   if (currentLine) {
//     lines.push(currentLine);
//   }

//   return lines;
// };

// // ============================================================
// // PDF DRAW HELPERS
// // ============================================================

// const clearPdfArea = ({ page, x, top, width, height }) => {
//   const y = page.getHeight() - top - height;

//   page.drawRectangle({
//     x,
//     y,
//     width,
//     height,

//     color: rgb(1, 1, 1),
//   });
// };

// const drawSingleLine = ({
//   page,
//   text,
//   x = 51.25,
//   top,
//   width = 510,
//   height = 13.5,
//   font,
//   maxFontSize = 9.5,
//   minFontSize = 6.5,
// }) => {
//   clearPdfArea({
//     page,

//     x: x - 1,

//     top: top - 1,

//     width: width + 2,

//     height: height + 2,
//   });

//   let fontSize = maxFontSize;

//   while (
//     fontSize > minFontSize &&
//     font.widthOfTextAtSize(String(text), fontSize) > width
//   ) {
//     fontSize -= 0.25;
//   }

//   const y = page.getHeight() - top - fontSize;

//   page.drawText(String(text), {
//     x,
//     y,

//     size: fontSize,

//     font,

//     color: rgb(0, 0, 0),
//   });
// };

// const drawWrappedBlock = ({
//   page,
//   text,
//   x = 51.25,
//   top,
//   width = 510,
//   height = 29,
//   font,
//   maxLines = 2,
//   maxFontSize = 9.5,
//   minFontSize = 6.25,
//   lineGap = 3.2,
// }) => {
//   clearPdfArea({
//     page,

//     x: x - 1,

//     top: top - 1,

//     width: width + 2,

//     height: height + 2,
//   });

//   let fontSize = maxFontSize;

//   let lines = [];

//   while (fontSize >= minFontSize) {
//     lines = splitTextIntoLines({
//       text,
//       font,
//       fontSize,

//       maxWidth: width,
//     });

//     if (lines.length <= maxLines) {
//       break;
//     }

//     fontSize -= 0.25;
//   }

//   if (lines.length > maxLines) {
//     throw new Error(
//       "Agreement text is too long to fit in the PDF template. Please shorten the address/details.",
//     );
//   }

//   const lineHeight = fontSize + lineGap;

//   lines.forEach((line, index) => {
//     const y = page.getHeight() - top - fontSize - index * lineHeight;

//     page.drawText(line, {
//       x,
//       y,

//       size: fontSize,

//       font,

//       color: rgb(0, 0, 0),
//     });
//   });
// };

// // ============================================================
// // INLINE SEGMENTS
// //
// // Used for same-baseline label + value.
// // ============================================================

// const drawInlineSegments = ({
//   page,
//   x,
//   top,
//   width,
//   height = 14,
//   segments,
//   fontSize = 8,
// }) => {
//   clearPdfArea({
//     page,

//     x: x - 2,

//     top: top - 2,

//     width: width + 4,

//     height: height + 4,
//   });

//   const y = page.getHeight() - top - fontSize;

//   let cursorX = x;

//   for (const segment of segments) {
//     const text = String(segment.text ?? "");

//     page.drawText(text, {
//       x: cursorX,

//       y,

//       size: fontSize,

//       font: segment.font,

//       color: rgb(0, 0, 0),
//     });

//     cursorX += segment.font.widthOfTextAtSize(text, fontSize);
//   }
// };

// // ============================================================
// // RICH TEXT WRAPPING
// // ============================================================

// const splitRichTextIntoLines = ({ segments, fontSize, maxWidth }) => {
//   const tokens = [];

//   for (const segment of segments) {
//     const parts = String(segment.text ?? "")
//       .split(/(\s+)/)
//       .filter((part) => part !== "");

//     for (const part of parts) {
//       tokens.push({
//         text: part,

//         font: segment.font,
//       });
//     }
//   }

//   const lines = [];

//   let currentLine = [];

//   let currentWidth = 0;

//   const pushCurrentLine = () => {
//     while (
//       currentLine.length &&
//       /^\s+$/.test(currentLine[currentLine.length - 1].text)
//     ) {
//       currentLine.pop();
//     }

//     if (currentLine.length) {
//       lines.push(currentLine);
//     }

//     currentLine = [];

//     currentWidth = 0;
//   };

//   for (const token of tokens) {
//     const isWhitespace = /^\s+$/.test(token.text);

//     if (isWhitespace && currentLine.length === 0) {
//       continue;
//     }

//     const tokenWidth = token.font.widthOfTextAtSize(token.text, fontSize);

//     if (
//       !isWhitespace &&
//       currentLine.length > 0 &&
//       currentWidth + tokenWidth > maxWidth
//     ) {
//       pushCurrentLine();
//     }

//     if (isWhitespace && currentWidth + tokenWidth > maxWidth) {
//       pushCurrentLine();

//       continue;
//     }

//     currentLine.push(token);

//     currentWidth += tokenWidth;
//   }

//   pushCurrentLine();

//   return lines;
// };

// const drawRichWrappedBlock = ({
//   page,
//   segments,
//   x = 51.25,
//   top,
//   width = 510,
//   height = 29,
//   maxLines = 2,
//   maxFontSize = 9.5,
//   minFontSize = 6.25,
//   lineGap = 3.2,
// }) => {
//   clearPdfArea({
//     page,

//     x: x - 2,

//     top: top - 2,

//     width: width + 4,

//     height: height + 4,
//   });

//   let fontSize = maxFontSize;

//   let lines = [];

//   while (fontSize >= minFontSize) {
//     lines = splitRichTextIntoLines({
//       segments,

//       fontSize,

//       maxWidth: width,
//     });

//     if (lines.length <= maxLines) {
//       break;
//     }

//     fontSize -= 0.25;
//   }

//   if (lines.length > maxLines) {
//     throw new Error(
//       "Agreement identity details are too long to fit in the PDF template. Please shorten the address/details.",
//     );
//   }

//   const lineHeight = fontSize + lineGap;

//   lines.forEach((line, lineIndex) => {
//     let cursorX = x;

//     const y = page.getHeight() - top - fontSize - lineIndex * lineHeight;

//     for (const token of line) {
//       page.drawText(token.text, {
//         x: cursorX,

//         y,

//         size: fontSize,

//         font: token.font,

//         color: rgb(0, 0, 0),
//       });

//       cursorX += token.font.widthOfTextAtSize(token.text, fontSize);
//     }
//   });
// };

// // ============================================================
// // BUILD AGREEMENT DATA
// // ============================================================

// const buildAgreementData = ({
//   purchase,
//   asset,
//   bankAccount,
//   formData,
//   generatedAt,
// }) => {
//   if (!formData) {
//     throw new Error("Agreement form data is required");
//   }

//   // =========================================================
//   // CUSTOMER DETAILS
//   // =========================================================

//   const fullLegalName = cleanText(
//     requiredValue(
//       formData.fullLegalName,

//       "Full Legal Name",
//     ),
//   );

//   const fullAddress = cleanText(
//     requiredValue(
//       formData.fullAddress,

//       "Full Address",
//     ),
//   );

//   const pan = cleanText(
//     requiredValue(
//       formData.pan,

//       "PAN",
//     ),
//   ).toUpperCase();

//   const mobile = cleanText(
//     requiredValue(
//       formData.mobile,

//       "Mobile",
//     ),
//   );

//   const email = cleanText(
//     requiredValue(
//       formData.email,

//       "Email",
//     ),
//   ).toLowerCase();

//   // =========================================================
//   // PAYMENT DATE
//   // =========================================================

//   const paymentDate = requiredValue(
//     purchase.paidAt,

//     "PurchaseHistory.paidAt",
//   );

//   // =========================================================
//   // ASSET DETAILS
//   // =========================================================

//   const assetName = cleanText(
//     requiredValue(
//       firstValue(
//         purchase.assetSnapshot?.assetName,

//         asset.assetName,
//       ),

//       "Asset Name",
//     ),
//   );

//   const assetCode = cleanText(
//     requiredValue(
//       firstValue(
//         purchase.assetSnapshot?.assetCode,

//         asset.assetCode,
//       ),

//       "Asset Code",
//     ),
//   );

//   const totalAssetValue = Number(
//     firstValue(
//       purchase.assetSnapshot?.assetCost,

//       asset.assetCost,

//       0,
//     ),
//   );

//   const totalFractions = Number(
//     firstValue(
//       purchase.assetSnapshot?.totalFractions,

//       asset.totalFractions,

//       0,
//     ),
//   );

//   if (!totalFractions || totalFractions <= 0) {
//     throw new Error("Asset totalFractions is missing");
//   }

//   const fractionsAcquired = Number(purchase.fractionsPurchased || 0);

//   if (!fractionsAcquired || fractionsAcquired <= 0) {
//     throw new Error("Purchased fraction quantity is missing");
//   }

//   const amountPerFraction = Number(
//     firstValue(
//       purchase.amountPerFraction,

//       purchase.assetSnapshot?.amountPerFraction,

//       asset.amountPerFraction,

//       0,
//     ),
//   );

//   const totalAmountPaid = Number(purchase.totalAmount || 0);

//   // =========================================================
//   // RENTAL
//   // =========================================================

//   const rentalPerFraction = Number(
//     firstValue(
//       purchase.assetSnapshot?.rentalAmountPerFraction,

//       asset.rentalAmountPerFraction,

//       0,
//     ),
//   );

//   const totalMonthlyRental = rentalPerFraction * fractionsAcquired;

//   const rentalCommencementDate = firstValue(
//     purchase.rentalCommencementDate,

//     asset.rentalCommencementDate,

//     paymentDate,
//   );

//   const rentalTermMonths = Number(
//     firstValue(
//       purchase.assetSnapshot?.durationMonths,

//       asset.durationMonths,

//       0,
//     ),
//   );

//   if (!rentalTermMonths || rentalTermMonths <= 0) {
//     throw new Error("Rental term/duration is missing");
//   }

//   const rentalExpiryDate = addMonths(
//     rentalCommencementDate,

//     rentalTermMonths,
//   );

//   // =========================================================
//   // BANK DETAILS
//   //
//   // PDF needs full account number.
//   // Prefer request data because DB normally stores encrypted
//   // value + last4.
//   // =========================================================

//   const requestBank = formData.bankDetails || {};

//   const accountHolderName = cleanText(
//     requiredValue(
//       firstValue(
//         requestBank.accountHolderName,

//         formData.accountHolderName,

//         bankAccount?.accountHolderName,
//       ),

//       "Bank Account Holder Name",
//     ),
//   );

//   const bankName = cleanText(
//     requiredValue(
//       firstValue(
//         requestBank.bankName,

//         formData.bankName,

//         bankAccount?.bankName,
//       ),

//       "Bank Name",
//     ),
//   );

//   // =========================================================
//   // FULL ACCOUNT NUMBER
//   // =========================================================

//   const accountNumber = cleanText(
//     requiredValue(
//       firstValue(
//         requestBank.accountNumber,

//         formData.accountNumber,

//         bankAccount?.accountNumber,
//       ),

//       "Full Bank Account Number",
//     ),
//   );

//   const ifscCode = cleanText(
//     requiredValue(
//       firstValue(
//         requestBank.ifscCode,

//         formData.ifscCode,

//         bankAccount?.ifscCode,
//       ),

//       "IFSC Code",
//     ),
//   ).toUpperCase();

//   const accountType = cleanText(
//     firstValue(
//       requestBank.accountType,

//       formData.accountType,

//       bankAccount?.accountType,

//       "SAVINGS",
//     ),
//   ).toUpperCase();

//   // =========================================================
//   // FINAL DATA
//   // =========================================================

//   return {
//     agreementDate: paymentDate,

//     acquisitionDate: paymentDate,

//     paymentDate,

//     generatedAt,

//     // Customer
//     fullLegalName,
//     fullAddress,
//     pan,
//     mobile,
//     email,

//     // Asset
//     assetName,
//     assetCode,
//     totalAssetValue,
//     totalFractions,
//     amountPerFraction,
//     fractionsAcquired,
//     totalAmountPaid,

//     // Rental
//     rentalPerFraction,
//     totalMonthlyRental,
//     rentalCommencementDate,
//     rentalTermMonths,
//     rentalExpiryDate,

//     // Bank
//     accountHolderName,
//     bankName,
//     accountNumber,
//     ifscCode,
//     accountType,
//   };
// };

// // ============================================================
// // PAGE 1
// // ============================================================

// const fillPageOne = ({ page, data, font, boldFont }) => {
//   // =========================================================
//   // CLEAR OLD PLACEHOLDER AREAS
//   // =========================================================

//   clearPdfArea({
//     page,

//     x: 49,

//     top: 94.5,

//     width: 526,

//     height: 18,
//   });

//   clearPdfArea({
//     page,

//     x: 49,

//     top: 233.5,

//     width: 526,

//     height: 33,
//   });

//   clearPdfArea({
//     page,

//     x: 49,

//     top: 324.5,

//     width: 526,

//     height: 205.5,
//   });

//   clearPdfArea({
//     page,

//     x: 49,

//     top: 597.5,

//     width: 526,

//     height: 75.5,
//   });

//   // =========================================================
//   // AGREEMENT DATE
//   // =========================================================

//   drawSingleLine({
//     page,

//     top: 96.5,

//     height: 14,

//     font,

//     text: `This Agreement is electronically executed on ${formatIndianDate(
//       data.agreementDate,
//     )} between:`,
//   });

//   // =========================================================
//   // FRACTION OWNER DETAILS
//   // =========================================================

//   drawRichWrappedBlock({
//     page,

//     top: 235.4,

//     height: 29,

//     maxLines: 2,

//     segments: [
//       {
//         text: `${data.fullLegalName},`,

//         font: boldFont,
//       },

//       {
//         text: " residing at ",

//         font,
//       },

//       {
//         text: `${data.fullAddress},`,

//         font: boldFont,
//       },

//       {
//         text: " bearing PAN ",

//         font,
//       },

//       {
//         text: `${data.pan},`,

//         font: boldFont,
//       },

//       {
//         text: " mobile number ",

//         font,
//       },

//       {
//         text: `${data.mobile},`,

//         font: boldFont,
//       },

//       {
//         text: " and email address ",

//         font,
//       },

//       {
//         text: `${data.email},`,

//         font: boldFont,
//       },

//       {
//         text: ' hereinafter referred to as the "Fraction Owner".',

//         font,
//       },
//     ],
//   });

//   // =========================================================
//   // ASSET DETAILS
//   // =========================================================

//   drawSingleLine({
//     page,

//     top: 326.2,

//     font,

//     text: `Asset Name: ${data.assetName}`,
//   });

//   drawSingleLine({
//     page,

//     top: 340.6,

//     font,

//     text: `Asset Code: ${data.assetCode}`,
//   });

//   // =========================================================
//   // LEGAL NAME
//   // =========================================================

//   drawInlineSegments({
//     page,

//     x: 51.25,

//     top: 355.1,

//     width: 510,

//     height: 13.5,

//     fontSize: 9.5,

//     segments: [
//       {
//         text: "Legal Name: ",

//         font,
//       },

//       {
//         text: data.fullLegalName,

//         font: boldFont,
//       },
//     ],
//   });

//   drawSingleLine({
//     page,

//     top: 369.5,

//     font,

//     text: `Total Asset Value: INR ${formatAmount(data.totalAssetValue)}`,
//   });

//   drawSingleLine({
//     page,

//     top: 384.0,

//     font,

//     text: `Total Number of fractions: ${data.totalFractions}`,
//   });

//   drawSingleLine({
//     page,

//     top: 398.4,

//     font,

//     text: `Amount Per Fraction: INR ${formatAmount(data.amountPerFraction)}`,
//   });

//   drawSingleLine({
//     page,

//     top: 412.9,

//     font,

//     text: `Number of Fractions Acquired: ${data.fractionsAcquired}`,
//   });

//   drawSingleLine({
//     page,

//     top: 427.3,

//     font,

//     text: `Total Amount Paid: INR ${formatAmount(data.totalAmountPaid)}`,
//   });

//   drawSingleLine({
//     page,

//     top: 441.9,

//     font,

//     text: `Acquisition Date: ${formatIndianDate(data.acquisitionDate)}`,
//   });

//   // =========================================================
//   // RENTAL DETAILS
//   // =========================================================

//   drawSingleLine({
//     page,

//     top: 456.3,

//     width: 510,

//     maxFontSize: 9,

//     minFontSize: 7,

//     font,

//     text: `Fixed Monthly Rental per Fraction: INR ${formatAmount(
//       data.rentalPerFraction,
//     )}`,
//   });

//   drawSingleLine({
//     page,

//     top: 470.8,

//     width: 510,

//     maxFontSize: 9,

//     minFontSize: 7,

//     font,

//     text: `Total Fixed Monthly Rental: INR ${formatAmount(
//       data.totalMonthlyRental,
//     )}`,
//   });

//   drawSingleLine({
//     page,

//     top: 485.2,

//     font,

//     text: `Rental Commencement Date: ${formatIndianDate(
//       data.rentalCommencementDate,
//     )}`,
//   });

//   drawSingleLine({
//     page,

//     top: 499.6,

//     font,

//     text: `Rental Term: ${data.rentalTermMonths} months`,
//   });

//   drawSingleLine({
//     page,

//     top: 514.1,

//     font,

//     text: `Rental Expiry Date: ${formatIndianDate(data.rentalExpiryDate)}`,
//   });

//   // =========================================================
//   // BANK DETAILS
//   // =========================================================

//   drawSingleLine({
//     page,

//     top: 599.4,

//     font,

//     text: `Account Holder Name: ${data.accountHolderName}`,
//   });

//   drawSingleLine({
//     page,

//     top: 613.8,

//     font,

//     text: `Bank Name: ${data.bankName}`,
//   });

//   // Full account number visible in agreement
//   drawSingleLine({
//     page,

//     top: 628.3,

//     font,

//     text: `Account Number: ${data.accountNumber}`,
//   });

//   drawSingleLine({
//     page,

//     top: 642.7,

//     font,

//     text: `IFSC Code: ${data.ifscCode}`,
//   });

//   drawSingleLine({
//     page,

//     top: 657.2,

//     font,

//     text: `Account Type: ${data.accountType}`,
//   });
// };

// // ============================================================
// // PAGE 2
// // ============================================================

// const fillPageTwo = ({ page, data, font }) => {
//   clearPdfArea({
//     page,

//     x: 49,

//     top: 567,

//     width: 527,

//     height: 32.5,
//   });

//   drawWrappedBlock({
//     page,

//     top: 568.7,

//     width: 510,

//     height: 29,

//     maxLines: 2,

//     maxFontSize: 9.25,

//     minFontSize: 6.25,

//     lineGap: 3.1,

//     font,

//     text: `The Company shall pay the Fraction Owner a fixed monthly rental of INR ${formatAmount(
//       data.totalMonthlyRental,
//     )} (Rupees ${numberToIndianWords(
//       data.totalMonthlyRental,
//     )} Only) for the acquired fractions during the agreed rental term.`,
//   });
// };

// // ============================================================
// // PAGE 6
// // ============================================================

// const fillPageSix = ({ page, data, font, boldFont, italicFont }) => {
//   // =========================================================
//   // FRACTION OWNER NAME
//   // =========================================================

//   clearPdfArea({
//     page,

//     x: 346,

//     top: 164.5,

//     width: 220,

//     height: 17,
//   });

//   drawInlineSegments({
//     page,

//     x: 346.5,

//     top: 167.2,

//     width: 215,

//     height: 13.5,

//     fontSize: 8.5,

//     segments: [
//       {
//         text: "Name: ",

//         font: boldFont,
//       },

//       {
//         text: data.fullLegalName,

//         font: boldFont,
//       },
//     ],
//   });

//   // =========================================================
//   // FRACTION OWNER PAN
//   // =========================================================

//   clearPdfArea({
//     page,

//     x: 346,

//     top: 181.5,

//     width: 220,

//     height: 17,
//   });

//   drawInlineSegments({
//     page,

//     x: 346.5,

//     top: 184.3,

//     width: 215,

//     height: 13.5,

//     fontSize: 8.5,

//     segments: [
//       {
//         text: "PAN No : ",

//         font: boldFont,
//       },

//       {
//         text: data.pan,

//         font: boldFont,
//       },
//     ],
//   });

//   // =========================================================
//   // PAYMENT DATE & TIME
//   // =========================================================

//   const paymentDateTime = formatIndianDateTimeCompact(data.paymentDate);

//   // =========================================================
//   // COMPANY DATE & TIME
//   //
//   // Clear old template Date & Time completely so duplicate
//   // "Date & Date & Time" does not appear.
//   // =========================================================

//   clearPdfArea({
//     page,

//     x: 34,

//     top: 196.5,

//     width: 245,

//     height: 19,
//   });

//   drawInlineSegments({
//     page,

//     x: 35,

//     top: 199.5,

//     width: 240,

//     height: 15,

//     fontSize: 8.2,

//     segments: [
//       {
//         text: "Date & Time : ",

//         font: boldFont,
//       },

//       {
//         text: paymentDateTime,

//         font: boldFont,
//       },
//     ],
//   });

//   // =========================================================
//   // FRACTION OWNER DATE & TIME
//   // =========================================================

//   clearPdfArea({
//     page,

//     x: 346,

//     top: 196.5,

//     width: 225,

//     height: 19,
//   });

//   drawInlineSegments({
//     page,

//     x: 347,

//     top: 199.5,

//     width: 220,

//     height: 15,

//     fontSize: 8.2,

//     segments: [
//       {
//         text: "Date & Time : ",

//         font: boldFont,
//       },

//       {
//         text: paymentDateTime,

//         font: boldFont,
//       },
//     ],
//   });

//   // =========================================================
//   // GENERATED DATE / TIME
//   // =========================================================

//   const generatedDate = formatGeneratedDate(data.generatedAt);

//   const generatedTime = formatGeneratedTime(data.generatedAt);

//   // =========================================================
//   // SIGNING DATE / TIME
//   //
//   // signed timestamp = payment timestamp.
//   // =========================================================

//   const signingDate = formatIndianDate(data.paymentDate);

//   const signingTime = `${formatIndianTime(data.paymentDate)} IST`;

//   // =========================================================
//   // CLEAR OLD SIGNING PLACEHOLDERS
//   // =========================================================

//   clearPdfArea({
//     page,

//     x: 50,

//     top: 267,

//     width: 526,

//     height: 32,
//   });

//   // =========================================================
//   // GENERATED / SIGNED LINE
//   // =========================================================

//   drawWrappedBlock({
//     page,

//     x: 52.5,

//     top: 268.4,

//     width: 520,

//     height: 29,

//     maxLines: 2,

//     maxFontSize: 7.5,

//     minFontSize: 6,

//     lineGap: 2.7,

//     font: italicFont,

//     text: `This Agreement was generated on ${generatedDate} at ${generatedTime} and digitally signed on ${signingDate} at ${signingTime}.`,
//   });
// };

// // ============================================================
// // MAIN AGREEMENT PDF GENERATOR
// // ============================================================

// export const generateAgreementPdf = async (purchaseHistoryId, formData) => {
//   let purchase = null;

//   /*
//    * If user already generated an agreement before,
//    * keep its URL so that a failed regeneration does not
//    * destroy the previous successful agreement.
//    */

//   let previousAgreementUrl = null;

//   /*
//    * Capture generation time exactly once.
//    */

//   const generatedAt = getIndianTime();

//   try {
//     // ======================================================
//     // PURCHASE HISTORY
//     // ======================================================

//     purchase = await PurchaseHistory.findById(purchaseHistoryId).select(
//       "+documentGenerationError",
//     );

//     if (!purchase) {
//       const error = new Error("Purchase history not found");

//       error.statusCode = 404;

//       throw error;
//     }

//     // ======================================================
//     // PAYMENT MUST BE SUCCESS
//     // ======================================================

//     if (purchase.paymentStatus !== "SUCCESS") {
//       const error = new Error(
//         "Agreement can only be generated after successful payment",
//       );

//       error.statusCode = 400;

//       throw error;
//     }

//     // ======================================================
//     // PAID AT REQUIRED
//     // ======================================================

//     if (!purchase.paidAt) {
//       const error = new Error(
//         "Payment date is not available in purchase history",
//       );

//       error.statusCode = 400;

//       throw error;
//     }

//     // ======================================================
//     // FORM DATA REQUIRED
//     // ======================================================

//     if (!formData) {
//       const error = new Error("Agreement form data is required");

//       error.statusCode = 400;

//       throw error;
//     }

//     if (
//       !formData.fullLegalName ||
//       !formData.fullAddress ||
//       !formData.pan ||
//       !formData.mobile ||
//       !formData.email
//     ) {
//       const error = new Error("Complete agreement form details are required");

//       error.statusCode = 400;

//       throw error;
//     }

//     // ======================================================
//     // MULTIPLE PDF GENERATION
//     //
//     // COMPLETED agreement DOES NOT block regeneration.
//     // ======================================================

//     previousAgreementUrl = purchase.documents?.digitalAgreement?.url || null;

//     // ======================================================
//     // MARK PROCESSING
//     // ======================================================

//     purchase.documentGenerationStatus = "PROCESSING";

//     purchase.documentGenerationError = null;

//     await purchase.save();

//     // ======================================================
//     // ASSET
//     // ======================================================

//     const asset = await Asset.findById(purchase.assetId);

//     if (!asset) {
//       const error = new Error("Asset not found");

//       error.statusCode = 404;

//       throw error;
//     }

//     // ======================================================
//     // BANK ACCOUNT
//     // ======================================================

//     let bankAccount = null;

//     if (purchase.bankAccountId) {
//       bankAccount = await BankAccount.findById(purchase.bankAccountId).lean();
//     }

//     if (!bankAccount && !formData.bankDetails) {
//       const error = new Error(
//         "Bank account details are not available for agreement generation",
//       );

//       error.statusCode = 400;

//       throw error;
//     }

//     // ======================================================
//     // BUILD AGREEMENT DATA
//     // ======================================================

//     const agreementData = buildAgreementData({
//       purchase,

//       asset,

//       bankAccount,

//       formData,

//       generatedAt,
//     });

//     // ======================================================
//     // READ TEMPLATE
//     // ======================================================

//     const templateBytes = await fs.readFile(AGREEMENT_TEMPLATE_PATH);

//     // ======================================================
//     // LOAD PDF
//     // ======================================================

//     const pdfDoc = await PDFDocument.load(templateBytes, {
//       updateMetadata: false,
//     });

//     const pages = pdfDoc.getPages();

//     if (pages.length !== 6) {
//       throw new Error(
//         `Invalid agreement template. Expected 6 pages but found ${pages.length}.`,
//       );
//     }

//     // ======================================================
//     // FONTS
//     // ======================================================

//     const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

//     // ======================================================
//     // PAGE 1
//     // ======================================================

//     fillPageOne({
//       page: pages[0],

//       data: agreementData,

//       font,

//       boldFont,
//     });

//     // ======================================================
//     // PAGE 2
//     // ======================================================

//     fillPageTwo({
//       page: pages[1],

//       data: agreementData,

//       font,
//     });

//     /*
//      * Pages 3, 4 and 5 have no dynamic placeholders
//      * in the current template.
//      */

//     // ======================================================
//     // PAGE 6
//     // ======================================================

//     fillPageSix({
//       page: pages[5],

//       data: agreementData,

//       font,

//       boldFont,

//       italicFont,
//     });

//     /*
//      * Do not flatten existing AcroForm / signature fields.
//      */

//     // ======================================================
//     // SAVE PDF
//     // ======================================================

//     const pdfBytes = await pdfDoc.save();

//     const pdfBuffer = Buffer.from(pdfBytes);

//     // ======================================================
//     // AGREEMENT NUMBER
//     // ======================================================

//     const suffix = purchase._id.toString().slice(-10).toUpperCase();

//     const agreementNumber = `BND-AGR-${suffix}`;

//     // ======================================================
//     // UNIQUE FILE NAME
//     //
//     // Multiple generation ke liye same ImageKit filename
//     // use nahi karenge.
//     // ======================================================

//     const generationId = Date.now();

//     const fileName = `${agreementNumber}-${generationId}.pdf`;

//     // ======================================================
//     // IMAGEKIT UPLOAD
//     // ======================================================

//     const uploadedPdf = await uploadAgreementPdf(
//       pdfBuffer,

//       fileName,
//     );

//     if (!uploadedPdf?.url) {
//       throw new Error("Agreement PDF URL was not returned by ImageKit");
//     }

//     // ======================================================
//     // SAVE LATEST AGREEMENT URL
//     //
//     // Existing URL can be overwritten.
//     // ======================================================

//     purchase.documents = purchase.documents || {};

//     purchase.documents.digitalAgreement = {
//       url: uploadedPdf.url,
//     };

//     purchase.documentGenerationStatus = "COMPLETED";

//     purchase.documentGenerationError = null;

//     await purchase.save();

//     // ======================================================
//     // SUCCESS
//     // ======================================================

//     return {
//       success: true,

//       purchaseId: purchase._id,

//       documentGenerationStatus: purchase.documentGenerationStatus,

//       digitalAgreement: {
//         url: uploadedPdf.url,
//       },

//       generatedAt,
//     };
//   } catch (error) {
//     console.error("GENERATE AGREEMENT PDF ERROR:", error);

//     // ======================================================
//     // FAILURE HANDLING
//     //
//     // Previous PDF exists:
//     // -> keep COMPLETED
//     //
//     // First generation failed:
//     // -> FAILED
//     // ======================================================

//     if (purchase?._id) {
//       try {
//         const fallbackAgreementUrl =
//           previousAgreementUrl ||
//           purchase.documents?.digitalAgreement?.url ||
//           null;

//         const fallbackStatus = fallbackAgreementUrl ? "COMPLETED" : "FAILED";

//         await PurchaseHistory.findByIdAndUpdate(
//           purchase._id,

//           {
//             $set: {
//               documentGenerationStatus: fallbackStatus,

//               documentGenerationError: error.message,
//             },
//           },
//         );
//       } catch (statusUpdateError) {
//         console.error("FAILED TO UPDATE DOCUMENT STATUS:", statusUpdateError);
//       }
//     }

//     throw error;
//   }
// };

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import PurchaseHistory from "../model/purchaseHistoryModel.js";
import Asset from "../model/coAssetModel.js";
import BankAccount from "../model/bankAccountModel.js";

import { uploadAgreementPdf } from "./imageStorageService.js";

// ============================================================
// TEMPLATE PATH
// ============================================================

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const AGREEMENT_TEMPLATE_PATH = path.join(
  __dirname,
  "../templates/Fraction-Ownership-Agreement.pdf",
);

// ============================================================
// INDIAN TIME
//
// Existing approach preserved for generatedAt.
// ============================================================

const getIndianTime = () => {
  const istOffset = 5.5 * 60 * 60 * 1000;

  return new Date(Date.now() + istOffset);
};

// ============================================================
// DATE / TIME HELPERS
// ============================================================

const formatGeneratedDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const formatGeneratedTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })
    .format(date)
    .toUpperCase();
};

const formatIndianDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const formatIndianTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  })
    .format(date)
    .toUpperCase();
};

const formatIndianDateTimeCompact = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  const datePart = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);

  return `${datePart} ${formatIndianTime(date)} IST`;
};

// ============================================================
// AMOUNT FORMAT
// ============================================================

const formatAmount = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ============================================================
// NUMBER TO INDIAN WORDS
// ============================================================

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const belowHundredToWords = (number) => {
  if (number < 20) {
    return ONES[number];
  }

  const tens = Math.floor(number / 10);

  const ones = number % 10;

  return [TENS[tens], ONES[ones]].filter(Boolean).join(" ");
};

const numberToIndianWords = (value) => {
  let number = Math.round(Number(value || 0));

  if (number === 0) {
    return "Zero";
  }

  const parts = [];

  const crore = Math.floor(number / 10000000);

  if (crore) {
    parts.push(`${numberToIndianWords(crore)} Crore`);

    number %= 10000000;
  }

  const lakh = Math.floor(number / 100000);

  if (lakh) {
    parts.push(`${numberToIndianWords(lakh)} Lakh`);

    number %= 100000;
  }

  const thousand = Math.floor(number / 1000);

  if (thousand) {
    parts.push(`${numberToIndianWords(thousand)} Thousand`);

    number %= 1000;
  }

  const hundred = Math.floor(number / 100);

  if (hundred) {
    parts.push(`${ONES[hundred]} Hundred`);

    number %= 100;
  }

  if (number > 0) {
    parts.push(belowHundredToWords(number));
  }

  return parts.join(" ");
};

// ============================================================
// GENERAL HELPERS
// ============================================================

const addMonths = (value, months) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  const result = new Date(date.getTime());

  result.setUTCMonth(result.getUTCMonth() + Number(months || 0));

  return result;
};

const firstValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
};

const requiredValue = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Agreement configuration missing: ${fieldName}`);
  }

  return value;
};

const cleanText = (value) => {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s+:/g, ":")
    .trim();
};

// ============================================================
// WORD WRAPPING
// ============================================================

const splitTextIntoLines = ({ text, font, fontSize, maxWidth }) => {
  const words = String(text).trim().split(/\s+/);

  const lines = [];

  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

// ============================================================
// PDF DRAW HELPERS
// ============================================================

const clearPdfArea = ({ page, x, top, width, height }) => {
  const y = page.getHeight() - top - height;

  page.drawRectangle({
    x,
    y,
    width,
    height,

    color: rgb(1, 1, 1),
  });
};

const drawSingleLine = ({
  page,
  text,
  x = 51.25,
  top,
  width = 510,
  height = 13.5,
  font,
  maxFontSize = 9.5,
  minFontSize = 6.5,
}) => {
  clearPdfArea({
    page,

    x: x - 1,

    top: top - 1,

    width: width + 2,

    height: height + 2,
  });

  let fontSize = maxFontSize;

  while (
    fontSize > minFontSize &&
    font.widthOfTextAtSize(String(text), fontSize) > width
  ) {
    fontSize -= 0.25;
  }

  const y = page.getHeight() - top - fontSize;

  page.drawText(String(text), {
    x,
    y,

    size: fontSize,

    font,

    color: rgb(0, 0, 0),
  });
};

const drawWrappedBlock = ({
  page,
  text,
  x = 51.25,
  top,
  width = 510,
  height = 29,
  font,
  maxLines = 2,
  maxFontSize = 9.5,
  minFontSize = 6.25,
  lineGap = 3.2,
}) => {
  clearPdfArea({
    page,

    x: x - 1,

    top: top - 1,

    width: width + 2,

    height: height + 2,
  });

  let fontSize = maxFontSize;

  let lines = [];

  while (fontSize >= minFontSize) {
    lines = splitTextIntoLines({
      text,
      font,
      fontSize,

      maxWidth: width,
    });

    if (lines.length <= maxLines) {
      break;
    }

    fontSize -= 0.25;
  }

  if (lines.length > maxLines) {
    throw new Error(
      "Agreement text is too long to fit in the PDF template. Please shorten the address/details.",
    );
  }

  const lineHeight = fontSize + lineGap;

  lines.forEach((line, index) => {
    const y = page.getHeight() - top - fontSize - index * lineHeight;

    page.drawText(line, {
      x,
      y,

      size: fontSize,

      font,

      color: rgb(0, 0, 0),
    });
  });
};

// ============================================================
// INLINE SEGMENTS
//
// Used for same-baseline label + value.
// ============================================================

const drawInlineSegments = ({
  page,
  x,
  top,
  width,
  height = 14,
  segments,
  fontSize = 8,
}) => {
  clearPdfArea({
    page,

    x: x - 2,

    top: top - 2,

    width: width + 4,

    height: height + 4,
  });

  const y = page.getHeight() - top - fontSize;

  let cursorX = x;

  for (const segment of segments) {
    const text = String(segment.text ?? "");

    page.drawText(text, {
      x: cursorX,

      y,

      size: fontSize,

      font: segment.font,

      color: rgb(0, 0, 0),
    });

    cursorX += segment.font.widthOfTextAtSize(text, fontSize);
  }
};

// ============================================================
// RICH TEXT WRAPPING
// ============================================================

const splitRichTextIntoLines = ({ segments, fontSize, maxWidth }) => {
  const tokens = [];

  for (const segment of segments) {
    const parts = String(segment.text ?? "")
      .split(/(\s+)/)
      .filter((part) => part !== "");

    for (const part of parts) {
      tokens.push({
        text: part,

        font: segment.font,
      });
    }
  }

  const lines = [];

  let currentLine = [];

  let currentWidth = 0;

  const pushCurrentLine = () => {
    while (
      currentLine.length &&
      /^\s+$/.test(currentLine[currentLine.length - 1].text)
    ) {
      currentLine.pop();
    }

    if (currentLine.length) {
      lines.push(currentLine);
    }

    currentLine = [];

    currentWidth = 0;
  };

  for (const token of tokens) {
    const isWhitespace = /^\s+$/.test(token.text);

    if (isWhitespace && currentLine.length === 0) {
      continue;
    }

    const tokenWidth = token.font.widthOfTextAtSize(token.text, fontSize);

    if (
      !isWhitespace &&
      currentLine.length > 0 &&
      currentWidth + tokenWidth > maxWidth
    ) {
      pushCurrentLine();
    }

    if (isWhitespace && currentWidth + tokenWidth > maxWidth) {
      pushCurrentLine();

      continue;
    }

    currentLine.push(token);

    currentWidth += tokenWidth;
  }

  pushCurrentLine();

  return lines;
};

const drawRichWrappedBlock = ({
  page,
  segments,
  x = 51.25,
  top,
  width = 510,
  height = 29,
  maxLines = 2,
  maxFontSize = 9.5,
  minFontSize = 6.25,
  lineGap = 3.2,
}) => {
  clearPdfArea({
    page,

    x: x - 2,

    top: top - 2,

    width: width + 4,

    height: height + 4,
  });

  let fontSize = maxFontSize;

  let lines = [];

  while (fontSize >= minFontSize) {
    lines = splitRichTextIntoLines({
      segments,

      fontSize,

      maxWidth: width,
    });

    if (lines.length <= maxLines) {
      break;
    }

    fontSize -= 0.25;
  }

  if (lines.length > maxLines) {
    throw new Error(
      "Agreement identity details are too long to fit in the PDF template. Please shorten the address/details.",
    );
  }

  const lineHeight = fontSize + lineGap;

  lines.forEach((line, lineIndex) => {
    let cursorX = x;

    const y = page.getHeight() - top - fontSize - lineIndex * lineHeight;

    for (const token of line) {
      page.drawText(token.text, {
        x: cursorX,

        y,

        size: fontSize,

        font: token.font,

        color: rgb(0, 0, 0),
      });

      cursorX += token.font.widthOfTextAtSize(token.text, fontSize);
    }
  });
};

// ============================================================
// BUILD AGREEMENT DATA
// ============================================================

const buildAgreementData = ({
  purchase,
  asset,
  bankAccount,
  formData,
  generatedAt,
}) => {
  if (!formData) {
    throw new Error("Agreement form data is required");
  }

  // =========================================================
  // CUSTOMER DETAILS
  // =========================================================

  const fullLegalName = cleanText(
    requiredValue(
      formData.fullLegalName,

      "Full Legal Name",
    ),
  );

  const fullAddress = cleanText(
    requiredValue(
      formData.fullAddress,

      "Full Address",
    ),
  );

  const pan = cleanText(
    requiredValue(
      formData.pan,

      "PAN",
    ),
  ).toUpperCase();

  const mobile = cleanText(
    requiredValue(
      formData.mobile,

      "Mobile",
    ),
  );

  const email = cleanText(
    requiredValue(
      formData.email,

      "Email",
    ),
  ).toLowerCase();

  // =========================================================
  // PAYMENT DATE
  // =========================================================

  const paymentDate = requiredValue(
    purchase.paidAt,

    "PurchaseHistory.paidAt",
  );

  // =========================================================
  // ASSET DETAILS
  // =========================================================

  const assetName = cleanText(
    requiredValue(
      firstValue(
        purchase.assetSnapshot?.assetName,

        asset.assetName,
      ),

      "Asset Name",
    ),
  );

  const assetCode = cleanText(
    requiredValue(
      firstValue(
        purchase.assetSnapshot?.assetCode,

        asset.assetCode,
      ),

      "Asset Code",
    ),
  );

  const totalAssetValue = Number(
    firstValue(
      purchase.assetSnapshot?.assetCost,

      asset.assetCost,

      0,
    ),
  );

  const totalFractions = Number(
    firstValue(
      purchase.assetSnapshot?.totalFractions,

      asset.totalFractions,

      0,
    ),
  );

  if (!totalFractions || totalFractions <= 0) {
    throw new Error("Asset totalFractions is missing");
  }

  const fractionsAcquired = Number(purchase.fractionsPurchased || 0);

  if (!fractionsAcquired || fractionsAcquired <= 0) {
    throw new Error("Purchased fraction quantity is missing");
  }

  const amountPerFraction = Number(
    firstValue(
      purchase.amountPerFraction,

      purchase.assetSnapshot?.amountPerFraction,

      asset.amountPerFraction,

      0,
    ),
  );

  const totalAmountPaid = Number(purchase.totalAmount || 0);

  // =========================================================
  // RENTAL
  // =========================================================

  const rentalPerFraction = Number(
    firstValue(
      purchase.assetSnapshot?.rentalAmountPerFraction,

      asset.rentalAmountPerFraction,

      0,
    ),
  );

  const totalMonthlyRental = rentalPerFraction * fractionsAcquired;

  const rentalCommencementDate = firstValue(
    purchase.rentalCommencementDate,

    asset.rentalCommencementDate,

    paymentDate,
  );

  const rentalTermMonths = Number(
    firstValue(
      purchase.assetSnapshot?.durationMonths,

      asset.durationMonths,

      0,
    ),
  );

  if (!rentalTermMonths || rentalTermMonths <= 0) {
    throw new Error("Rental term/duration is missing");
  }

  const rentalExpiryDate = addMonths(
    rentalCommencementDate,

    rentalTermMonths,
  );

  // =========================================================
  // BANK DETAILS
  //
  // PDF needs full account number.
  // Prefer request data because DB normally stores encrypted
  // value + last4.
  // =========================================================

  const requestBank = formData.bankDetails || {};

  const accountHolderName = cleanText(
    requiredValue(
      firstValue(
        requestBank.accountHolderName,

        formData.accountHolderName,

        bankAccount?.accountHolderName,
      ),

      "Bank Account Holder Name",
    ),
  );

  const bankName = cleanText(
    requiredValue(
      firstValue(
        requestBank.bankName,

        formData.bankName,

        bankAccount?.bankName,
      ),

      "Bank Name",
    ),
  );

  // =========================================================
  // FULL ACCOUNT NUMBER
  // =========================================================

  const accountNumber = cleanText(
    requiredValue(
      firstValue(
        requestBank.accountNumber,

        formData.accountNumber,

        bankAccount?.accountNumber,
      ),

      "Full Bank Account Number",
    ),
  );

  const ifscCode = cleanText(
    requiredValue(
      firstValue(
        requestBank.ifscCode,

        formData.ifscCode,

        bankAccount?.ifscCode,
      ),

      "IFSC Code",
    ),
  ).toUpperCase();

  const accountType = cleanText(
    firstValue(
      requestBank.accountType,

      formData.accountType,

      bankAccount?.accountType,

      "SAVINGS",
    ),
  ).toUpperCase();

  // =========================================================
  // FINAL DATA
  // =========================================================

  return {
    agreementDate: paymentDate,

    acquisitionDate: paymentDate,

    paymentDate,

    generatedAt,

    // Customer
    fullLegalName,
    fullAddress,
    pan,
    mobile,
    email,

    // Asset
    assetName,
    assetCode,
    totalAssetValue,
    totalFractions,
    amountPerFraction,
    fractionsAcquired,
    totalAmountPaid,

    // Rental
    rentalPerFraction,
    totalMonthlyRental,
    rentalCommencementDate,
    rentalTermMonths,
    rentalExpiryDate,

    // Bank
    accountHolderName,
    bankName,
    accountNumber,
    ifscCode,
    accountType,
  };
};

// ============================================================
// PAGE 1
// ============================================================

const fillPageOne = ({ page, data, font, boldFont }) => {
  // =========================================================
  // CLEAR OLD PLACEHOLDER AREAS
  // =========================================================

  clearPdfArea({
    page,

    x: 49,

    top: 94.5,

    width: 526,

    height: 18,
  });

  clearPdfArea({
    page,

    x: 49,

    top: 233.5,

    width: 526,

    height: 33,
  });

  clearPdfArea({
    page,

    x: 49,

    top: 324.5,

    width: 526,

    height: 205.5,
  });

  clearPdfArea({
    page,

    x: 49,

    top: 597.5,

    width: 526,

    height: 75.5,
  });

  // =========================================================
  // AGREEMENT DATE
  // =========================================================

  drawSingleLine({
    page,

    top: 96.5,

    height: 14,

    font,

    text: `This Agreement is electronically executed on ${formatIndianDate(
      data.agreementDate,
    )} between:`,
  });

  // =========================================================
  // FRACTION OWNER DETAILS
  // =========================================================

  drawRichWrappedBlock({
    page,

    top: 235.4,

    height: 29,

    maxLines: 2,

    segments: [
      {
        text: `${data.fullLegalName},`,

        font: boldFont,
      },

      {
        text: " residing at ",

        font,
      },

      {
        text: `${data.fullAddress},`,

        font: boldFont,
      },

      {
        text: " bearing PAN ",

        font,
      },

      {
        text: `${data.pan},`,

        font: boldFont,
      },

      {
        text: " mobile number ",

        font,
      },

      {
        text: `${data.mobile},`,

        font: boldFont,
      },

      {
        text: " and email address ",

        font,
      },

      {
        text: `${data.email},`,

        font: boldFont,
      },

      {
        text: ' hereinafter referred to as the "Fraction Owner".',

        font,
      },
    ],
  });

  // =========================================================
  // ASSET DETAILS
  // =========================================================

  drawSingleLine({
    page,

    top: 326.2,

    font,

    text: `Asset Name: ${data.assetName}`,
  });

  drawSingleLine({
    page,

    top: 340.6,

    font,

    text: `Asset Code: ${data.assetCode}`,
  });

  // =========================================================
  // LEGAL NAME
  // =========================================================

  drawInlineSegments({
    page,

    x: 51.25,

    top: 355.1,

    width: 510,

    height: 13.5,

    fontSize: 9.5,

    segments: [
      {
        text: "Legal Name: ",

        font,
      },

      {
        text: data.fullLegalName,

        font: boldFont,
      },
    ],
  });

  drawSingleLine({
    page,

    top: 369.5,

    font,

    text: `Total Asset Value: INR ${formatAmount(data.totalAssetValue)}`,
  });

  drawSingleLine({
    page,

    top: 384.0,

    font,

    text: `Total Number of fractions: ${data.totalFractions}`,
  });

  drawSingleLine({
    page,

    top: 398.4,

    font,

    text: `Amount Per Fraction: INR ${formatAmount(data.amountPerFraction)}`,
  });

  drawSingleLine({
    page,

    top: 412.9,

    font,

    text: `Number of Fractions Acquired: ${data.fractionsAcquired}`,
  });

  drawSingleLine({
    page,

    top: 427.3,

    font,

    text: `Total Amount Paid: INR ${formatAmount(data.totalAmountPaid)}`,
  });

  drawSingleLine({
    page,

    top: 441.9,

    font,

    text: `Acquisition Date: ${formatIndianDate(data.acquisitionDate)}`,
  });

  // =========================================================
  // RENTAL DETAILS
  // =========================================================

  drawSingleLine({
    page,

    top: 456.3,

    width: 510,

    maxFontSize: 9,

    minFontSize: 7,

    font,

    text: `Fixed Monthly Rental per Fraction: INR ${formatAmount(
      data.rentalPerFraction,
    )}`,
  });

  drawSingleLine({
    page,

    top: 470.8,

    width: 510,

    maxFontSize: 9,

    minFontSize: 7,

    font,

    text: `Total Fixed Monthly Rental: INR ${formatAmount(
      data.totalMonthlyRental,
    )}`,
  });

  drawSingleLine({
    page,

    top: 485.2,

    font,

    text: `Rental Commencement Date: ${formatIndianDate(
      data.rentalCommencementDate,
    )}`,
  });

  drawSingleLine({
    page,

    top: 499.6,

    font,

    text: `Rental Term: ${data.rentalTermMonths} months`,
  });

  drawSingleLine({
    page,

    top: 514.1,

    font,

    text: `Rental Expiry Date: ${formatIndianDate(data.rentalExpiryDate)}`,
  });

  // =========================================================
  // BANK DETAILS
  // =========================================================

  drawSingleLine({
    page,

    top: 599.4,

    font,

    text: `Account Holder Name: ${data.accountHolderName}`,
  });

  drawSingleLine({
    page,

    top: 613.8,

    font,

    text: `Bank Name: ${data.bankName}`,
  });

  // Full account number visible in agreement
  drawSingleLine({
    page,

    top: 628.3,

    font,

    text: `Account Number: ${data.accountNumber}`,
  });

  drawSingleLine({
    page,

    top: 642.7,

    font,

    text: `IFSC Code: ${data.ifscCode}`,
  });

  drawSingleLine({
    page,

    top: 657.2,

    font,

    text: `Account Type: ${data.accountType}`,
  });
};

// ============================================================
// PAGE 2
// ============================================================

const fillPageTwo = ({ page, data, font }) => {
  clearPdfArea({
    page,

    x: 49,

    top: 567,

    width: 527,

    height: 32.5,
  });

  drawWrappedBlock({
    page,

    top: 568.7,

    width: 510,

    height: 29,

    maxLines: 2,

    maxFontSize: 9.25,

    minFontSize: 6.25,

    lineGap: 3.1,

    font,

    text: `The Company shall pay the Fraction Owner a fixed monthly rental of INR ${formatAmount(
      data.totalMonthlyRental,
    )} (Rupees ${numberToIndianWords(
      data.totalMonthlyRental,
    )} Only) for the acquired fractions during the agreed rental term.`,
  });
};

// ============================================================
// PAGE 6
// ============================================================

const fillPageSix = ({ page, data, font, boldFont, italicFont }) => {
  // =========================================================
  // FRACTION OWNER NAME
  // =========================================================

  clearPdfArea({
    page,

    x: 346,

    top: 164.5,

    width: 220,

    height: 17,
  });

  drawInlineSegments({
    page,

    x: 346.5,

    top: 167.2,

    width: 215,

    height: 13.5,

    fontSize: 8.5,

    segments: [
      {
        text: "Name: ",

        font: boldFont,
      },

      {
        text: data.fullLegalName,

        font: boldFont,
      },
    ],
  });

  // =========================================================
  // FRACTION OWNER PAN
  // =========================================================

  clearPdfArea({
    page,

    x: 346,

    top: 181.5,

    width: 220,

    height: 17,
  });

  drawInlineSegments({
    page,

    x: 346.5,

    top: 184.3,

    width: 215,

    height: 13.5,

    fontSize: 8.5,

    segments: [
      {
        text: "PAN No : ",

        font: boldFont,
      },

      {
        text: data.pan,

        font: boldFont,
      },
    ],
  });

  // =========================================================
  // PAYMENT DATE & TIME
  // =========================================================

  const paymentDateTime = formatIndianDateTimeCompact(data.paymentDate);

  // =========================================================
  // COMPANY DATE & TIME
  //
  // Clear old template Date & Time completely so duplicate
  // "Date & Date & Time" does not appear.
  // =========================================================

  clearPdfArea({
    page,

    x: 34,

    top: 196.5,

    width: 245,

    height: 19,
  });

  drawInlineSegments({
    page,

    x: 35,

    top: 199.5,

    width: 240,

    height: 15,

    fontSize: 8.2,

    segments: [
      {
        text: "Date & Time : ",

        font: boldFont,
      },

      {
        text: paymentDateTime,

        font: boldFont,
      },
    ],
  });

  // =========================================================
  // FRACTION OWNER DATE & TIME
  // =========================================================

  clearPdfArea({
    page,

    x: 346,

    top: 196.5,

    width: 225,

    height: 19,
  });

  drawInlineSegments({
    page,

    x: 347,

    top: 199.5,

    width: 220,

    height: 15,

    fontSize: 8.2,

    segments: [
      {
        text: "Date & Time : ",

        font: boldFont,
      },

      {
        text: paymentDateTime,

        font: boldFont,
      },
    ],
  });

  // =========================================================
  // GENERATED DATE / TIME
  // =========================================================

  const generatedDate = formatGeneratedDate(data.generatedAt);

  const generatedTime = formatGeneratedTime(data.generatedAt);

  // =========================================================
  // SIGNING DATE / TIME
  //
  // signed timestamp = payment timestamp.
  // =========================================================

  const signingDate = formatIndianDate(data.paymentDate);

  const signingTime = `${formatIndianTime(data.paymentDate)} IST`;

  // =========================================================
  // CLEAR OLD SIGNING PLACEHOLDERS
  // =========================================================

  clearPdfArea({
    page,

    x: 50,

    top: 267,

    width: 526,

    height: 32,
  });

  // =========================================================
  // GENERATED / SIGNED LINE
  // =========================================================

  drawWrappedBlock({
    page,

    x: 52.5,

    top: 268.4,

    width: 520,

    height: 29,

    maxLines: 2,

    maxFontSize: 7.5,

    minFontSize: 6,

    lineGap: 2.7,

    font: italicFont,

    text: `This Agreement was generated on ${generatedDate} at ${generatedTime} and digitally signed on ${signingDate} at ${signingTime}.`,
  });
};

// ============================================================
// MAIN AGREEMENT PDF GENERATOR
// ============================================================

export const generateAgreementPdf = async (purchaseHistoryId, formData) => {
  let purchase = null;

  /*
   * If user already generated an agreement before,
   * keep its URL so that a failed regeneration does not
   * destroy the previous successful agreement.
   */

  let previousAgreementUrl = null;

  /*
   * Capture generation time exactly once.
   */

  const generatedAt = getIndianTime();

  try {
    // ======================================================
    // PURCHASE HISTORY
    // ======================================================

    purchase = await PurchaseHistory.findById(purchaseHistoryId).select(
      "+documentGenerationError",
    );

    if (!purchase) {
      const error = new Error("Purchase history not found");

      error.statusCode = 404;

      throw error;
    }

    // ======================================================
    // PAYMENT MUST BE SUCCESS
    // ======================================================

    if (purchase.paymentStatus !== "SUCCESS") {
      const error = new Error(
        "Agreement can only be generated after successful payment",
      );

      error.statusCode = 400;

      throw error;
    }

    // ======================================================
    // PAID AT REQUIRED
    // ======================================================

    if (!purchase.paidAt) {
      const error = new Error(
        "Payment date is not available in purchase history",
      );

      error.statusCode = 400;

      throw error;
    }

    // ======================================================
    // FORM DATA REQUIRED
    // ======================================================

    if (!formData) {
      const error = new Error("Agreement form data is required");

      error.statusCode = 400;

      throw error;
    }

    if (
      !formData.fullLegalName ||
      !formData.fullAddress ||
      !formData.pan ||
      !formData.mobile ||
      !formData.email
    ) {
      const error = new Error("Complete agreement form details are required");

      error.statusCode = 400;

      throw error;
    }

    // ======================================================
    // MULTIPLE PDF GENERATION
    //
    // COMPLETED agreement DOES NOT block regeneration.
    // ======================================================

    previousAgreementUrl = purchase.documents?.digitalAgreement?.url || null;

    // ======================================================
    // MARK PROCESSING
    // ======================================================

    purchase.documentGenerationStatus = "PROCESSING";

    purchase.documentGenerationError = null;

    await purchase.save();

    // ======================================================
    // ASSET
    // ======================================================

    const asset = await Asset.findById(purchase.assetId);

    if (!asset) {
      const error = new Error("Asset not found");

      error.statusCode = 404;

      throw error;
    }

    // ======================================================
    // BANK ACCOUNT
    // ======================================================

    let bankAccount = null;

    if (purchase.bankAccountId) {
      bankAccount = await BankAccount.findById(purchase.bankAccountId).lean();
    }

    if (!bankAccount && !formData.bankDetails) {
      const error = new Error(
        "Bank account details are not available for agreement generation",
      );

      error.statusCode = 400;

      throw error;
    }

    // ======================================================
    // BUILD AGREEMENT DATA
    // ======================================================

    const agreementData = buildAgreementData({
      purchase,

      asset,

      bankAccount,

      formData,

      generatedAt,
    });

    // ======================================================
    // READ TEMPLATE
    // ======================================================

    const templateBytes = await fs.readFile(AGREEMENT_TEMPLATE_PATH);

    // ======================================================
    // LOAD PDF
    // ======================================================

    const pdfDoc = await PDFDocument.load(templateBytes, {
      updateMetadata: false,
    });

    const pages = pdfDoc.getPages();

    if (pages.length !== 6) {
      throw new Error(
        `Invalid agreement template. Expected 6 pages but found ${pages.length}.`,
      );
    }

    // ======================================================
    // FONTS
    // ======================================================

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // ======================================================
    // PAGE 1
    // ======================================================

    fillPageOne({
      page: pages[0],

      data: agreementData,

      font,

      boldFont,
    });

    // ======================================================
    // PAGE 2
    // ======================================================

    fillPageTwo({
      page: pages[1],

      data: agreementData,

      font,
    });

    /*
     * Pages 3, 4 and 5 have no dynamic placeholders
     * in the current template.
     */

    // ======================================================
    // PAGE 6
    // ======================================================

    fillPageSix({
      page: pages[5],

      data: agreementData,

      font,

      boldFont,

      italicFont,
    });

    /*
     * Do not flatten existing AcroForm / signature fields.
     */

    // ======================================================
    // SAVE PDF
    // ======================================================

    const pdfBytes = await pdfDoc.save();

    const pdfBuffer = Buffer.from(pdfBytes);

    // ======================================================
    // AGREEMENT NUMBER
    // ======================================================

    const suffix = purchase._id.toString().slice(-10).toUpperCase();

    const agreementNumber = `BND-AGR-${suffix}`;

    // ======================================================
    // UNIQUE FILE NAME
    //
    // Multiple generation ke liye same ImageKit filename
    // use nahi karenge.
    // ======================================================

    const generationId = Date.now();

    const fileName = `${agreementNumber}-${generationId}.pdf`;

    // ======================================================
    // IMAGEKIT UPLOAD
    // ======================================================

    const uploadedPdf = await uploadAgreementPdf(
      pdfBuffer,

      fileName,
    );

    if (!uploadedPdf?.url) {
      throw new Error("Agreement PDF URL was not returned by ImageKit");
    }

    // ======================================================
    // SAVE LATEST AGREEMENT URL
    //
    // Existing URL can be overwritten.
    // ======================================================

    purchase.documents = purchase.documents || {};

    purchase.documents.digitalAgreement = {
      url: uploadedPdf.url,
    };

    purchase.documentGenerationStatus = "COMPLETED";

    purchase.documentGenerationError = null;

    await purchase.save();

    // ======================================================
    // SUCCESS
    // ======================================================

    return {
      success: true,

      purchaseId: purchase._id,

      documentGenerationStatus: purchase.documentGenerationStatus,

      digitalAgreement: {
        url: uploadedPdf.url,
      },

      generatedAt,
    };
  } catch (error) {
    console.error("GENERATE AGREEMENT PDF ERROR:", error);

    // ======================================================
    // FAILURE HANDLING
    //
    // Previous PDF exists:
    // -> keep COMPLETED
    //
    // First generation failed:
    // -> FAILED
    // ======================================================

    if (purchase?._id) {
      try {
        const fallbackAgreementUrl =
          previousAgreementUrl ||
          purchase.documents?.digitalAgreement?.url ||
          null;

        const fallbackStatus = fallbackAgreementUrl ? "COMPLETED" : "FAILED";

        await PurchaseHistory.findByIdAndUpdate(
          purchase._id,

          {
            $set: {
              documentGenerationStatus: fallbackStatus,

              documentGenerationError: error.message,
            },
          },
        );
      } catch (statusUpdateError) {
        console.error("FAILED TO UPDATE DOCUMENT STATUS:", statusUpdateError);
      }
    }

    throw error;
  }
};
