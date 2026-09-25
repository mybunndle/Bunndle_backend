import mongoose from "mongoose";

import PurchaseHistory from "../model/purchaseHistoryModel.js";
import BankAccount from "../model/bankAccountModel.js";

import { encryptBankAccount } from "../utils/bankEncryption.js";
import {generateAgreementPdf} from "../services/agreement_pdf_service.js";


//   try {
//     // ========================================================
//     // USER
//     // ========================================================

//     const userId = req.user.id;

//     // ========================================================
//     // PARAMS
//     // ========================================================

//     const { purchaseId } = req.params;

//     // ========================================================
//     // BODY
//     // ========================================================

//     const {
//       fullLegalName,
//       fullAddress,
//       pan,
//       mobile,
//       email,

//       bankDetails,

//       acceptedTerms,
//     } = req.body;

//     // ========================================================
//     // PURCHASE ID VALIDATION
//     // ========================================================

//     if (!mongoose.isValidObjectId(purchaseId)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid purchase id",
//       });
//     }

//     // ========================================================
//     // REQUIRED AGREEMENT DETAILS
//     // ========================================================

//     if (
//       !fullLegalName?.trim() ||
//       !fullAddress?.trim() ||
//       !pan?.trim() ||
//       !mobile ||
//       !email?.trim()
//     ) {
//       return res.status(400).json({
//         success: false,

//         message: "Full legal name, address, PAN, mobile and email are required",
//       });
//     }

//     // ========================================================
//     // NORMALIZE USER VALUES
//     // ========================================================

//     const normalizedName = fullLegalName.trim();

//     const normalizedAddress = fullAddress.trim();

//     const normalizedPan = pan.trim().toUpperCase();

//     const normalizedEmail = email.trim().toLowerCase();

//     const normalizedMobile = String(mobile).replace(/\D/g, "");

//     // ========================================================
//     // PAN VALIDATION
//     // ========================================================

//     const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

//     if (!panRegex.test(normalizedPan)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid PAN number",
//       });
//     }

//     // ========================================================
//     // EMAIL VALIDATION
//     // ========================================================

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//     if (!emailRegex.test(normalizedEmail)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid email address",
//       });
//     }

//     // ========================================================
//     // MOBILE VALIDATION
//     // ========================================================

//     if (normalizedMobile.length < 10 || normalizedMobile.length > 15) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid mobile number",
//       });
//     }

//     // ========================================================
//     // TERMS ACCEPTANCE
//     // ========================================================

//     if (acceptedTerms !== true) {
//       return res.status(400).json({
//         success: false,

//         message: "Agreement terms must be accepted",
//       });
//     }

//     // ========================================================
//     // BANK DETAILS VALIDATION
//     // ========================================================

//     if (
//       !bankDetails ||
//       !bankDetails.accountHolderName?.trim() ||
//       !bankDetails.accountNumber ||
//       !bankDetails.ifscCode?.trim()
//     ) {
//       return res.status(400).json({
//         success: false,

//         message: "Complete bank details are required",
//       });
//     }

//     // ========================================================
//     // NORMALIZE BANK VALUES
//     // ========================================================

//     const accountHolderName = bankDetails.accountHolderName.trim();

//     const accountNumber = String(bankDetails.accountNumber).replace(/\s+/g, "");

//     const normalizedIfsc = bankDetails.ifscCode.trim().toUpperCase();

//     const normalizedBankName = bankDetails.bankName?.trim() || null;

//     const accountType = String(bankDetails.accountType || "SAVINGS")
//       .trim()
//       .toUpperCase();

//     // ========================================================
//     // BANK ACCOUNT NUMBER VALIDATION
//     // ========================================================

//     const accountNumberRegex = /^\d{9,18}$/;

//     if (!accountNumberRegex.test(accountNumber)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid bank account number",
//       });
//     }

//     // ========================================================
//     // IFSC VALIDATION
//     // ========================================================

//     const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

//     if (!ifscRegex.test(normalizedIfsc)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid IFSC code",
//       });
//     }

