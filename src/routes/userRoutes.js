import express from "express";
import authMiddleware from "../middleware/auth_validate.js";
import {
  registerUser,
  loginUser, 
  forgotPassword,
  verifyOtp, 
  resetPassword, 
  getUserProfile,
  quickConnect,
  sendLoginOtp,
  verifyLoginOtp,
  updateUserProfile,
  googleAuthCallback
}from "../controllers/usercontroller.js";

import { uploadProfileImage } from "../middleware/upload.js";
import { verifyResetToken, verifyVerifiedResetToken } from "../middleware/resetToken.middleware.js";
import passport from "passport";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authMiddleware, getUserProfile)
router.put("/edit-profile", authMiddleware, uploadProfileImage.single("profileImage"), updateUserProfile);


router.post("/forgot-password", forgotPassword);
//router.post("/verify-otp", verifyOtp)
router.post("/verify-otp",
  verifyResetToken,
  verifyOtp
);

router.post("/reset-password",
  verifyVerifiedResetToken,
  resetPassword
);

router.post("/connect",authMiddleware,quickConnect);

router.post("/send-mobile-otp", sendLoginOtp);
router.post("/verify-mobile-otp", verifyLoginOtp);




// google routes


// router.get("/google", passport.authenticate('google', { scope: ['email', 'profile'] }));

// router.get("/google/callback",
//     passport.authenticate('google', { session: false,  }),
//     googleAuthCallback
// )
// router.post("/google/android", googleAuthCallback);






router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  googleAuthCallback
);

// ANDROID
router.post("/google/android", googleAuthCallback);


export default router;