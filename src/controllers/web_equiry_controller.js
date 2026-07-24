import  CorporateEnquiry from "../model/corporate_enquiryModel.js";
import IndividualEnquiry from "../model/Individual_enquiryModel.js";
import { adminEnquiryTemplate } from "../utils/web_adminEmailTemplate.js";
import { userEnquiryTemplate } from "../utils/web_userEmailTemplate.js"
import sendEmail from "../utils/email.js";

export const submitEnquiry = async (req, res) => {
  try {
    const { userType } = req.body;

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
        companyName,
        pointOfContact,
        mobile,
        email,
        city,
        address,
        message,
      });

      userEmail = email;
      adminSubject = "New Corporate Enquiry - Bunndle";

      templateData = {
        userType,
        companyName,
        pointOfContact,
        mobile,
        email,
        city,
        address,
        message,
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
        name,
        mobile,
        email,
        city,
        address,
        message,
      });

      userEmail = email;
      adminSubject = "New Individual Enquiry - Bunndle";

      templateData = {
        userType,
        name,
        mobile,
        email,
        city,
        address,
        message,
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
        subject: "Thank You for Contacting Bunndle",
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