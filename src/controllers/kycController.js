import {
  verifyDigilockerKycService,
} from "../services/idsPayService.js";

export const verifyDigilockerKyc =
  async (req, res) => {

    try {

      const { aadhaar_number } =
        req.body;

      // =========================
      // VALIDATION
      // =========================

      if (!aadhaar_number) {
        return res.status(400).json({
          success: false,
          message:
            "Aadhaar number is required",
        });
      }

      // Aadhaar validation
      const aadhaarRegex =
        /^[2-9]{1}[0-9]{11}$/;

      if (
        !aadhaarRegex.test(
          aadhaar_number
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Aadhaar number",
        });
      }

      // =========================
      // VERIFY
      // =========================

      const data =
        await verifyDigilockerKycService(
          aadhaar_number
        );

      // =========================
      // RESPONSE
      // =========================

      return res.status(200).json({
        success: true,
        data,
      });

    } catch (error) {

      console.log(
        error.response?.data ||
          error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Verification failed",
        error:
          error.response?.data ||
          error.message,
      });
    }
  };