//     // ========================================================
//     // ACCOUNT TYPE VALIDATION
//     // ========================================================

//     if (!["SAVINGS", "CURRENT"].includes(accountType)) {
//       return res.status(400).json({
//         success: false,

//         message: "Account type must be SAVINGS or CURRENT",
//       });
//     }

//     // ========================================================
//     // FIND SUCCESSFUL PURCHASE
//     // ========================================================

//     const existingPurchase = await PurchaseHistory.findOne({
//       _id: purchaseId,

//       userId,

//       paymentStatus: "SUCCESS",
//     });

//     if (!existingPurchase) {
//       return res.status(404).json({
//         success: false,

//         message: "Successful purchase not found",
//       });
//     }

//     // ========================================================
//     // PREVENT PARALLEL PDF GENERATION
//     //
//     // We use your existing:
//     // documentGenerationStatus
//     // ========================================================

//     if (existingPurchase.documentGenerationStatus === "PROCESSING") {
//       return res.status(409).json({
//         success: false,

//         message: "Agreement PDF generation is already in progress",
//       });
//     }

//     // ========================================================
//     // ENCRYPT BANK ACCOUNT
//     // ========================================================

//     const encryptedAccountNumber = encryptBankAccount(accountNumber);

//     const last4 = accountNumber.slice(-4);

//     // ========================================================
//     // TRANSACTION
//     //
//     // Save:
//     // 1. Bank account
//     // 2. bankAccountId in PurchaseHistory
//     //
//     // We are NOT storing agreement form fields
//     // in PurchaseHistory.
//     // ========================================================

//     let purchase = null;

//     let bankAccount = null;

//     await session.withTransaction(async () => {
//       // ====================================================
//       // GET PURCHASE AGAIN INSIDE TRANSACTION
//       // ====================================================

//       purchase = await PurchaseHistory.findOne({
//         _id: purchaseId,

//         userId,

//         paymentStatus: "SUCCESS",
//       }).session(session);

//       if (!purchase) {
//         const error = new Error("Successful purchase not found");

//         error.statusCode = 404;

//         throw error;
//       }

//       // ====================================================
//       // CHECK PROCESSING AGAIN
//       // ====================================================

//       if (purchase.documentGenerationStatus === "PROCESSING") {
//         const error = new Error(
//           "Agreement PDF generation is already in progress",
//         );

//         error.statusCode = 409;

//         throw error;
//       }

//       // ====================================================
//       // UPDATE EXISTING LINKED BANK ACCOUNT
//       // ====================================================

//       if (purchase.bankAccountId) {
//         bankAccount = await BankAccount.findOneAndUpdate(
//           {
//             _id: purchase.bankAccountId,

//             userId,
//           },

//           {
//             $set: {
//               accountHolderName,

//               accountNumberEncrypted: encryptedAccountNumber,

//               accountNumberLast4: last4,

//               ifscCode: normalizedIfsc,

//               bankName: normalizedBankName,

//               accountType,

//               verificationStatus: "PENDING",
//             },
//           },

//           {
//             new: true,

//             session,
//           },
//         );
//       }

//       // ====================================================
//       // CREATE BANK ACCOUNT
//       // ====================================================

//       if (!bankAccount) {
//         const bankRecords = await BankAccount.create(
//           [
//             {
//               userId,

//               accountHolderName,

//               accountNumberEncrypted: encryptedAccountNumber,

//               accountNumberLast4: last4,

//               ifscCode: normalizedIfsc,

//               bankName: normalizedBankName,

//               accountType,

//               verificationStatus: "PENDING",

//               isPrimary: true,
//             },
//           ],

//           {
//             session,
//           },
//         );

//         bankAccount = bankRecords[0];
//       }

//       // ====================================================
//       // LINK BANK ACCOUNT TO PURCHASE
//       // ====================================================

//       purchase.bankAccountId = bankAccount._id;

//       await purchase.save({
//         session,
//       });
//     });

