import multer from "multer";

export const uploadProfileImage = multer({
  storage: multer.memoryStorage(), // 🔥 required for sharp
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max input
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

export const uploadAssetImages = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5                   // max 5 files
  },

  // ✅ HERE is your fileFilter
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  }
});