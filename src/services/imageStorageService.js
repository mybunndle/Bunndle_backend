// services/imageStorage.service.js
import ImageKit from "imagekit";
import config from "../config/config.js";
import crypto from "node:crypto";

const imagekit = new ImageKit({
  publicKey: config.IMAGEKIT_PUBLIC_KEY,
  privateKey: config.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: config.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Upload file buffer to ImageKit
 * @param {Object} file - multer file object
 * @returns {Promise<{url: string, fileId: string, name: string}>}
 */
export const uploadFile = async (file) => {
  try {
    const result = await imagekit.upload({
      file: file.buffer, // buffer works directly (no need .toString("base64"))
      fileName: Date.now() + "-" + file.originalname,
      folder: "Agent_alliance/Bunndle_profiles", // optional: organize files in ImageKit
    });

    return {
      url: result.url,
      fileId: result.fileId,
      name: result.name,
    };
  } catch (err) {
    throw new Error("Image upload failed: " + err.message);
  }
};

export const deleteFile = async (fileId) => {
  try {
    await imagekit.deleteFile(fileId);
  } catch (err) {
    console.error("ImageKit delete failed:", err.message);
  }
};

// For asset images, imagekit storage

export const uploadAssetFile = async (file) => {
  try {
    const result = await imagekit.upload({
      file: file.buffer,
      fileName: `asset-${Date.now()}-${file.originalname}`,
      folder: "Agent_alliance/assets", // ✅ separate folder
      useUniqueFileName: true,
    });

    return {
      url: result.url,
      fileId: result.fileId,
      filename: result.name,
    };
  } catch (err) {
    throw new Error("Asset upload failed: " + err.message);
  }
};

// export const deleteAssetFile = async (fileId) => {
//   try {
//     await imagekit.deleteFile(fileId);
//   } catch (err) {
//     console.error("ImageKit delete failed:", err.message);
//   }
// }
export const deleteAssetFile = async (fileId) => {
  try {
    // ✅ Prevent ImageKit error
    if (!fileId) {
      console.log("Skipping delete because fileId is missing");
      return false;
    }

    await imagekit.deleteFile(fileId);

    console.log("Image deleted successfully");

    return true;
  } catch (err) {
    console.error("ImageKit delete failed:", err.message);

    return false;
  }
};

export const uploadVehicleLogo = async (file) => {
  try {
    const result = await imagekit.upload({
      file: file.buffer,
      fileName: `vehicle-logo-${Date.now()}-${file.originalname}`,
      folder: "Agent_alliance/vehicle_logos", // ✅ separate folder
      useUniqueFileName: true,
    });

    return {
      url: result.url,
      fileId: result.fileId,
      filename: result.name,
    };
  } catch (err) {
    throw new Error("Vehicle logo upload failed: " + err.message);
  }
};
export const deleteVehicleLogo = async (fileId) => {
  try {
    await imagekit.deleteFile(fileId);
  } catch (err) {
    console.error("ImageKit delete failed:", err.message);
  }
};

export const uploadCoAssetFile = async (file) => {
  try {
    if (!file) {
      throw new Error("File is required");
    }

    const result = await imagekit.upload({
      file: file.buffer,
      fileName: `co-assets-${Date.now()}-${file.originalname}`,
      folder: "/Agent_alliance/co-assets",
      useUniqueFileName: true,
    });

    return {
      url: result.url,
      fileId: result.fileId,
      filename: result.name,
    };
  } catch (err) {
    console.error("ImageKit Upload Error:", err);

    throw new Error(`Co-asset upload failed: ${err.message}`);
  }
};
export const deleteCoAssetFile = async (fileId) => {
  try {
    if (!fileId) {
      console.warn("Skipping delete because fileId is missing");
      return;
    }

    await imagekit.deleteFile(fileId);

    return true;
  } catch (err) {
    console.error("ImageKit delete failed:", err.message);
    return false;
  }
};

export const uploadHomePageImage = async (file) => {
  try {
    if (!file) {
      throw new Error("File is required");
    }

    const result = await imagekit.upload({
      file: file.buffer,
      fileName: `home-page-${Date.now()}-${file.originalname}`,
      folder: "/Agent_alliance/home-page-images",
      useUniqueFileName: true,
    });

    return {
      url: result.url,
      fileId: result.fileId,
      filename: result.name,
    };
  } catch (err) {
    console.error("ImageKit Upload Error:", err);

    throw new Error(`Co-asset upload failed: ${err.message}`);
  }
};

export const uploadAgreementPdf = async (buffer, fileName) => {
  try {
    // ==========================================
    // VALIDATION
    // ==========================================

    if (!buffer) {
      throw new Error("PDF buffer is required");
    }

    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Invalid PDF buffer");
    }

    if (!fileName) {
      throw new Error("PDF file name is required");
    }

    // ==========================================
    // MAKE SURE FILE HAS .pdf EXTENSION
    // ==========================================

    const finalFileName = fileName.toLowerCase().endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;

    // ==========================================
    // UPLOAD PDF TO IMAGEKIT
    // ==========================================

    const result = await imagekit.upload({
      /*
       * ImageKit supports Buffer directly.
       * Same way you're uploading images.
       */
      file: buffer,

      fileName: finalFileName,

      folder: "/Agent_alliance/Bunndle_documents/agreements",

      useUniqueFileName: false,
    });

    // ==========================================
    // CHECK URL
    // ==========================================

    if (!result?.url) {
      throw new Error("ImageKit did not return PDF URL");
    }

    console.log("Agreement PDF uploaded successfully:", result.url);

    // ==========================================
    // RETURN ONLY URL
    // Because MongoDB will store only URL.
    // ==========================================

    return {
      url: result.url,
    };
  } catch (err) {
    console.error("ImageKit Agreement PDF Upload Error:", err);

    throw new Error(`Agreement PDF upload failed: ${err.message}`);
  }
};

export const uploadPaymentReceiptPdf = async (buffer, fileName) => {
  try {
    if (!buffer) {
      throw new Error("Payment receipt PDF buffer is required");
    }

    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Invalid payment receipt PDF buffer");
    }

    if (!fileName) {
      throw new Error("Payment receipt file name is required");
    }

    const finalFileName = fileName.toLowerCase().endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;

    const result = await imagekit.upload({
      file: buffer,

      fileName: finalFileName,

      folder: "/Agent_alliance/Bunndle_documents/payment_receipts",

      useUniqueFileName: false,
    });

    if (!result?.url) {
      throw new Error("ImageKit did not return payment receipt URL");
    }

    return {
      url: result.url,
    };
  } catch (error) {
    console.error("IMAGEKIT PAYMENT RECEIPT UPLOAD ERROR:", error);

    throw new Error(`Payment receipt upload failed: ${error.message}`);
  }
};



