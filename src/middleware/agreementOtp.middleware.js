import mongoose from "mongoose";

import AgreementOtp from "../model/agreementOtpModel.js";

// ============================================================
// VERIFY AGREEMENT OTP COMPLETED
//
// Flow:
// 1. authMiddleware user verify karega
// 2. Ye middleware DB me check karega ki
//    same user + same purchase ka OTP verified hai
// 3. Verification valid hai to PDF controller chalega
// ============================================================

export const verifyAgreementOtpCompleted = async (req, res, next) => {
  try {
    // ======================================================
    // LOGGED-IN USER
    // ======================================================

    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,

        message: "Authentication required",
      });
    }

    // ======================================================
    // PURCHASE ID
    // ======================================================

    const { purchaseId } = req.params;

    if (!mongoose.isValidObjectId(purchaseId)) {
      return res.status(400).json({
        success: false,

        message: "Invalid purchase id",
      });
    }

    // ======================================================
    // OTP VERIFICATION VALIDITY
    //
    // OTP verify hone ke baad user ke paas
    // agreement form submit karne ke liye 10 minutes hain.
    //
    // .env se control kar sakte ho:
    // AGREEMENT_OTP_VERIFICATION_MINUTES=10
    // ======================================================

    const verificationValidityMinutes =
      Number(process.env.AGREEMENT_OTP_VERIFICATION_MINUTES) || 10;

    const verificationValidFrom = new Date(
      Date.now() - verificationValidityMinutes * 60 * 1000,
    );

    // ======================================================
    // FIND LATEST VERIFIED OTP
    // ======================================================

    const verifiedOtp = await AgreementOtp.findOne({
      userId,

      purchaseId,

      isUsed: true,

      verifiedAt: {
        $ne: null,

        $gte: verificationValidFrom,
      },
    })
      .sort({
        verifiedAt: -1,
      })
      .lean();

    // ======================================================
    // NOT VERIFIED / EXPIRED
    // ======================================================

    if (!verifiedOtp) {
      return res.status(403).json({
        success: false,

        message: "Please verify OTP before generating the agreement",
      });
    }

    // ======================================================
    // ATTACH VERIFICATION INFO
    // ======================================================

    req.agreementOtpVerified = {
      otpId: verifiedOtp._id,

      userId: verifiedOtp.userId,

      purchaseId: verifiedOtp.purchaseId,

      verifiedAt: verifiedOtp.verifiedAt,
    };

    // ======================================================
    // CONTINUE TO PDF CONTROLLER
    // ======================================================

    next();
  } catch (error) {
    console.error("AGREEMENT OTP VERIFICATION ERROR:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to verify agreement OTP status",
    });
  }
};
