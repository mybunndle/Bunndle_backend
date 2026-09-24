import crypto from "crypto";


// ============================================================
// OTP HASH
// ============================================================

export const hashAgreementOtp = (
  otp
) => {
  const secret =
    process.env
      .AGREEMENT_OTP_SECRET;

  if (!secret) {
    throw new Error(
      "AGREEMENT_OTP_SECRET is missing"
    );
  }

  return crypto
    .createHmac(
      "sha256",
      secret
    )
    .update(
      String(otp)
    )
    .digest(
      "hex"
    );
};


// ============================================================
// VERIFICATION TOKEN HASH
// ============================================================

export const hashAgreementVerificationToken =
  (
    token
  ) => {
    return crypto
      .createHash(
        "sha256"
      )
      .update(
        String(token)
      )
      .digest(
        "hex"
      );
  };


// ============================================================
// GENERATE OTP
// ============================================================

export const generateAgreementOtp =
  () => {
    return crypto
      .randomInt(
        100000,
        1000000
      )
      .toString();
  };


// ============================================================
// GENERATE VERIFICATION TOKEN
// ============================================================

export const generateAgreementVerificationToken =
  () => {
    return crypto
      .randomBytes(
        32
      )
      .toString(
        "hex"
      );
  };


// ============================================================
// SAFE OTP COMPARE
// ============================================================

export const compareAgreementOtp = (
  otp,
  storedHash
) => {
  const receivedHash =
    hashAgreementOtp(
      otp
    );

  const receivedBuffer =
    Buffer.from(
      receivedHash,
      "hex"
    );

  const storedBuffer =
    Buffer.from(
      storedHash,
      "hex"
    );

  if (
    receivedBuffer.length !==
    storedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    storedBuffer
  );
};