//     // ========================================================
//     // GENERATE AGREEMENT PDF
//     //
//     // IMPORTANT:
//     // ImageKit/PDF work is outside MongoDB transaction.
//     // ========================================================

//     const agreement = await generateAgreementPdf(
//       purchase._id,

//       {
//         fullLegalName: normalizedName,

//         fullAddress: normalizedAddress,

//         pan: normalizedPan,

//         mobile: normalizedMobile,

//         email: normalizedEmail,

//         acceptedTerms: true,
//       },
//     );

//     // ========================================================
//     // SUCCESS RESPONSE
//     // ========================================================

//     return res.status(200).json({
//       success: true,

//       message: "Agreement generated successfully",

//       data: {
//         purchaseId: purchase._id,

//         // ==================================================
//         // BANK ACCOUNT
//         // ==================================================

//         bankAccount: {
//           bankAccountId: bankAccount._id,

//           accountHolderName: bankAccount.accountHolderName,

//           bankName: bankAccount.bankName,

//           ifscCode: bankAccount.ifscCode,

//           accountNumber: `XXXXXX${bankAccount.accountNumberLast4}`,

//           accountType: bankAccount.accountType,

//           verificationStatus: bankAccount.verificationStatus,
//         },

//         // ==================================================
//         // PDF
//         // ==================================================

//         documentGenerationStatus: agreement.documentGenerationStatus,

//         digitalAgreement: agreement.digitalAgreement,

//         pdfUrl: agreement.digitalAgreement?.url || null,
//       },
//     });
//   } catch (error) {
//     console.error("SUBMIT AGREEMENT DETAILS ERROR:", error);

//     return res.status(error.statusCode || 500).json({
//       success: false,

//       message: error.message || "Unable to submit agreement details",
//     });
//   } finally {
//     await session.endSession();
//   }
// };

