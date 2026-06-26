import crypto from "crypto";

export const DEFAULT_OTP = "123456";

export const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");


