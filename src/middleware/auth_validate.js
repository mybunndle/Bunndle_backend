// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../model/userModel.js";
import blacklistTokenModel from "../model/blacklistTokenModel.js";

const authMiddleware = async (req, res, next) => {
  try {
    // 1️⃣ Extract token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const blacklisted = await blacklistTokenModel.findOne({ token });

    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token is blacklisted",
      });
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Find user
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // 4️⃣ Attach user once
    req.user = user;

    // 5️⃣ Continue
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Register first or Invalid token.",
    });
  }
};

export default authMiddleware;
