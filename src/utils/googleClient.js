import { OAuth2Client } from "google-auth-library";
import config from "../config/config.js";

const googleClient = new OAuth2Client(config.CLIENT_ID);

export const verifyGoogleIdToken = async (idToken) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: [
      config.CLIENT_ID,        // Web client
      config.ANDROID_CLIENT_ID // Android client
    ],
  });

  return ticket.getPayload();
};
