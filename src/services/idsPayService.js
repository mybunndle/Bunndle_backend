import axios from "axios";
import config from "../config/config.js";

export const verifyDigilockerKycService =
  async (aadhaar_number) => {

    try {

      const payload = {

        api_id: config.ids_api_id,

        api_key: config.ids_api_key,

        token_id: config.ids_token_id,

        methodName:
          "DIGILOCKER_DIGITAL_KYC",

        aadhaar_number,

        consent: "Y",
      };

      console.log("PAYLOAD:", payload);

      const response = await axios.post(
        `${config.ids_base_url}/srv2/validation/digilocker-digital-kyc`,
        payload,
        {
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

      return response.data;

    } catch (error) {

      console.log(
        "IDSPAY ERROR:",
        error.response?.data ||
          error.message
      );

      throw error;
    }
  };