// ============================================
// MANUAL PAYMENT SCREENSHOT UPLOAD
// ============================================

export const uploadManualPaymentScreenshot = async (file, orderId) => {
  try {
    // ========================================
    // VALIDATION
    // ========================================

    if (!file) {
      throw new Error("Screenshot file is required");
    }

    if (!Buffer.isBuffer(file.buffer)) {
      throw new Error("Invalid screenshot buffer");
    }

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error("Only JPG and PNG screenshots are allowed");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Screenshot size must not exceed 5 MB");
    }

    // Verify actual file signature.
    const buffer = file.buffer;

    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isPng =
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    if (
      (file.mimetype === "image/jpeg" && !isJpeg) ||
      (file.mimetype === "image/png" && !isPng)
    ) {
      throw new Error("Invalid screenshot content");
    }

    // ========================================
    // FILE NAME
    // ========================================

    const extension = file.mimetype === "image/png" ? "png" : "jpg";

    const fileName =
      `manual-payment-${orderId}-` + `${crypto.randomUUID()}.${extension}`;

    // ========================================
    // UPLOAD TO IMAGEKIT
    // ========================================

    const result = await imagekit.upload({
      file: file.buffer,

      fileName,

      folder: `/Agent_alliance/Bunndle_documents/manual_payments/${orderId}`,

      useUniqueFileName: true,

      isPrivateFile: true,
    });

    if (!result?.url || !result?.fileId) {
      throw new Error("ImageKit did not return upload details");
    }

    return {
      url: result.url,
      fileId: result.fileId,
      filename: result.name,
    };
  } catch (error) {
    console.error("MANUAL PAYMENT SCREENSHOT UPLOAD ERROR:", error);

    throw new Error(
      `Manual payment screenshot upload failed: ${error.message}`,
    );
  }
};

// ============================================
// DELETE MANUAL PAYMENT SCREENSHOT
// ============================================

export const deleteManualPaymentScreenshot = async (fileId) => {
  try {
    if (!fileId) {
      return false;
    }

    await imagekit.deleteFile(fileId);

    return true;
  } catch (error) {
    console.error("MANUAL PAYMENT SCREENSHOT DELETE ERROR:", error);

    return false;
  }
};

// ============================================
// GENERATE SIGNED SCREENSHOT URL
// ============================================

export const getManualPaymentScreenshotSignedUrl = (url) => {
  if (!url) {
    throw new Error("Screenshot URL is required");
  }

  const parsedUrl = new URL(url);

  // Only sign URLs belonging to our configured
  // ImageKit endpoint.
  const configuredEndpoint = new URL(config.IMAGEKIT_URL_ENDPOINT);

  if (parsedUrl.origin !== configuredEndpoint.origin) {
    throw new Error("Invalid screenshot origin");
  }

  const endpointPath = configuredEndpoint.pathname.replace(/\/$/, "");

  if (
    endpointPath &&
    !(
      parsedUrl.pathname === endpointPath ||
      parsedUrl.pathname.startsWith(`${endpointPath}/`)
    )
  ) {
    throw new Error("Invalid ImageKit screenshot path");
  }

  const imagePath = parsedUrl.pathname.slice(endpointPath.length);

  if (
    !imagePath.startsWith("/Agent_alliance/Bunndle_documents/manual_payments/")
  ) {
    throw new Error("Invalid manual payment screenshot path");
  }

  return imagekit.url({
    path: imagePath,
    signed: true,
    expireSeconds: 300,
  });
};
