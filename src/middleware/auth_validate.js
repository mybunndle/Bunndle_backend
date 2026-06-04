// // middleware/auth.js
// import jwt from "jsonwebtoken";
// import User from "../model/userModel.js";
// import blacklistTokenModel from "../model/blacklistTokenModel.js";

// const authMiddleware = async (req, res, next) => {
//   try {
//     // 1️⃣ Extract token
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({
//         success: false,
//         message: "Access denied. No token provided.",
//       });
//     }

//     const token = authHeader.split(" ")[1];
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Access denied. No token provided.",
//       });
//     }

//     const blacklisted = await blacklistTokenModel.findOne({ token });

//     if (blacklisted) {
//       return res.status(401).json({
//         success: false,
//         message: "Token is blacklisted",
//       });
//     }

//     // 2️⃣ Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // 3️⃣ Find user
//     const user = await User.findById(decoded.id).select("-password");

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "User no longer exists.",
//       });
//     }

//     // 4️⃣ Attach user once
//     req.user = user;

//     // 5️⃣ Continue
//     next();
//   } catch (error) {
//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         success: false,
//         message: "Token expired. Please login again.",
//       });
//     }

//     return res.status(401).json({
//       success: false,
//       message: "Register first or Invalid token.",
//     });
//   }
// };


// export default authMiddleware;




import jwt from "jsonwebtoken";
import User from "../model/userModel.js";
import blacklistTokenModel from "../model/blacklistTokenModel.js";

const authMiddleware = async (req, res, next) => {
  try {
    // 1️⃣ Get Authorization Header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // 2️⃣ Extract Token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    console.log("=================================");
    console.log("Received Token:", token);

    // 3️⃣ Check Blacklist
    const blacklisted = await blacklistTokenModel.findOne({ token });

    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token is blacklisted",
      });
    }

    // 4️⃣ Decode Token (without verification)
    const decodedToken = jwt.decode(token);

    console.log("Decoded Token:", decodedToken);

    if (decodedToken?.exp) {
      console.log(
        "Token Expiry:",
        new Date(decodedToken.exp * 1000)
      );

      console.log(
        "Current Time:",
        new Date()
      );

      console.log(
        "Days Remaining:",
        (
          (decodedToken.exp * 1000 - Date.now()) /
          (1000 * 60 * 60 * 24)
        ).toFixed(2)
      );
    }

    console.log("JWT Secret Exists:", !!process.env.JWT_SECRET);

    // 5️⃣ Verify Token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("Verified User ID:", decoded.id);

    // 6️⃣ Find User
    const user = await User.findById(decoded.id).select(
      "-password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // 7️⃣ Attach User
    req.user = user;

    next();
  } catch (error) {
    console.error("=================================");
    console.error("JWT ERROR NAME:", error.name);
    console.error("JWT ERROR MESSAGE:", error.message);

    if (error.expiredAt) {
      console.error("TOKEN EXPIRED AT:", error.expiredAt);
    }

    console.error("=================================");

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

export default authMiddleware;