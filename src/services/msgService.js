import axios from "axios";
import config from "../config/config.js";

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const formatIndianMobile = (phoneValue) => {
  const digits = String(phoneValue ?? "").replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`;
  }

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  throw createError(400, "Invalid Indian mobile number");
};

const validateMsg91Environment = () => {
  if (!process.env.MSG91_AUTHKEY) {
    throw createError(500, "MSG91_AUTHKEY is missing");
  }

  if (!process.env.MSG91_TEMPLATE_ID) {
    throw createError(500, "MSG91_TEMPLATE_ID is missing");
  }

  if (
    process.env.MSG91_TEMPLATE_ID ===
    "your_current_msg91_template_id"
  ) {
    throw createError(
      500,
      "Replace MSG91_TEMPLATE_ID placeholder with actual template ID"
    );
  }
};

export const sendOtpSms = async ({ phone, otp }) => {
  const mobile = formatIndianMobile(phone);
  console.log(`Sending OTP SMS to ${mobile} with OTP: ${otp}`);

  // Local testing without sending real SMS
  if (process.env.USE_REAL_SMS !== "true") {
    console.log(`[DEV OTP] Mobile: ${mobile}, OTP: ${otp}`);

    return {
      success: true,
      developmentMode: true,
    };
  }

  validateMsg91Environment();

 const payload = {
  template_id: process.env.MSG91_TEMPLATE_ID,
  sender: process.env.MSG91_SENDER_ID,
  short_url: "0",
  realTimeResponse: "1",

  recipients: [
    {
      mobiles: mobile,
      OTP: String(otp),
    },
  ],
};

  try {
    console.log("MSG91 REQUEST:", {
      templateIdLoaded: Boolean(payload.template_id),
      templateId: payload.template_id,
      mobile,
      otpProvided: Boolean(otp),
    });

    const response = await axios.post(
      process.env.MSG91_API_URL ||
        "https://control.msg91.com/api/v5/flow",
      payload,
      {
        headers: {
          authkey: process.env.MSG91_AUTHKEY,
          accept: "application/json",
          "content-type": "application/json",
        },
        timeout: 15000,
      }
    );

    console.log("MSG91 RESPONSE:", response.data);

    if (
      String(response.data?.type ?? "").toLowerCase() === "error"
    ) {
      throw createError(
        502,
        response.data?.message || "MSG91 rejected SMS request"
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      "MSG91 ERROR:",
      error.response?.data || error.message
    );

    if (error.statusCode) {
      throw error;
    }

    throw createError(
      error.response?.status || 502,
      error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Unable to send OTP SMS"
    );
  }
};