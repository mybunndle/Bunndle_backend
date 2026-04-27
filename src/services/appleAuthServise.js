// import axios from "axios";
// import jwt from "jsonwebtoken";
// import jwkToPem from "jwk-to-pem";

// export const verifyAppleToken = async (identityToken) => {
//   try {
//     // 1. Get Apple public keys
//     const { data } = await axios.get(
//       "https://appleid.apple.com/auth/keys"
//     );

//     // 2. Decode token header
//     const decoded = jwt.decode(identityToken, { complete: true });

//     if (!decoded) {
//       throw new Error("Invalid token");
//     }

//     // 3. Find matching key
//     const key = data.keys.find(
//       (k) => k.kid === decoded.header.kid
//     );

//     if (!key) {
//       throw new Error("Public key not found");
//     }

//     // 4. Convert to PEM
//     const pem = jwkToPem(key);

//     // 5. Verify token
//     const verified = jwt.verify(identityToken, pem, {
//       algorithms: ["RS256"],
//       audience: config.APPLE_CLIENT_ID, // Service ID
//       issuer: "https://appleid.apple.com",
//     });

//     return verified;
//   } catch (err) {
//     throw new Error("Apple token verification failed");
//   }
// };


import axios from "axios";

import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import config from "../config/config.js";

let keysCache = null;

const getAppleKeys = async () => {
  if (!keysCache) {
    const { data } = await axios.get("https://appleid.apple.com/auth/keys");
    keysCache = data.keys;
  }
  return keysCache;
};

export const verifyAppleToken = async (token) => {
  const keys = await getAppleKeys();

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) throw new Error("Invalid token");

  const key = keys.find(k => k.kid === decoded.header.kid);
  if (!key) throw new Error("Key not found");

  const pem = jwkToPem(key);

  const verified = jwt.verify(token, pem, {
    algorithms: ["RS256"],
    audience: config.APPLE_AUDIENCE,
    issuer: "https://appleid.apple.com",
  });

  if (!verified.sub) throw new Error("Invalid Apple user");
     
  return {
    appleId: verified.sub,
    email: verified.email || null,
  };
};