export const submitAgreementDetails = async (req, res) => {
  const session = await mongoose.startSession();

  let processingClaimed = false;

  try {
    const userId = req.user.id;

    const { purchaseId } = req.params;

    const {
      fullLegalName,
      fullAddress,
      pan,
      mobile,
      email,
      bankDetails,
      acceptedTerms,
    } = req.body;

    if (!mongoose.isValidObjectId(purchaseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase id",
      });
    }

    if (
      !fullLegalName?.trim() ||
      !fullAddress?.trim() ||
      !pan?.trim() ||
      !mobile ||
      !email?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Full legal name, address, PAN, mobile and email are required",
      });
    }

    const normalizedName = fullLegalName.trim();

    const normalizedAddress = fullAddress.trim();

    const normalizedPan = pan.trim().toUpperCase();

    const normalizedEmail = email.trim().toLowerCase();

    const normalizedMobile = String(mobile).replace(/\D/g, "");

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

    if (!panRegex.test(normalizedPan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN number",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    if (normalizedMobile.length < 10 || normalizedMobile.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number",
      });
    }

    if (acceptedTerms !== true) {
      return res.status(400).json({
        success: false,
        message: "Agreement terms must be accepted",
      });
    }

    if (
      !bankDetails ||
      !bankDetails.accountHolderName?.trim() ||
      !bankDetails.accountNumber ||
      !bankDetails.ifscCode?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete bank details are required",
      });
    }

    const accountHolderName = bankDetails.accountHolderName.trim();

    const accountNumber = String(bankDetails.accountNumber).replace(/\s+/g, "");

    const normalizedIfsc = bankDetails.ifscCode.trim().toUpperCase();

    const normalizedBankName = bankDetails.bankName?.trim() || null;

    const accountType = String(bankDetails.accountType || "SAVINGS")
      .trim()
      .toUpperCase();

    const accountNumberRegex = /^\d{9,18}$/;

    if (!accountNumberRegex.test(accountNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bank account number",
      });
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!ifscRegex.test(normalizedIfsc)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code",
      });
    }

    if (!["SAVINGS", "CURRENT"].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: "Account type must be SAVINGS or CURRENT",
      });
    }

    const existingPurchase = await PurchaseHistory.findOne({
      _id: purchaseId,
      userId,
      paymentStatus: "SUCCESS",
    })
      .select("+documentGenerationError")
      .lean();

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: "Successful purchase not found",
      });
    }

    const existingAgreementUrl =
      existingPurchase.documents?.digitalAgreement?.url || null;

    if (
      existingAgreementUrl ||
      existingPurchase.documentGenerationStatus === "COMPLETED"
    ) {
      return res.status(409).json({
        success: false,
        message: "Agreement has already been submitted and generated",
        data: {
          agreementUrl: existingAgreementUrl,
        },
      });
    }

    if (existingPurchase.documentGenerationStatus === "PROCESSING") {
      return res.status(409).json({
        success: false,
        message: "Agreement submission is already being processed",
      });
    }

    if (existingPurchase.documentGenerationStatus === "FAILED") {
      return res.status(409).json({
        success: false,
        message:
          "Agreement submission has already been attempted. Please use the retry agreement API",
      });
    }

    const encryptedAccountNumber = encryptBankAccount(accountNumber);

    const last4 = accountNumber.slice(-4);

    let purchase = null;

    let bankAccount = null;

    await session.withTransaction(async () => {
      purchase = await PurchaseHistory.findOneAndUpdate(
        {
          _id: purchaseId,

          userId,

          paymentStatus: "SUCCESS",

          $and: [
            {
              $or: [
                {
                  documentGenerationStatus: "NOT_STARTED",
                },
                {
                  documentGenerationStatus: null,
                },
                {
                  documentGenerationStatus: {
                    $exists: false,
                  },
                },
              ],
            },
            {
              $or: [
                {
                  "documents.digitalAgreement.url": {
                    $exists: false,
                  },
                },
                {
                  "documents.digitalAgreement.url": null,
                },
                {
                  "documents.digitalAgreement.url": "",
                },
              ],
            },
          ],
        },

        {
          $set: {
            documentGenerationStatus: "PROCESSING",

            documentGenerationError: null,
          },
        },

        {
          new: true,
          session,
        },
      );

      if (!purchase) {
        const currentPurchase = await PurchaseHistory.findOne({
          _id: purchaseId,

          userId,

          paymentStatus: "SUCCESS",
        })
          .select("+documentGenerationError")
          .session(session);

        if (!currentPurchase) {
          const error = new Error("Successful purchase not found");

          error.statusCode = 404;

          throw error;
        }

        const currentAgreementUrl =
          currentPurchase.documents?.digitalAgreement?.url || null;

        if (
          currentAgreementUrl ||
          currentPurchase.documentGenerationStatus === "COMPLETED"
        ) {
          const error = new Error(
            "Agreement has already been submitted and generated",
          );

          error.statusCode = 409;

          throw error;
        }

        if (currentPurchase.documentGenerationStatus === "PROCESSING") {
          const error = new Error(
            "Agreement submission is already being processed",
          );

          error.statusCode = 409;

          throw error;
        }

        if (currentPurchase.documentGenerationStatus === "FAILED") {
          const error = new Error(
            "Agreement submission has already been attempted. Please use the retry agreement API",
          );

          error.statusCode = 409;

          throw error;
        }

        const error = new Error(
          "Agreement details have already been submitted",
        );

        error.statusCode = 409;

        throw error;
      }

      if (purchase.bankAccountId) {
        bankAccount = await BankAccount.findOneAndUpdate(
          {
            _id: purchase.bankAccountId,

            userId,
          },

          {
            $set: {
              accountHolderName,

              accountNumberEncrypted: encryptedAccountNumber,

              accountNumberLast4: last4,

              ifscCode: normalizedIfsc,

              bankName: normalizedBankName,

              accountType,

              verificationStatus: "PENDING",
            },
          },

          {
            new: true,

            session,
          },
        );
      }

      if (!bankAccount) {
        const bankRecords = await BankAccount.create(
          [
            {
              userId,

              accountHolderName,

              accountNumberEncrypted: encryptedAccountNumber,

              accountNumberLast4: last4,

              ifscCode: normalizedIfsc,

              bankName: normalizedBankName,

              accountType,

              verificationStatus: "PENDING",

              isPrimary: true,
            },
          ],

          {
            session,
          },
        );

        bankAccount = bankRecords[0];
      }

      purchase.bankAccountId = bankAccount._id;

      await purchase.save({
        session,
      });
    });

    processingClaimed = true;

    const agreement = await generateAgreementPdf(purchase._id, {
      fullLegalName: normalizedName,
      fullAddress: normalizedAddress,
      pan: normalizedPan,
      mobile: normalizedMobile,
      email: normalizedEmail,

      bankDetails: {
        accountHolderName,
        accountNumber,
        ifscCode: normalizedIfsc,
        bankName: normalizedBankName,
        accountType,
      },

      acceptedTerms: true,
    });

    return res.status(200).json({
      success: true,

      message: "Agreement generated successfully",

      data: {
        purchaseId: purchase._id,

        bankAccount: {
          bankAccountId: bankAccount._id,

          accountHolderName: bankAccount.accountHolderName,

          bankName: bankAccount.bankName,

          ifscCode: bankAccount.ifscCode,

          accountNumber: `XXXXXX${bankAccount.accountNumberLast4}`,

          accountType: bankAccount.accountType,

          verificationStatus: bankAccount.verificationStatus,
        },

        documentGenerationStatus: agreement.documentGenerationStatus,

        digitalAgreement: agreement.digitalAgreement,

        pdfUrl: agreement.digitalAgreement?.url || null,
      },
    });
  } catch (error) {
    console.error("SUBMIT AGREEMENT DETAILS ERROR:", error);

    if (processingClaimed && mongoose.isValidObjectId(req.params.purchaseId)) {
      try {
        await PurchaseHistory.updateOne(
          {
            _id: req.params.purchaseId,

            documentGenerationStatus: "PROCESSING",
          },

          {
            $set: {
              documentGenerationStatus: "FAILED",

              documentGenerationError: error.message,
            },
          },
        );
      } catch (statusUpdateError) {
        console.error("AGREEMENT STATUS UPDATE ERROR:", statusUpdateError);
      }
    }

    return res.status(error.statusCode || 500).json({
      success: false,

      message: error.message || "Unable to submit agreement details",
    });
  } finally {
    await session.endSession();
  }
};

