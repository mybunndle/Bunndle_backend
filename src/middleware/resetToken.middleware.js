import jwt from "jsonwebtoken";
import config from "../config/config.js";

export const verifyResetToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const payload = jwt.verify(token, config.reset_scrt);

    if (payload.type !== "password_reset") {
      return res.status(403).json({
        message: "Invalid reset token type",
      });
    }

    // ✅ Attach payload to request
    req.resetSession = payload;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired reset token",
    });
  }
};


export const verifyVerifiedResetToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const payload = jwt.verify(token, config.reset_scrt);

    if (payload.type !== "password_reset_verified") {
      return res.status(403).json({
        message: "OTP verification required",
      });
    }

    // ✅ Attach payload
    req.resetSession = payload;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired verified token",
    });
  }
};
