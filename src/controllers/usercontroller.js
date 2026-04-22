import userModel from "../model/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { verifyAppleToken } from "../services/appleAuthServise.js";

import sendOTPEmail from "../utils/email.js";
import generateOTP from "../utils/otp.js";
import resetCookieOptions from "../config/cookieOptions.js";
import otpTemplate from "../utils/otpTemplate.js";
import sendEmail from "../utils/email.js";
import adminEmailTemplate from "../utils/adminEmailTemplate.js";
import userThankYouTemplate from "../utils/userThankYou.js";

import { uploadFile, deleteFile } from "../services/imageStorageService.js";
import { DEFAULT_OTP, hashOtp } from "../utils/otp_temp.js";


import { verifyGoogleIdToken } from "../utils/googleClient.js";


const formatDob = (dob) => {
  if (!dob) return null;
  return new Date(dob).toISOString().replace("T", " ").replace(".000Z", "");
};

export async function registerUser(req, res) {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        message: "Name, phone, email and password are required",
      });
    }

    // 🔍 Check email or phone already exists
    const existingUser = await userModel.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Phone number already registered",
      });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await userModel.create({
      name, // ✅ duplicate allowed
      phone,
      email,
      password: hashedPassword,
    });

    // 🎟️ Generate JWT
    const token = jwt.sign({ id: email }, config.jwtSecret, {
      expiresIn: "1d",
    });

    return res.status(201).json({
      message: "User registered successfully",
      token,
    });
  } catch (error) {
    // ✅ Handle Mongo duplicate key error safely
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        message: `${field} already exists`,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 2️⃣ Explicitly SELECT password
    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4️⃣ Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // 5️⃣ Send response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// export async function googleAuthCallback(req, res) {
//   try {
//     const googleUser = req.user;

//     const email = googleUser.emails[0].value;
//     const googleId = googleUser.id;
//     const name = `${googleUser.name.givenName} ${googleUser.name.familyName}`;

//     // 1️⃣ Find existing user
//     let user = await userModel.findOne({
//       $or: [{ email }, { googleId }],
//     });

//     // 2️⃣ LOGIN (existing user)
//     if (user) {
//       // 🔗 Link Google if user was created via normal signup
//       if (!user.googleId) {
//         user.googleId = googleId;
//         user.authProvider = "google";
//         await user.save();
//       }
//     }
//     // 3️⃣ SIGNUP (new Google user)
//     else {
//       user = await userModel.create({
//         name,
//         email,
//         googleId,
//         authProvider: "google",
//       });
//     }

//     // 4️⃣ Generate JWT
//     const token = jwt.sign(
//       {
//         id: user._id,
//         role: user.role,
//         email: user.email,
//       },
//       config.jwtSecret,
//       { expiresIn: "2d" }
//     );

//     // 5️⃣ Set cookie
//     res.cookie("token", token, {
//       httpOnly: true,
//       secure: false, // true in production
//       sameSite: "lax",
//     });

//     // 6️⃣ Redirect by role
    
//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       token,
//       user,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: "Google login failed",
//     });
//   }
// }


export async function googleAuthCallback(req, res) {
  try {
    let googleId, email, name, picture;

    /* ===== WEB (Passport) ===== */
    if (req.user) {
      googleId = req.user.id;
      email = req.user.emails?.[0]?.value;
      name = `${req.user.name?.givenName || ""} ${req.user.name?.familyName || ""}`.trim();
      picture = req.user.photos?.[0]?.value;
    }

    /* ===== ANDROID (ID TOKEN) ===== */
    else if (req.body?.idToken) {
      const payload = await verifyGoogleIdToken(req.body.idToken);
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    }

    else {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    let user = await userModel.findOne({
      $or: [{ email }, { googleId }],
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
        await user.save();
      }
    } else {
      user = await userModel.create({
        name,
        email,
        googleId,
        authProvider: "google",
        avatar: picture,
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      config.jwtSecret,
      { expiresIn: "2d" }
    );

    if (req.user) {
      res.cookie("token", token, {
        httpOnly: true,
        secure: config.env === "production",
        sameSite: "lax",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user,
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Google auth failed" });
  }
}

export const appleLogin = async (req, res) => {
  try {
    const { identityToken } = req.body;

    if (!identityToken) {
      return res.status(400).json({
        success: false,
        message: "Identity token missing",
      });
    }

    // 1. Verify Apple token
    const appleUser = await verifyAppleToken(identityToken);

    const { sub, email } = appleUser;

    // 2. Find or create user
    let user = await userModel.findOne({ appleId: sub });

    if (!user) {
      user = await userModel.create({
        appleId: sub,
        email: email || null,
      });
    }

    // 3. Create your JWT (same as your existing auth)
    const token = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: "5m" }
    );

    // 4. Send cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return res.status(200).json({
      success: true,
      message: "Apple login successful",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




export async function getUserProfile(req, res) {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await userModel.findById(decoded.id);
    res.status(200).json({
      message: "User profile fetched successfully",
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      profileImage: user.profileImage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateUserProfile(req, res) {
  try {
    const user = req.user;
    
    console.log(req.body);
    const { name, email, phone, dob } = req.body || {};

    if (!name && !email && !phone && !dob && !req.file) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update-------------",
      });
    }

    // 🔎 Get existing user (for old imageId)
    const existingUser = await userModel.findById(user._id);

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (dob) updateData.dob = new Date(dob);

    let oldImageId = existingUser?.profileImageId;

    // 🖼 Upload new image first
    if (req.file) {
      const uploadedImage = await uploadFile(req.file);
      updateData.profileImage = uploadedImage.url;
      updateData.profileImageId = uploadedImage.fileId;
    }

    const updatedUser = await userModel
      .findByIdAndUpdate(user._id, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-password");

    // ✅ Respond SUCCESS immediately
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        dob: formatDob(updatedUser.dob),
        profileImage: updatedUser.profileImage,
      },
    });

    // 🧹 Delete old image AFTER response
    if (oldImageId && req.file) {
      deleteFile(oldImageId); // 🔥 async, non-blocking
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate email or phone",
      });
    }

    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * STEP 1️⃣ Forgot Password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1️⃣ Validate input
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // 2️⃣ Check user exists
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found, please register first",
      });
    }

    // 3️⃣ Generate OTP
    const otp = generateOTP();

    // 4️⃣ Save hashed OTP with expiry
    user.resetOtpHash = await bcrypt.hash(String(otp), 10);
    user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // 5️⃣ Generate reset session token
    const resetToken = jwt.sign(
      {
        userId: user._id,
        type: "password_reset",
      },
      config.reset_scrt,
      { expiresIn: "10m" }
    );

    // 6️⃣ Send OTP email
    await sendOTPEmail(user.email, "Your Password Reset OTP", otpTemplate(otp));

    // 7️⃣ Respond (NO cookies)
    return res.status(200).json({
      message: "OTP sent to registered email",
      resetToken, // Flutter stores this in memory
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




export const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const { userId } = req.resetSession;

    // 1️⃣ Validate input
    if (!otp) {
      return res.status(400).json({
        message: "OTP is required",
      });
    }

    // 2️⃣ Fetch user with OTP hash
    const user = await userModel
      .findById(userId)
      .select("+resetOtpHash +resetOtpExpiry");

    if (!user || !user.resetOtpHash) {
      return res.status(400).json({
        message: "OTP expired or invalid",
      });
    }

    // 3️⃣ Check expiry
    if (user.resetOtpExpiry < Date.now()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    // 4️⃣ Compare OTP
    const isValidOtp = await bcrypt.compare(String(otp), user.resetOtpHash);

    if (!isValidOtp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    // 5️⃣ Clear OTP after success
    user.resetOtpHash = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    // 6️⃣ Issue verified reset token
    const verifiedToken = jwt.sign(
      {
        userId: user._id,
        type: "password_reset_verified",
      },
      config.reset_scrt,
      { expiresIn: "10m" }
    );

    return res.status(200).json({
      message: "OTP verified successfully",
      verifiedToken,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { userId } = req.resetSession;

    // 1️⃣ Validate input
    if (!newPassword) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    // 2️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3️⃣ Update password
    await userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    return res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
export const quickConnect = async (req, res) => {
  try {
    const { name, phone, email, message } = req.body;

    if (!name || !phone || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 📩 Send email to admin
    await sendEmail(
      config.email,
      "New Quick Connect Request",
      adminEmailTemplate({ name, phone, email, message })
    );

    // 📧 Send confirmation to user
    await sendEmail(
      email,
      "Thank you for choosing us",
      userThankYouTemplate({ name })
    );

    res.status(200).json({
      message: "Request submitted successfully. We will contact you soon.",
      name,
      email,
      phone,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mobile OTP Generation and verify Functions----------------------------------

export const sendLoginOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "Phone number required",
      });
    }

    // 🔍 Check user existence
    const user = await userModel.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please register first.",
      });
    }

    // ✅ Set DEFAULT OTP
    user.resetOtpHash = hashOtp(DEFAULT_OTP);
    user.resetOtpExpiry = Date.now() + 5 * 60 * 1000; // 5 mins

    await user.save();

    // 🔔 For now (DEV only)
    console.log("LOGIN OTP:", DEFAULT_OTP);

    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};
export const verifyLoginOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: "Phone and OTP required",
      });
    }

    const user = await userModel
      .findOne({ phone })
      .select("+resetOtpHash +resetOtpExpiry");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.resetOtpHash || !user.resetOtpExpiry) {
      return res.status(400).json({
        message: "Invalid OTP or session expired",
      });
    }

    if (user.resetOtpExpiry.getTime() < Date.now()) {
      return res.status(400).json({
        message: "Session expired",
      });
    }

    if (user.resetOtpHash !== hashOtp(otp)) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    // ✅ clear OTP after success
    user.resetOtpHash = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
