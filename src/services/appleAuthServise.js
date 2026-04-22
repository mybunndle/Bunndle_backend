import axios from "axios";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";

export const verifyAppleToken = async (identityToken) => {
  try {
    // 1. Get Apple public keys
    const { data } = await axios.get(
      "https://appleid.apple.com/auth/keys"
    );

    // 2. Decode token header
    const decoded = jwt.decode(identityToken, { complete: true });

    if (!decoded) {
      throw new Error("Invalid token");
    }

    // 3. Find matching key
    const key = data.keys.find(
      (k) => k.kid === decoded.header.kid
    );

    if (!key) {
      throw new Error("Public key not found");
    }

    // 4. Convert to PEM
    const pem = jwkToPem(key);

    // 5. Verify token
    const verified = jwt.verify(identityToken, pem, {
      algorithms: ["RS256"],
      audience: config.APPLE_CLIENT_ID, // Service ID
      issuer: "https://appleid.apple.com",
    });

    return verified;
  } catch (err) {
    throw new Error("Apple token verification failed");
  }
};