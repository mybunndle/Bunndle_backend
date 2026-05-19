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
import blacklistTokenModel from "../model/blacklistTokenModel.js";

import { verifyGoogleIdToken } from "../utils/googleClient.js";
import axios from "axios";

const formatDob = (dob) => {
  if (!dob) return "DD/MM/YYYY";

  const date = new Date(dob);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
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
      expiresIn: "30d",
    });

    return res.status(201).json({
      message: "User registered successfully",
      token,
      name,
      email,
      phone,
    
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

    
    const user = await userModel.findOne({ email }).select("+password");
     if (!user.password) {
      return res.status(400).json({
        message: "Password not set. Please create your password first .",
        action: "SET_PASSWORD", 
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4️⃣ Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // 5️⃣ Send response
    return res.status(200).json({
      success: true,

      message: "Login successful",
      token,
      user
      
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
export async function logoutUser(req, res) {
   try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }

    const decoded = jwt.decode(token);

    await blacklistTokenModel.create({
      token,
      expiresAt: new Date(decoded.exp * 1000), // convert to ms
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Logout failed",
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

// export const appleLogin = async (req, res) => {
//   try {
//     const { identityToken } = req.body;

//     if (!identityToken) {
//       return res.status(400).json({ message: "Token required" });
//     }
//     const { appleId, email } = await verifyAppleToken(identityToken);

//     let user = await User.findOne({ appleId });

//     if (!user) {
//       user = await User.create({ appleId, email });
//     }

//     const token = jwt.sign(
//       { userId: user._id },
//       config.jwtSecret,
//       { expiresIn: config.jwt_expire }
//     );

//     res.json({ token, user });
//   } catch (err) {
//     res.status(401).json({ message: err.message });
//   }
// };

export const appleLogin = async (req, res) => {
  try {
    const { identityToken, fullName, email: bodyEmail } = req.body;

    if (!identityToken) {
      return res.status(400).json({
        success: false,
        message: "Apple identity token required",
      });
    }

    // Verify Apple token
    const appleData = await verifyAppleToken(identityToken);

    const appleId = appleData.appleId;
    const email = appleData.email || bodyEmail || undefined;

    if (!appleId) {
      return res.status(401).json({
        success: false,
        message: "Invalid Apple token",
      });
    }

    // First find user by Apple ID
    let user = await userModel.findOne({ appleId });

    // If email exists, try linking existing local/google account
    if (!user && email) {
      user = await userModel.findOne({ email });
    }

    if (user) {
      user.appleId = user.appleId || appleId;
      user.authProvider = "apple";

      if (!user.email && email) {
        user.email = email;
      }

      if (!user.name || user.name === "Apple User") {
        user.name = fullName || user.name || "Apple User";
      }

      await user.save();
    } else {
      user = await userModel.create({
        name: fullName || "Apple User",
        ...(email ? { email } : {}),
        appleId,
        authProvider: "apple",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email || null,
      },
      config.jwtSecret,
      { expiresIn: "2d" }
    );

    return res.status(200).json({
      success: true,
      message: "Apple login successful",
      token,
      user,
    });
  } catch (err) {
    console.error("Apple login error:", err);

    return res.status(401).json({
      success: false,
      message: err.message || "Apple login failed",
    });
  }
};









// export async function getUserProfile(req, res) {
//   try {
//     const token = req.headers.authorization.split(" ")[1];
//     const decoded = jwt.verify(token, config.jwtSecret);
//     const user = await userModel.findById(decoded.id);
//     res.status(200).json({
//       message: "User profile fetched successfully",
//       id: user._id,
//       name: user.name,
//       phone: user.phone || "",
//       email: user.email,
//       profileImage: user.profileImage || "",
//       role: user.role,
//       dob: formatDob(user.dob),
//       kycStatus: user.kycStatus,
//       kycDocument: user.kycDocument,
//       kycDocumentId: user.kycDocumentId
//     });
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// }

export async function getUserProfile(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",

      data: {
        id: user._id,
        name: user.name,
        phone: user.phone || "",
        email: user.email || "",
        profileImage: user.profileImage || "",
        role: user.role || "",
        dob: user.dob ? formatDob(user.dob) : null,
        kycStatus: user.kycStatus,
        kycDocument: user.kycDocument || "",
        kycDocumentId: user.kycDocumentId || "",
      },
    });

  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
// export async function updateUserProfile(req, res) {
//   try {
//     const user = req.user;
    
//     console.log(req.body);
//     const { name, email, phone, dob } = req.body || {};

//     if (!name && !email && !phone && !dob && !req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No fields provided to update-------------",
//       });
//     }

//     // 🔎 Get existing user (for old imageId)
//     const existingUser = await userModel.findById(user._id);

//     const updateData = {};
//     if (name) updateData.name = name;
//     if (email) updateData.email = email;
//     if (phone) updateData.phone = phone;
//     if (dob) updateData.dob = new Date(dob);

//     let oldImageId = existingUser?.profileImageId;

//     // 🖼 Upload new image first
//     if (req.file) {
//       const uploadedImage = await uploadFile(req.file);
//       updateData.profileImage = uploadedImage.url;
//       updateData.profileImageId = uploadedImage.fileId;
//     }

//     const updatedUser = await userModel
//       .findByIdAndUpdate(user._id, updateData, {
//         new: true,
//         runValidators: true,
//       })
//       .select("-password");

//     // ✅ Respond SUCCESS immediately
//     res.status(200).json({
//       success: true,
//       message: "Profile updated successfully",
//       data: {
//         name: updatedUser.name,
//         email: updatedUser.email,
//         phone: updatedUser.phone,
//         dob: formatDob(updatedUser.dob),
//         profileImage: updatedUser.profileImage,
//       },
//     });

//     // 🧹 Delete old image AFTER response
//     if (oldImageId && req.file) {
//       deleteFile(oldImageId); // 🔥 async, non-blocking
//     }
//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: "Duplicate email or phone",
//       });
//     }

//     console.error("Update profile error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// }


export async function updateUserProfile(req, res) {
  try {

    // ===== AUTH USER =====

    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ===== REQUEST BODY =====

    const {
      name,
      email,
      phone,
      dob,
    } = req.body || {};

    // ===== VALIDATION =====

    if (
      !name &&
      !email &&
      !phone &&
      !dob &&
      !req.file
    ) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    // ===== FIND EXISTING USER =====

    const existingUser =
      await userModel.findById(user._id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ===== UPDATE OBJECT =====

    const updateData = {};

    // ===== NAME =====

    if (
      typeof name === "string" &&
      name.trim()
    ) {
      updateData.name = name.trim();
    }

    // ===== EMAIL =====

    if (
      typeof email === "string" &&
      email.trim()
    ) {

      const cleanEmail = email
        .trim()
        .toLowerCase();

      // duplicate email check
      const emailExists =
        await userModel.findOne({
          email: cleanEmail,
          _id: { $ne: user._id },
        });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      updateData.email = cleanEmail;
    }

    // ===== PHONE =====

    if (
      typeof phone === "string" &&
      phone.trim()
    ) {

      const cleanPhone = phone.trim();

      // duplicate phone check
      const phoneExists =
        await userModel.findOne({
          phone: cleanPhone,
          _id: { $ne: user._id },
        });

      if (phoneExists) {
        return res.status(409).json({
          success: false,
          message: "Phone already exists",
        });
      }

      updateData.phone = cleanPhone;
    }

    // ===== SAFE DOB =====

    if (
      typeof dob === "string" &&
      dob.trim()
    ) {

      const parsedDob =
        new Date(dob);

      // prevent invalid date crash
      if (
        !isNaN(parsedDob.getTime())
      ) {
        updateData.dob = parsedDob;
      }
    }

    // ===== IMAGE UPLOAD =====

    const oldImageId =
      existingUser.profileImageId || null;

    if (req.file) {

      const uploadedImage =
        await uploadFile(req.file);

      if (
        !uploadedImage ||
        !uploadedImage.url ||
        !uploadedImage.fileId
      ) {
        return res.status(500).json({
          success: false,
          message: "Image upload failed",
        });
      }

      updateData.profileImage =
        uploadedImage.url;

      updateData.profileImageId =
        uploadedImage.fileId;
    }

    // ===== PREVENT EMPTY UPDATE =====

    if (
      Object.keys(updateData).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No valid fields to update",
      });
    }

    // ===== UPDATE USER =====

    const updatedUser =
      await userModel
        .findByIdAndUpdate(
          user._id,

          {
            $set: updateData,
          },

          {
            new: true,
            runValidators: true,
          }
        )
        .select("-password");

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: "User update failed",
      });
    }

    // ===== RESPONSE =====

    res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",

      data: {
        id: updatedUser._id,
        name:
          updatedUser.name || "",

        email:
          updatedUser.email || "",

        phone:
          updatedUser.phone || "",

        dob: updatedUser.dob
          ? formatDob(
              updatedUser.dob
            )
          : null,

        profileImage:
          updatedUser.profileImage ||
          "",
      },
    });

    // ===== DELETE OLD IMAGE =====

    if (oldImageId && req.file) {
      try {

        await deleteFile(
          oldImageId
        );

      } catch (deleteError) {

        console.error(
          "Old image delete failed:",
          deleteError
        );
      }
    }

  } catch (error) {

    console.error(
      "Update profile error:",
      error
    );

    // ===== DUPLICATE KEY =====

    if (error.code === 11000) {

      const duplicateField =
        Object.keys(
          error.keyPattern || {}
        )[0];

      return res.status(409).json({
        success: false,
        message:
          `${duplicateField} already exists`,
      });
    }

    // ===== VALIDATION ERROR =====

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // ===== INVALID OBJECT ID =====

    if (
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid data",
      });
    }

    // ===== FALLBACK =====

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
}


// export async function uploadProfile(req, res) {
  
//   try {
//     const user = req.user;

//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No image file provided",
//       });
//     }
    

//     // 🔎 Get existing user (for old imageId)
//     const existingUser = await userModel.findById(user._id);

//     let oldImageId = existingUser?.profileImageId;

//     // 🖼 Upload new image
//     const uploadedImage = await uploadFile(req.file);

//     // 💾 Update DB
//     const updatedUser = await userModel.findByIdAndUpdate(
//       user._id,
//       {
//         profileImage: uploadedImage.url,
//         profileImageId: uploadedImage.fileId,
//       },
//       { new: true }
//     );

//     // ✅ Send response
//     res.status(200).json({
//       success: true,
//       message: "Profile image updated successfully",
//       profileImage: updatedUser.profileImage,
//     });

//     // 🧹 Delete old image (non-blocking)
//     if (oldImageId) {
//       deleteFile(oldImageId);
//     }

//   } catch (error) {
//     console.error("Upload image error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// }

export async function uploadProfile(req, res) {
  try {

    const user = req.user;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Existing user
    const existingUser = await userModel.findById(user._id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const oldImageId = existingUser.profileImageId;

    // Upload image
    const uploadedImage = await uploadFile(req.file);

    if (!uploadedImage?.url || !uploadedImage?.fileId) {
      return res.status(500).json({
        success: false,
        message: "Image upload failed",
      });
    }

    // Update DB
    const updatedUser = await userModel.findByIdAndUpdate(
      user._id,
      {
        profileImage: uploadedImage.url,
        profileImageId: uploadedImage.fileId,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // Response
    res.status(200).json({
      success: true,
      message: "Profile image updated successfully",

      data: {
        profileImage: updatedUser.profileImage,
      },
    });

    // Delete old image async
    if (oldImageId) {
      try {
        await deleteFile(oldImageId);
      } catch (deleteError) {
        console.error("Old image delete failed:", deleteError);
      }
    }

  } catch (error) {

    console.error("Upload profile error:", error);

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
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 📩 Send email to admin
    await sendEmail(
      config.email,
      "New Quick Connect Request",
      adminEmailTemplate({ name,email, message })
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
    
    });
    console.log("Quick connect request:", { name, email, message });
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
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const sendOTP = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number required",
      });
    }

    const response = await axios.post(
      `https://control.msg91.com/api/v5/otp`,
      {
        mobile: `91${mobile}`,
        template_id: process.env.MSG91_TEMPLATE_ID,
        authkey: process.env.MSG91_AUTH_KEY,
      }
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: response.data,
    });
  } catch (error) {
    console.log(error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};
export const verifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile and OTP required",
      });
    }

    const response = await axios.get(
      `https://control.msg91.com/api/v5/otp/verify`,
      {
        params: {
          mobile: `91${mobile}`,
          otp,
          authkey: process.env.MSG91_AUTH_KEY,
        },
      }
    );

    if (response.data.type === "success") {
      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  } catch (error) {
    console.log(error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

// env required for MSG91 integration
// MSG91_AUTH_KEY=your_auth_key
// MSG91_TEMPLATE_ID=your_template_id
