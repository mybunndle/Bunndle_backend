import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

import PurchaseHistory from "../model/purchaseHistoryModel.js";

import {
  uploadPaymentReceiptPdf,
} from "./imageStorageService.js";


// ============================================================
// DATE FORMATTER
// ============================================================

const formatDateTime = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        true,

      timeZone:
        "UTC",
    }
  ).format(date);
};


// ============================================================
// AMOUNT FORMATTER
// ============================================================

const formatAmount = (
  value
) => {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  );
};


// ============================================================
// SAFE VALUE
// ============================================================

const safeValue = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "-";
  }

  return String(value);
};


// ============================================================
// DRAW KEY VALUE ROW
// ============================================================

const drawRow = ({
  page,
  font,
  boldFont,
  label,
  value,
  y,
}) => {
  page.drawText(
    label,
    {
      x:
        55,

      y,

      size:
        10,

      font:
        boldFont,

      color:
        rgb(
          0,
          0,
          0
        ),
    }
  );


  page.drawText(
    safeValue(value),
    {
      x:
        210,

      y,

      size:
        10,

      font,

      color:
        rgb(
          0,
          0,
          0
        ),
    }
  );
};


// ============================================================
// GENERATE PAYMENT RECEIPT
// ============================================================

export const generatePaymentReceiptPdf =
  async (
    purchaseHistoryId
  ) => {
    let purchase =
      null;

    try {

      // ======================================================
      // FIND PURCHASE
      // ======================================================

      purchase =
        await PurchaseHistory
          .findById(
            purchaseHistoryId
          );


      if (!purchase) {
        const error =
          new Error(
            "Purchase history not found"
          );

        error.statusCode =
          404;

        throw error;
      }


      // ======================================================
      // PAYMENT MUST BE SUCCESS
      // ======================================================

      if (
        purchase.paymentStatus !==
        "SUCCESS"
      ) {
        const error =
          new Error(
            "Payment receipt can only be generated after successful payment"
          );

        error.statusCode =
          400;

        throw error;
      }


      // ======================================================
      // CREATE PDF
      // ======================================================

      const pdfDoc =
        await PDFDocument.create();


      const page =
        pdfDoc.addPage([
          595.28,
          841.89,
        ]);


      const {
        width,
        height,
      } =
        page.getSize();


      const font =
        await pdfDoc.embedFont(
          StandardFonts.Helvetica
        );


      const boldFont =
        await pdfDoc.embedFont(
          StandardFonts
            .HelveticaBold
        );


      // ======================================================
      // HEADER
      // ======================================================

      page.drawText(
        "BUNNDLE",
        {
          x:
            55,

          y:
            height - 70,

          size:
            22,

          font:
            boldFont,

          color:
            rgb(
              0,
              0,
              0
            ),
        }
      );


      page.drawText(
        "Agent Alliance Private Limited",
        {
          x:
            55,

          y:
            height - 92,

          size:
            10,

          font,

          color:
            rgb(
              0,
              0,
              0
            ),
        }
      );


      page.drawText(
        "PAYMENT RECEIPT",
        {
          x:
            width - 220,

          y:
            height - 70,

          size:
            16,

          font:
            boldFont,

          color:
            rgb(
              0,
              0,
              0
            ),
        }
      );


      page.drawLine({
        start: {
          x:
            55,

          y:
            height - 115,
        },

        end: {
          x:
            width - 55,

          y:
            height - 115,
        },

        thickness:
          1,

        color:
          rgb(
            0.7,
            0.7,
            0.7
          ),
      });


      // ======================================================
      // RECEIPT NUMBER
      // ======================================================

      const receiptNumber =
        `BND-RCP-${purchase._id
          .toString()
          .slice(-10)
          .toUpperCase()}`;


      let y =
        height - 155;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Receipt Number",

        value:
          receiptNumber,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Transaction Ref.",

        value:
          purchase.transactionReference,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Payment Date",

        value:
          formatDateTime(
            purchase.paidAt
          ),

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Payment Status",

        value:
          purchase.paymentStatus,

        y,
      });


      // ======================================================
      // CUSTOMER DETAILS
      // ======================================================

      y -= 50;


      page.drawText(
        "Customer Details",
        {
          x:
            55,

          y,

          size:
            13,

          font:
            boldFont,

          color:
            rgb(
              0,
              0,
              0
            ),
        }
      );


      y -= 30;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Name",

        value:
          purchase
            .userSnapshot
            ?.name,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Email",

        value:
          purchase
            .userSnapshot
            ?.email,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Mobile",

        value:
          purchase
            .userSnapshot
            ?.phone,

        y,
      });


      // ======================================================
      // ASSET DETAILS
      // ======================================================

      y -= 50;


      page.drawText(
        "Asset Details",
        {
          x:
            55,

          y,

          size:
            13,

          font:
            boldFont,

          color:
            rgb(
              0,
              0,
              0
            ),
        }
      );


      y -= 30;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Asset Name",

        value:
          purchase
            .assetSnapshot
            ?.assetName,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Asset Code",

        value:
          purchase
            .assetSnapshot
            ?.assetCode,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Fractions Acquired",

        value:
          purchase
            .fractionsPurchased,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Amount / Fraction",

        value:
          `INR ${formatAmount(
            purchase.amountPerFraction
          )}`,

        y,
      });


      // ======================================================
      // PAYMENT DETAILS
      // ======================================================

      y -= 50;


      page.drawText(
        "Payment Details",
        {
          x:
            55,

          y,

          size:
            13,

          font:
            boldFont,

          color:
            rgb(
              0,
              0,
              0
            ),
        }
      );


      y -= 30;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Total Amount",

        value:
          `INR ${formatAmount(
            purchase.totalAmount
          )}`,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Currency",

        value:
          purchase.currency ||
          "INR",

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Payment Method",

        value:
          purchase.paymentMethod,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Razorpay Order ID",

        value:
          purchase
            .razorpayOrderId,

        y,
      });


      y -= 25;


      drawRow({
        page,
        font,
        boldFont,

        label:
          "Razorpay Payment ID",

        value:
          purchase
            .razorpayPaymentId,

        y,
      });


      // ======================================================
      // TOTAL BOX
      // ======================================================

      y -= 55;


      page.drawRectangle({
        x:
          55,

        y:
          y - 15,

        width:
          width - 110,

        height:
          45,

        borderWidth:
          1,

        borderColor:
          rgb(
            0.2,
            0.2,
            0.2
          ),
      });


      page.drawText(
        "TOTAL PAID",
        {
          x:
            70,

          y,

          size:
            12,

          font:
            boldFont,
        }
      );


      const totalText =
        `INR ${formatAmount(
          purchase.totalAmount
        )}`;


      page.drawText(
        totalText,
        {
          x:
            width - 190,

          y,

          size:
            13,

          font:
            boldFont,
        }
      );


      // ======================================================
      // FOOTER
      // ======================================================

      page.drawLine({
        start: {
          x:
            55,

          y:
            100,
        },

        end: {
          x:
            width - 55,

          y:
            100,
        },

        thickness:
          0.5,

        color:
          rgb(
            0.7,
            0.7,
            0.7
          ),
      });


      page.drawText(
        "This is a system-generated payment receipt.",
        {
          x:
            55,

          y:
            80,

          size:
            8,

          font,
        }
      );


      page.drawText(
        "No physical signature is required.",
        {
          x:
            55,

          y:
            65,

          size:
            8,

          font,
        }
      );


      // ======================================================
      // SAVE PDF
      // ======================================================

      const pdfBytes =
        await pdfDoc.save();


      const pdfBuffer =
        Buffer.from(
          pdfBytes
        );


      // ======================================================
      // FILE NAME
      // ======================================================

      const fileName =
        `${receiptNumber}.pdf`;


      // ======================================================
      // IMAGEKIT
      // ======================================================

      const uploadedReceipt =
        await uploadPaymentReceiptPdf(
          pdfBuffer,
          fileName
        );


      if (
        !uploadedReceipt?.url
      ) {
        throw new Error(
          "Payment receipt URL was not returned by ImageKit"
        );
      }


      // ======================================================
      // SAVE ONLY URL
      // ======================================================

      purchase.documents =
        purchase.documents ||
        {};


      purchase.documents.paymentReceipt =
        {
          url:
            uploadedReceipt.url,
        };


      await purchase.save();


      // ======================================================
      // RESPONSE
      // ======================================================

      return {
        success:
          true,

        purchaseId:
          purchase._id,

        paymentReceipt: {
          url:
            uploadedReceipt.url,
        },
      };

    } catch (error) {
      console.error(
        "GENERATE PAYMENT RECEIPT ERROR:",
        error
      );


      /*
       * IMPORTANT:
       *
       * Payment receipt generation failure
       * must never change paymentStatus
       * from SUCCESS.
       */

      throw error;
    }
  };