// ============================================================
// GET AGREEMENT DETAILS
// ============================================================

export const getAgreementDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const { purchaseId } = req.params;

    // ======================================================
    // PURCHASE ID VALIDATION
    // ======================================================

    if (!mongoose.isValidObjectId(purchaseId)) {
      return res.status(400).json({
        success: false,

        message: "Invalid purchase id",
      });
    }

    // ======================================================
    // FIND PURCHASE
    // ======================================================

    const purchase = await PurchaseHistory.findOne({
      _id: purchaseId,

      userId,

      paymentStatus: "SUCCESS",
    })

      .populate({
        path: "bankAccountId",

        select:
          "accountHolderName accountNumberLast4 ifscCode bankName accountType verificationStatus",
      })

      .select(
        `
            transactionReference
            paymentStatus
            documentGenerationStatus
            bankAccountId
            documents.digitalAgreement
            assetSnapshot
            fractionsPurchased
            amountPerFraction
            totalAmount
            paidAt
            `,
      );

    if (!purchase) {
      return res.status(404).json({
        success: false,

        message: "Purchase not found",
      });
    }

    const bank = purchase.bankAccountId;

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,

      data: {
        purchaseId: purchase._id,

        transactionReference: purchase.transactionReference,

        paymentStatus: purchase.paymentStatus,

        documentGenerationStatus: purchase.documentGenerationStatus,

        // ==================================================
        // PURCHASE
        // ==================================================

        purchaseDetails: {
          asset: purchase.assetSnapshot,

          fractionsPurchased: purchase.fractionsPurchased,

          amountPerFraction: purchase.amountPerFraction,

          totalAmount: purchase.totalAmount,

          paidAt: purchase.paidAt,
        },

        // ==================================================
        // BANK
        // ==================================================

        bankAccount: bank
          ? {
              bankAccountId: bank._id,

              accountHolderName: bank.accountHolderName,

              accountNumber: `XXXXXX${bank.accountNumberLast4}`,

              ifscCode: bank.ifscCode,

              bankName: bank.bankName,

              accountType: bank.accountType,

              verificationStatus: bank.verificationStatus,
            }
          : null,

        // ==================================================
        // GENERATED PDF
        // ==================================================

        digitalAgreement: purchase.documents?.digitalAgreement || null,

        pdfUrl: purchase.documents?.digitalAgreement?.url || null,
      },
    });
  } catch (error) {
    console.error("GET AGREEMENT DETAILS ERROR:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to fetch agreement details",
    });
  }
};

