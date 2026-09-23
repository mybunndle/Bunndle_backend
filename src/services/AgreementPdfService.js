import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import PurchaseHistory from "../model/purchaseHistoryModel.js";
import Asset from "../model/coAssetModel.js";

import { uploadAgreementPdf } from "./imageStorageService.js";

// ============================================================
// TEMPLATE PATH
// ============================================================

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const AGREEMENT_TEMPLATE_PATH = path.join(
  __dirname,
  "../templates/Asset_Fraction_Ownership_Agreement.pdf",
);

// ============================================================
// INDIAN TIME
// Keeping your existing project logic unchanged.
// ============================================================

const getIndianTime = () => {
  const istOffset = 5.5 * 60 * 60 * 1000;

  return new Date(Date.now() + istOffset);
};

// ============================================================
// DATE FORMATTER
// ============================================================

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",

    /*
     * Because your project manually adds +5:30
     * while storing dates, UTC formatting prevents
     * another +5:30 from being added here.
     */
    timeZone: "UTC",
  }).format(date);
};

// ============================================================
// AMOUNT FORMATTER
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
// ADD MONTHS
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

// ============================================================
// HELPERS
// ============================================================

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
// PDF AREA CLEAR
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

// ============================================================
// SINGLE LINE DRAW
// ============================================================

