// services/imageStorage.service.js
import ImageKit from "imagekit";
import  config from "../config/config.js";

const imagekit = new ImageKit({
  publicKey: config.IMAGEKIT_PUBLIC_KEY,
  privateKey: config.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint:config.IMAGEKIT_URL_ENDPOINT
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
}



// For asset images, imagekit storage

export const uploadAssetFile = async (file) => {
  try {
    const result = await imagekit.upload({
      file: file.buffer,
      fileName: `asset-${Date.now()}-${file.originalname}`,
      folder: "Agent_alliance/assets",   // ✅ separate folder
      useUniqueFileName: true,
    });

    return {
      url: result.url,
      fileId: result.fileId,
      filename: result.name
    };

  } catch (err) {
    throw new Error("Asset upload failed: " + err.message);
  }
};

 











