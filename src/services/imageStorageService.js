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
      console.log(
        "Skipping delete because fileId is missing"
      );
      return false;
    }

    await imagekit.deleteFile(fileId);

    console.log("Image deleted successfully");

    return true;

  } catch (err) {

    console.error(
      "ImageKit delete failed:",
      err.message
    );

    return false;
  }
};


export const uploadVehicleLogo = async (file) => {
  try{
    const result = await imagekit.upload({
      file: file.buffer,
      fileName: `vehicle-logo-${Date.now()}-${file.originalname}`,
      folder: "Agent_alliance/vehicle_logos",   // ✅ separate folder
      useUniqueFileName: true,
    });

    return {
      url: result.url,
      fileId: result.fileId,
      filename: result.name
    };
  } catch (err) {
    throw new Error("Vehicle logo upload failed: " + err.message);
  }
}
export const deleteVehicleLogo = async (fileId) => {
  try {
    await imagekit.deleteFile(fileId);
  }
  catch (err) {
    console.error("ImageKit delete failed:", err.message);
  }
}

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

    throw new Error(
      `Co-asset upload failed: ${err.message}`
    );
  }
};
export const deleteCoAssetFile = async (fileId) => {
  try {
    if (!fileId) {
      console.warn(
        "Skipping delete because fileId is missing"
      );
      return;
    }

    await imagekit.deleteFile(fileId);

    return true;
  } catch (err) {
    console.error(
      "ImageKit delete failed:",
      err.message
    );
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

    throw new Error(
      `Co-asset upload failed: ${err.message}`
    );
  }
};

 

export const uploadAgreementPdf = async (
  buffer,
  fileName
) => {
  try {
    // ==========================================
    // VALIDATION
    // ==========================================

    if (!buffer) {
      throw new Error(
        "PDF buffer is required"
      );
    }

    if (!Buffer.isBuffer(buffer)) {
      throw new Error(
        "Invalid PDF buffer"
      );
    }

    if (!fileName) {
      throw new Error(
        "PDF file name is required"
      );
    }


    // ==========================================
    // MAKE SURE FILE HAS .pdf EXTENSION
    // ==========================================

    const finalFileName =
      fileName
        .toLowerCase()
        .endsWith(".pdf")
        ? fileName
        : `${fileName}.pdf`;


    // ==========================================
    // UPLOAD PDF TO IMAGEKIT
    // ==========================================

    const result =
      await imagekit.upload({
        /*
         * ImageKit supports Buffer directly.
         * Same way you're uploading images.
         */
        file: buffer,

        fileName:
          finalFileName,

        folder:
          "/Agent_alliance/Bunndle_documents/agreements",

        useUniqueFileName:
          false,
      });


    // ==========================================
    // CHECK URL
    // ==========================================

    if (!result?.url) {
      throw new Error(
        "ImageKit did not return PDF URL"
      );
    }


    console.log(
      "Agreement PDF uploaded successfully:",
      result.url
    );


    // ==========================================
    // RETURN ONLY URL
    // Because MongoDB will store only URL.
    // ==========================================

    return {
      url: result.url,
    };

  } catch (err) {
    console.error(
      "ImageKit Agreement PDF Upload Error:",
      err
    );


    throw new Error(
      `Agreement PDF upload failed: ${err.message}`
    );
  }
};



export const uploadPaymentReceiptPdf = async (
  buffer,
  fileName
) => {
  try {
    if (!buffer) {
      throw new Error(
        "Payment receipt PDF buffer is required"
      );
    }

    if (!Buffer.isBuffer(buffer)) {
      throw new Error(
        "Invalid payment receipt PDF buffer"
      );
    }

    if (!fileName) {
      throw new Error(
        "Payment receipt file name is required"
      );
    }

    const finalFileName =
      fileName
        .toLowerCase()
        .endsWith(".pdf")
        ? fileName
        : `${fileName}.pdf`;

    const result =
      await imagekit.upload({
        file:
          buffer,

        fileName:
          finalFileName,

        folder:
          "/Agent_alliance/Bunndle_documents/payment_receipts",

        useUniqueFileName:
          false,
      });


    if (!result?.url) {
      throw new Error(
        "ImageKit did not return payment receipt URL"
      );
    }


    return {
      url:
        result.url,
    };

  } catch (error) {
    console.error(
      "IMAGEKIT PAYMENT RECEIPT UPLOAD ERROR:",
      error
    );

    throw new Error(
      `Payment receipt upload failed: ${error.message}`
    );
  }
};