const drawSingleLine = ({
  page,
  text,

  x = 54,
  top,

  width = 487,
  height = 12,

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

// ============================================================
// MULTILINE DRAW
// ============================================================

const drawWrappedBlock = ({
  page,
  text,

  x = 54,
  top,

  width = 487,
  height = 28,

  font,

  maxLines = 2,

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

  const lineHeight = fontSize + 4;

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
// BUILD AGREEMENT DATA
//
// formData comes directly from controller.
// We are NOT adding agreementFormData into PurchaseHistory.
// ============================================================

const buildAgreementData = ({ purchase, asset, formData }) => {
  if (!formData) {
    throw new Error("Agreement form data is required");
  }

  // =========================================================
  // USER FORM VALUES
  // =========================================================

  const fullLegalName = requiredValue(
    formData.fullLegalName,
    "Full Legal Name",
  );

  const fullAddress = requiredValue(formData.fullAddress, "Full Address");

  const pan = requiredValue(formData.pan, "PAN");

  const mobile = requiredValue(formData.mobile, "Mobile");

  const email = requiredValue(formData.email, "Email");

  // =========================================================
  // FRACTIONS
  // =========================================================

  const totalFractions = Number(
    firstValue(
      purchase.assetSnapshot?.totalFractions,

      asset.totalFractions,
    ),
  );

  if (!totalFractions || totalFractions <= 0) {
    throw new Error("Asset totalFractions is missing");
  }

  const ownershipPercentage = (
    (Number(purchase.fractionsPurchased) / totalFractions) *
    100
  ).toFixed(2);

  // =========================================================
  // EXECUTION PLACE
  // =========================================================

  const executionPlace = requiredValue(
    process.env.AGREEMENT_EXECUTION_PLACE,

    "AGREEMENT_EXECUTION_PLACE",
  );

  // =========================================================
  // ASSET CODE
  // =========================================================

  const assetCode = requiredValue(
    firstValue(
      purchase.assetSnapshot?.assetCode,

      asset.assetCode,
    ),

    "Asset Code",
  );

  // =========================================================
  // REGISTERED OWNER
  // =========================================================

  const registeredLegalOwner = requiredValue(
    firstValue(
      asset.registeredLegalOwner,

      process.env.AGREEMENT_REGISTERED_LEGAL_OWNER,
    ),

    "Registered Legal Owner",
  );

  // =========================================================
  // TRANSFER DOCUMENTS
  // =========================================================

  const ownershipTransferDocuments = requiredValue(
    firstValue(
      asset.ownershipTransferDocuments,

      process.env.AGREEMENT_TRANSFER_DOCUMENTS,
    ),

    "Ownership/Transfer Documents",
  );

  // =========================================================
  // REFUND DAYS
  // =========================================================

  const refundBusinessDays = Number(
    process.env.AGREEMENT_REFUND_BUSINESS_DAYS || 7,
  );

  // =========================================================
  // EARLY EXIT MONTHS
  // =========================================================

  const earlyExitChargeMonths = Number(
    process.env.AGREEMENT_EARLY_EXIT_CHARGE_MONTHS || 1,
  );

  if (![1, 2].includes(earlyExitChargeMonths)) {
    throw new Error("AGREEMENT_EARLY_EXIT_CHARGE_MONTHS must be 1 or 2");
  }

  // =========================================================
  // SETTLEMENT DAYS
  // =========================================================

  const settlementBusinessDays = Number(
    process.env.AGREEMENT_SETTLEMENT_BUSINESS_DAYS || 7,
  );

  // =========================================================
  // SALE PROCEDURE
  // =========================================================

  const saleApprovalProcedure =
    process.env.AGREEMENT_SALE_APPROVAL_PROCEDURE ||
    "Written notice to applicable Fraction Owners";

  // =========================================================
  // COMPANY SIGNATORY
  // =========================================================

  const companySignatoryName =
    process.env.AGREEMENT_COMPANY_SIGNATORY_NAME || "Authorised Signatory";

  const companySignatoryDesignation =
    process.env.AGREEMENT_COMPANY_SIGNATORY_DESIGNATION ||
    "Authorised Signatory";

  // =========================================================
  // ACQUISITION
  // =========================================================

  const acquisitionAmount = Number(purchase.totalAmount || 0);

  const acquisitionTaxesAndCharges = Number(
    firstValue(
      asset.acquisitionTaxesAndCharges,

      process.env.AGREEMENT_ACQUISITION_TAXES_AND_CHARGES,

      0,
    ),
  );

  const totalAcquisitionPayment =
    acquisitionAmount + acquisitionTaxesAndCharges;

  /*
   * Existing flow:
   * payment success -> ownership allocation.
   *
   * So paidAt is currently used as
   * acquisition date.
   */
  const acquisitionDate = purchase.paidAt;

  // =========================================================
  // RENTAL
  // =========================================================

  const rentalCommencementDate = firstValue(
    asset.rentalCommencementDate,

    purchase.rentalCommencementDate,

    acquisitionDate,
  );

  const rentalTermMonths = Number(purchase.assetSnapshot?.durationMonths || 0);

  const rentalExpiryDate = addMonths(rentalCommencementDate, rentalTermMonths);

  // =========================================================
  // FINAL DATA
  // =========================================================

  return {
    agreementDate: getIndianTime(),

    place: executionPlace,

    // USER FORM

    fullLegalName: fullLegalName.trim(),

    fullAddress: fullAddress.trim(),

    pan: pan.trim().toUpperCase(),

    mobile: String(mobile).trim(),

    email: email.trim().toLowerCase(),

    // ASSET

    assetName: purchase.assetSnapshot?.assetName || asset.assetName || "-",

    assetCode,

    registeredLegalOwner,

    totalAssetValue: purchase.assetSnapshot?.assetCost ?? asset.assetCost ?? 0,

    totalFractions,

    // PURCHASE

    fractionsAcquired: purchase.fractionsPurchased,

    ownershipPercentage,

    acquisitionAmount,

    acquisitionTaxesAndCharges,

    totalAcquisitionPayment,

    acquisitionDate,

    // RENTAL

    rentalPerFraction:
      purchase.assetSnapshot?.rentalAmountPerFraction ??
      asset.rentalAmountPerFraction ??
      0,

    totalMonthlyRental:
      purchase.assetSnapshot?.totalMonthlyRental ??
      Number(
        purchase.assetSnapshot?.rentalAmountPerFraction ??
          asset.rentalAmountPerFraction ??
          0,
      ) * Number(purchase.fractionsPurchased || 0),

    rentalCommencementDate,

    rentalTermMonths,

    rentalExpiryDate,

    // OTHER TERMS

    ownershipTransferDocuments,

    refundBusinessDays,

    earlyExitChargeMonths,

    settlementBusinessDays,

    saleApprovalProcedure,

    companySignatoryName,

    companySignatoryDesignation,
  };
};

// ============================================================
// PAGE 1
// ============================================================

const fillPageOne = ({ page, data, font }) => {
  drawSingleLine({
    page,

    top: 109,

    font,

    text: `This Agreement is made and executed on ${formatDate(
      data.agreementDate,
    )} at ${data.place} between:`,
  });

  // =========================================================
  // FRACTION OWNER DETAILS
  // =========================================================

  drawWrappedBlock({
    page,

    top: 218,

    height: 27,

    maxLines: 2,

    font,

    text: `${data.fullLegalName}, residing at ${data.fullAddress}, bearing PAN ${data.pan}, mobile number ${data.mobile}, and email address ${data.email}, hereinafter referred to as the "Fraction Owner".`,
  });

  // =========================================================
  // ASSET DETAILS
  // =========================================================

  drawSingleLine({
    page,

    top: 327,

    font,

    text: `Asset Name: ${data.assetName}`,
  });

  drawSingleLine({
    page,

    top: 340.5,

    font,

    text: `Asset Code: ${data.assetCode}`,
  });

  drawSingleLine({
    page,

    top: 354,

    font,

    text: `Registered Legal Owner: ${data.registeredLegalOwner}`,
  });

  drawSingleLine({
    page,

    top: 367.5,

    font,

    text: `Total Asset Value: INR ${formatAmount(data.totalAssetValue)}`,
  });

  drawSingleLine({
    page,

    top: 381,

    font,

    text: `Number of Fractions Acquired: ${data.fractionsAcquired}`,
  });

  drawSingleLine({
    page,

    top: 394.5,

    font,

    text: `Ownership Percentage of the Entire Asset: ${data.ownershipPercentage}%`,
  });

  drawSingleLine({
    page,

    top: 408,

    font,

    text: `Acquisition Amount: INR ${formatAmount(data.acquisitionAmount)}`,
  });

  drawSingleLine({
    page,

    top: 421.5,

    font,

    text: `Applicable Acquisition Taxes and Charges: INR ${formatAmount(
      data.acquisitionTaxesAndCharges,
    )}`,
  });

  drawSingleLine({
    page,

    top: 435,

    font,

    text: `Total Acquisition Payment: INR ${formatAmount(
      data.totalAcquisitionPayment,
    )}`,
  });

  drawSingleLine({
    page,

    top: 448.5,

    font,

    text: `Acquisition Date: ${formatDate(data.acquisitionDate)}`,
  });

  drawSingleLine({
    page,

    top: 462,

    font,

    text: `Fixed Monthly Rental per Fraction: INR ${formatAmount(
      data.rentalPerFraction,
    )}`,
  });

  drawSingleLine({
    page,

    top: 475.5,

    font,

    text: `Total Fixed Monthly Rental: INR ${formatAmount(
      data.totalMonthlyRental,
    )}`,
  });

  drawSingleLine({
    page,

    top: 489,

    font,

    text: `Rental Commencement Date: ${formatDate(
      data.rentalCommencementDate,
    )}`,
  });

  drawSingleLine({
    page,

    top: 502.5,

    font,

    text: `Rental Term: ${data.rentalTermMonths} months`,
  });

  drawSingleLine({
    page,

    top: 516,

    font,

    text: `Rental Expiry Date: ${formatDate(data.rentalExpiryDate)}`,
  });

  drawSingleLine({
    page,

    top: 529.5,

    font,

    text: `Ownership/Transfer Documents: ${data.ownershipTransferDocuments}`,
  });
};

// ============================================================
// PAGE 2
// ============================================================

const fillPageTwo = ({ page, data, font }) => {
  // Refund business days

  drawSingleLine({
    page,

    top: 196,

    font,

    text: `received shall be refunded within ${data.refundBusinessDays} business days, without an exit fee.`,
  });

  // Fixed monthly rental

  drawWrappedBlock({
    page,

    top: 349,

    height: 29,

    maxLines: 2,

    font,

    text: `The Company shall pay the Fraction Owner a fixed monthly rental of INR ${formatAmount(
      data.totalMonthlyRental,
    )} (Rupees ${numberToIndianWords(
      data.totalMonthlyRental,
    )} Only) for the acquired fractions during the agreed rental term.`,
  });
};

// ============================================================
// PAGE 3
// ============================================================

const fillPageThree = ({ page, data, font }) => {
  const exitChargeText = data.earlyExitChargeMonths === 1 ? "one" : "two";

  drawWrappedBlock({
    page,

    top: 510,

    height: 29,

    maxLines: 2,

    font,

    text: `An approved early exit may attract a charge equivalent to ${exitChargeText} months of the total fixed monthly rental stated in Clause 1. The applicable option has been selected before signing.`,
  });
};

// ============================================================
// PAGE 4
// ============================================================

const fillPageFour = ({ page, data, font }) => {
  drawWrappedBlock({
    page,

    top: 138,

    height: 29,

    maxLines: 2,

    font,

    text: `Settlement shall be completed within ${data.settlementBusinessDays} business days after receipt of cleared funds and completion of required formalities. An actual third-party transfer shall use the accepted transfer price.`,
  });

  drawSingleLine({
    page,

    top: 209,

    font,

    maxFontSize: 9.5,

    minFontSize: 6,

    text: `${data.saleApprovalProcedure}.`,
  });
};

// ============================================================
// PAGE 5
// ============================================================

const fillPageFive = ({ page, data, font }) => {
  // Company signatory

  drawSingleLine({
    page,

    x: 54,

    top: 546,

    width: 220,

    height: 10,

    maxFontSize: 8,

    minFontSize: 6,

    font,

    text: `Name: ${data.companySignatoryName}`,
  });

  drawSingleLine({
    page,

    x: 54,

    top: 561,

    width: 220,

    height: 10,

    maxFontSize: 8,

    minFontSize: 6,

    font,

    text: `Designation: ${data.companySignatoryDesignation}`,
  });

  // Fraction owner name

  drawSingleLine({
    page,

    x: 308,

    top: 546,

    width: 220,

    height: 10,

    maxFontSize: 8,

    minFontSize: 6,

    font,

    text: `Name: ${data.fullLegalName}`,
  });

  /*
   * We intentionally do not flatten or remove
   * the digital signature fields in the template.
   */
};

// ============================================================
// MAIN AGREEMENT PDF GENERATOR
//
// purchaseHistoryId -> PurchaseHistory
// formData          -> Flutter form values
// ============================================================

export const generateAgreementPdf = async (purchaseHistoryId, formData) => {
  let purchase = null;

  try {
    // =====================================================
    // FIND PURCHASE
    // =====================================================

    purchase = await PurchaseHistory.findById(purchaseHistoryId).select(
      "+documentGenerationError",
    );

    if (!purchase) {
      const error = new Error("Purchase history not found");

      error.statusCode = 404;

      throw error;
    }

    // =====================================================
    // PAYMENT MUST BE SUCCESS
    // =====================================================

    if (purchase.paymentStatus !== "SUCCESS") {
      const error = new Error(
        "Agreement can only be generated after successful payment",
      );

      error.statusCode = 400;

      throw error;
    }

    // =====================================================
    // FORM DATA
    // =====================================================

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

    // =====================================================
    // MARK PDF PROCESSING
    // =====================================================

    purchase.documentGenerationStatus = "PROCESSING";

    purchase.documentGenerationError = null;

    await purchase.save();

    // =====================================================
    // FIND CURRENT ASSET
    // =====================================================

    const asset = await Asset.findById(purchase.assetId);

    if (!asset) {
      throw new Error("Asset not found");
    }

    // =====================================================
    // BUILD DATA
    // =====================================================

    const agreementData = buildAgreementData({
      purchase,
      asset,
      formData,
    });

    // =====================================================
    // READ TEMPLATE
    // =====================================================

    const templateBytes = await fs.readFile(AGREEMENT_TEMPLATE_PATH);

    // =====================================================
    // LOAD PDF
    // =====================================================

    const pdfDoc = await PDFDocument.load(templateBytes, {
      updateMetadata: false,
    });

    const pages = pdfDoc.getPages();

    if (pages.length !== 5) {
      throw new Error(
        `Invalid agreement template. Expected 5 pages but found ${pages.length}.`,
      );
    }

    // =====================================================
    // FONT
    // =====================================================

    /*
     * INR text is used instead of ₹
     * because Standard Helvetica does not
     * reliably support the rupee glyph.
     */
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // =====================================================
    // FILL TEMPLATE
    // =====================================================

    fillPageOne({
      page: pages[0],

      data: agreementData,

      font,
    });

    fillPageTwo({
      page: pages[1],

      data: agreementData,

      font,
    });

    fillPageThree({
      page: pages[2],

      data: agreementData,

      font,
    });

    fillPageFour({
      page: pages[3],

      data: agreementData,

      font,
    });

    fillPageFive({
      page: pages[4],

      data: agreementData,

      font,
    });

    /*
     * IMPORTANT:
     *
     * Don't call:
     *
     * pdfDoc.getForm().flatten()
     *
     * if you want to preserve existing
     * digital signature fields.
     */

    // =====================================================
    // GENERATE PDF
    // =====================================================

    const pdfBytes = await pdfDoc.save();

    const pdfBuffer = Buffer.from(pdfBytes);

    // =====================================================
    // GENERATE FILE NAME
    // =====================================================

    const suffix = purchase._id.toString().slice(-10).toUpperCase();

    const agreementNumber = `BND-AGR-${suffix}`;

    const fileName = `${agreementNumber}.pdf`;

    // =====================================================
    // IMAGEKIT UPLOAD
    // =====================================================

    const uploadedPdf = await uploadAgreementPdf(pdfBuffer, fileName);

    if (!uploadedPdf?.url) {
      throw new Error("Agreement PDF URL was not returned by ImageKit");
    }

    // =====================================================
    // SAVE ONLY URL IN PURCHASE HISTORY
    //
    // Actual PDF -> ImageKit
    // MongoDB     -> only URL
    // =====================================================

    purchase.documents = purchase.documents || {};

    purchase.documents.digitalAgreement = {
      url: uploadedPdf.url,
    };

    // =====================================================
    // STATUS
    // =====================================================

    purchase.documentGenerationStatus = "COMPLETED";

    purchase.documentGenerationError = null;

    // =====================================================
    // SAVE PURCHASE
    // =====================================================

    await purchase.save();

    // =====================================================
    // RESPONSE
    // =====================================================

    return {
      success: true,

      purchaseId: purchase._id,

      documentGenerationStatus: purchase.documentGenerationStatus,

      digitalAgreement: {
        url: uploadedPdf.url,
      },
    };
  } catch (error) {
    console.error("GENERATE AGREEMENT PDF ERROR:", error);

    // =====================================================
    // PDF FAILURE MUST NOT CHANGE PAYMENT SUCCESS
    // =====================================================

    if (purchase?._id) {
      try {
        await PurchaseHistory.findByIdAndUpdate(
          purchase._id,

          {
            $set: {
              documentGenerationStatus: "FAILED",

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
