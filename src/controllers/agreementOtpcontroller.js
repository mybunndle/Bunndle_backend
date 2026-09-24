import {
  sendAgreementOtpService,
  verifyAgreementOtpService,
} from "../services/agreementOtpService.js";

// ============================================================
// SEND AGREEMENT OTP
// ============================================================

export const sendAgreementOtp = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const { purchaseId } = req.params;

    const result = await sendAgreementOtpService({
      userId,
      purchaseId,
    });

    return res.status(200).json({
      success: true,

      message: "Agreement OTP sent successfully",

      data: result,
    });
  } catch (error) {
    console.error("SEND AGREEMENT OTP ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,

      message: error.message || "Unable to send agreement OTP",
    });
  }
};

// ============================================================
// VERIFY AGREEMENT OTP
// ============================================================

export const verifyAgreementOtp = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const { purchaseId } = req.params;

    const { otp } = req.body;

    const result = await verifyAgreementOtpService({
      userId,
      purchaseId,
      otp,
    });

    return res.status(200).json({
      success: true,

      message: "Agreement OTP verified successfully",

      data: result,
    });
  } catch (error) {
    console.error("VERIFY AGREEMENT OTP ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,

      message: error.message || "Unable to verify agreement OTP",
    });
  }
};
