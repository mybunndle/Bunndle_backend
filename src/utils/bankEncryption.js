import crypto from "crypto";

const algorithm =
  "aes-256-gcm";

const key =
  Buffer.from(
    process.env.BANK_ENCRYPTION_KEY,
    "hex"
  );


export const encryptBankAccount =
  (
    accountNumber
  ) => {
    const iv =
      crypto.randomBytes(12);

    const cipher =
      crypto.createCipheriv(
        algorithm,
        key,
        iv
      );

    let encrypted =
      cipher.update(
        accountNumber,
        "utf8",
        "hex"
      );

    encrypted +=
      cipher.final(
        "hex"
      );

    const authTag =
      cipher
        .getAuthTag()
        .toString(
          "hex"
        );

    return [
      iv.toString("hex"),
      authTag,
      encrypted,
    ].join(":");
  };