import  CorporateEnquiry from "../model/corporate_enquiryModel.js";
import IndividualEnquiry from "../model/Individual_enquiryModel.js";
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

    let savedData;
    let userEmail;
    let adminSubject;
    let adminHtml;
    let userHtml;

    const adminEmail = process.env.EMAIL_FROM;

    if (!adminEmail) {
      return res.status(500).json({
        success: false,
        message: "Admin email is missing in EMAIL_FROM.",
      });
    }

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

      adminHtml = `
        <h2>New Corporate Enquiry</h2>

        <p><strong>Company Name:</strong> ${companyName}</p>
        <p><strong>Point of Contact:</strong> ${pointOfContact}</p>
        <p><strong>Mobile:</strong> ${mobile}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>City:</strong> ${city}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Message:</strong> ${message}</p>
      `;

      userHtml = `
        <h2>Thank you for contacting Bunndle</h2>

        <p>Hello ${pointOfContact},</p>

        <p>
          We have received your corporate enquiry for 
          <strong>${companyName}</strong>.
        </p>

        <p>Our team will contact you soon.</p>

        <p><strong>Your Message:</strong></p>
        <p>${message}</p>

        <br />

        <p>Regards,<br />Bunndle Team</p>
      `;
    }

    if (userType === "individual") {
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

      adminHtml = `
        <h2>New Individual Enquiry</h2>

        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Mobile:</strong> ${mobile}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>City:</strong> ${city}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Message:</strong> ${message}</p>
      `;

      userHtml = `
        <h2>Thank you for contacting Bunndle</h2>

        <p>Hello ${name},</p>

        <p>We have received your enquiry.</p>
        <p>Our team will contact you soon.</p>

        <p><strong>Your Message:</strong></p>
        <p>${message}</p>

        <br />

        <p>Regards,<br />Bunndle Team</p>
      `;
    }

    const [adminEmailSent, userEmailSent] = await Promise.all([
      sendEmail({
        to: adminEmail,
        subject: adminSubject,
        html: adminHtml,
      }),

      sendEmail({
        to: userEmail,
        subject: "Thank you for contacting Bunndle",
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