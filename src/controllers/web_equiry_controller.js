import mongoose from "mongoose";
import CorporateEnquiry from "../model/corporate_enquiryModel.js";
import IndividualEnquiry from "../model/Individual_enquiryModel.js";
import adminEnquiryTemplate from "../utils/web_adminEmailTemplate.js";
import userEnquiryTemplate from "../utils/web_userEmailTemplate.js";
import WebAsset from "../model/web_asset_model.js";
import sendEmail from "../utils/email.js";

export const submitEnquiry = async (req, res) => {
  try {
    const { userType } = req.body;
    const { assetId } = req.params;

    if (!userType) {
      return res.status(400).json({
        success: false,
        message: "User type is required.",
      });
    }

    if (!["corporate", "individual"].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type. Use corporate or individual.",
      });
    }

    if (!assetId) {
      return res.status(400).json({
        success: false,
        message: "Asset ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID.",
      });
    }

    const asset = await WebAsset.findById(assetId).lean();

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    const adminEmail = process.env.EMAIL_FROM;

    if (!adminEmail) {
      return res.status(500).json({
        success: false,
        message: "Admin email is missing in EMAIL_FROM.",
      });
    }

    let savedData;
    let userEmail;
    let adminSubject;
    let templateData;

    const assetDetails = {
      id: asset._id.toString(),
      assetName: asset.assetName,
      brand: asset.brand,
      model: asset.model,
      category: asset.category,
      subCategory: asset.subCategory,
      price: asset.price,
      purchaseYear: asset.purchaseYear,
      imageUrl: asset.files?.[0]?.url || null,
    };

    if (userType === "corporate") {
      const {
        companyName,
        pointOfContact,
        mobile,
        email,
        city,
        address,
        message,
      } = req.body;

      if (
        !companyName ||
        !pointOfContact ||
        !mobile ||
        !email ||
        !city ||
        !address ||
        !message
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Company name, point of contact, mobile, email, city, address and message are required.",
        });
      }

      savedData = await CorporateEnquiry.create({
        assetId: asset._id,
        companyName,
        pointOfContact,
        mobile,
        email,
        city,
        address,
        message,
      });

      userEmail = email;
      adminSubject = `New Corporate Enquiry - ${
        asset.assetName || `${asset.brand || ""} ${asset.model || ""}`.trim()
      }`;

      templateData = {
        userType,
        companyName,
        pointOfContact,
        mobile,
        email,
        city,
        address,
        message,
        asset: assetDetails,
      };
    } else {
      const { name, mobile, email, city, address, message } = req.body;

      if (!name || !mobile || !email || !city || !address || !message) {
        return res.status(400).json({
          success: false,
          message:
            "Name, mobile, email, city, address and message are required.",
        });
      }

      savedData = await IndividualEnquiry.create({
        assetId: asset._id,
        name,
        mobile,
        email,
        city,
        address,
        message,
      });

      userEmail = email;
      adminSubject = `New Individual Enquiry - ${
        asset.assetName || `${asset.brand || ""} ${asset.model || ""}`.trim()
      }`;

      templateData = {
        userType,
        name,
        mobile,
        email,
        city,
        address,
        message,
        asset: assetDetails,
      };
    }

    const adminHtml = adminEnquiryTemplate(templateData);
    const userHtml = userEnquiryTemplate(templateData);

    const [adminEmailSent, userEmailSent] = await Promise.all([
      sendEmail({
        to: adminEmail,
        subject: adminSubject,
        html: adminHtml,
      }),

      sendEmail({
        to: userEmail,
        subject: "Your Bunndle Asset Enquiry Has Been Received",
        html: userHtml,
      }),
    ]);

    return res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully.",
      emailStatus: {
        adminEmailSent,
        userEmailSent,
      },
      asset: assetDetails,
      data: savedData,
    });
  } catch (error) {
    console.error("SUBMIT ENQUIRY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to submit enquiry.",
    });
  }
};