import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is missing in environment variables");
  }

  if (!user?._id) {
    throw new Error("Valid user is required to generate token");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      type: user.type || "USER",
    },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      algorithm: "HS256",
      issuer: "bunndle-api",
      audience: "bunndle-app",
    }
  );
};