// ============================================================
// RETRY AGREEMENT PDF GENERATION
//
// IMPORTANT:
//
// Since form data is NOT being stored in PurchaseHistory,
// Flutter/Postman needs to send these form fields again
// while retrying generation.
// ============================================================

export const retryAgreementGeneration = async (req, res) => {
  try {
    // ======================================================
    // USER
    // ======================================================

    const userId =
      req.user?.id ||
      req.user?._id;

    // ======================================================
    // PARAMS
    // ======================================================

    const { purchaseId } =
      req.params;

    // ======================================================
    // BODY
    //
    // IMPORTANT:
    // req.body undefined ho sakta hai, isliye direct
    // destructuring nahi karna.
    // ======================================================

    const body =
      req.body || {};

    const {
      fullLegalName,
      fullAddress,
      pan,
      mobile,
      email,
      bankDetails,
      acceptedTerms,
    } = body;

    // ======================================================
    // PURCHASE ID VALIDATION
    // ======================================================

    if (
      !mongoose.isValidObjectId(
        purchaseId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid purchase id",
      });
    }

    // ======================================================
    // AGREEMENT DETAILS REQUIRED
    // ======================================================

    if (
      !fullLegalName?.trim() ||
      !fullAddress?.trim() ||
      !pan?.trim() ||
      !mobile ||
      !email?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Retry requires full legal name, address, PAN, mobile and email",
      });
    }

    // ======================================================
    // TERMS
    // ======================================================

    if (
      acceptedTerms !== true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Agreement terms must be accepted",
      });
    }

    // ======================================================
    // BANK DETAILS REQUIRED
    //
    // Full account number is needed because PDF now shows
    // complete bank account number.
    // ======================================================

    if (
      !bankDetails ||
      !bankDetails
        .accountHolderName
        ?.trim() ||
      !bankDetails
        .accountNumber ||
      !bankDetails
        .ifscCode
        ?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Complete bank details including full account number are required for retry",
      });
    }

    // ======================================================
    // NORMALIZE CUSTOMER DETAILS
    // ======================================================

    const normalizedName =
      fullLegalName
        .trim();

    const normalizedAddress =
      fullAddress
        .trim();

    const normalizedPan =
      pan
        .trim()
        .toUpperCase();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const normalizedMobile =
      String(mobile)
        .replace(
          /\D/g,
          "",
        );

    // ======================================================
    // NORMALIZE BANK DETAILS
    // ======================================================

    const accountHolderName =
      bankDetails
        .accountHolderName
        .trim();

    const accountNumber =
      String(
        bankDetails
          .accountNumber,
      )
        .replace(
          /\s+/g,
          "",
        );

    const normalizedIfsc =
      bankDetails
        .ifscCode
        .trim()
        .toUpperCase();

    const normalizedBankName =
      bankDetails
        .bankName
        ?.trim() ||
      "";

    const accountType =
      String(
        bankDetails
          .accountType ||
          "SAVINGS",
      )
        .trim()
        .toUpperCase();

    // ======================================================
    // PAN VALIDATION
    // ======================================================

    const panRegex =
      /^[A-Z]{5}[0-9]{4}[A-Z]$/;

    if (
      !panRegex.test(
        normalizedPan,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid PAN number",
      });
    }

    // ======================================================
    // EMAIL VALIDATION
    // ======================================================

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        normalizedEmail,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid email address",
      });
    }

    // ======================================================
    // MOBILE VALIDATION
    // ======================================================

    if (
      normalizedMobile.length <
        10 ||
      normalizedMobile.length >
        15
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid mobile number",
      });
    }

    // ======================================================
    // ACCOUNT NUMBER VALIDATION
    // ======================================================

    const accountNumberRegex =
      /^\d{9,18}$/;

    if (
      !accountNumberRegex.test(
        accountNumber,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid bank account number",
      });
    }

    // ======================================================
    // IFSC VALIDATION
    // ======================================================

    const ifscRegex =
      /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (
      !ifscRegex.test(
        normalizedIfsc,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IFSC code",
      });
    }

    // ======================================================
    // ACCOUNT TYPE
    // ======================================================

    if (
      ![
        "SAVINGS",
        "CURRENT",
      ].includes(
        accountType,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Account type must be SAVINGS or CURRENT",
      });
    }

    // ======================================================
    // FIND PURCHASE
    // ======================================================

    const purchase =
      await PurchaseHistory
        .findOne({
          _id:
            purchaseId,

          userId,

          paymentStatus:
            "SUCCESS",
        })
        .select(
          "+documentGenerationError",
        );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          "Successful purchase not found",
      });
    }

    // ======================================================
    // COMPLETED CHECK
    // ======================================================

    const existingAgreementUrl =
      purchase
        .documents
        ?.digitalAgreement
        ?.url ||
      null;

    if (
      existingAgreementUrl ||
      purchase
        .documentGenerationStatus ===
        "COMPLETED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Agreement has already been generated",
        data: {
          agreementUrl:
            existingAgreementUrl,
        },
      });
    }

    // ======================================================
    // PROCESSING CHECK
    // ======================================================

    if (
      purchase
        .documentGenerationStatus ===
      "PROCESSING"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Agreement PDF generation is already in progress",
      });
    }

    // ======================================================
    // RETRY SHOULD ONLY BE USED AFTER FAILED GENERATION
    // ======================================================

    if (
      purchase
        .documentGenerationStatus !==
      "FAILED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Agreement retry is only allowed after PDF generation has failed",
      });
    }

    // ======================================================
    // GENERATE PDF AGAIN
    //
    // IMPORTANT:
    // Full bank details are passed again because database
    // stores encrypted account number / last4.
    // ======================================================

    const agreement =
      await generateAgreementPdf(
        purchase._id,

        {
          fullLegalName:
            normalizedName,

          fullAddress:
            normalizedAddress,

          pan:
            normalizedPan,

          mobile:
            normalizedMobile,

          email:
            normalizedEmail,

          bankDetails: {
            accountHolderName,

            accountNumber,

            ifscCode:
              normalizedIfsc,

            bankName:
              normalizedBankName,

            accountType,
          },

          acceptedTerms:
            true,
        },
      );

    // ======================================================
    // RESPONSE
    // ======================================================

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Agreement generated successfully",

        data: {
          purchaseId:
            purchase._id,

          documentGenerationStatus:
            agreement
              .documentGenerationStatus,

          digitalAgreement:
            agreement
              .digitalAgreement,

          pdfUrl:
            agreement
              .digitalAgreement
              ?.url ||
            null,
        },
      });
  } catch (error) {
    console.error(
      "RETRY AGREEMENT GENERATION ERROR:",
      error,
    );

    return res
      .status(
        error.statusCode ||
          500,
      )
      .json({
        success: false,

        message:
          error.message ||
          "Unable to regenerate agreement",
      });
  }
};