import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({

  host: process.env.EMAIL_HOST,

  port: Number(process.env.EMAIL_PORT),

  secure: false,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  tls: {
    rejectUnauthorized: false,
  },

});

transporter.verify((error, success) => {

  if (error) {

    console.log("❌ SMTP VERIFY ERROR:", error);

  } else {

    console.log("✅ BREVO SMTP READY");
  }
});

const sendEmail = async ({
  to,
  subject,
  html,
}) => {

  try {

    const info = await transporter.sendMail({

      from: `Bunndle <${process.env.EMAIL_FROM}>`,

      to,

      subject,

      html,

    });

    console.log("✅ EMAIL SENT:", info.messageId);

    return true;

  } catch (error) {

    console.log("❌ EMAIL ERROR:", error);

    return false;
  }
};

export default sendEmail;

// import nodemailer from "nodemailer";
// import config from "../config/config.js";

// // ✅ AWS SES Production Transporter
// const transporter = nodemailer.createTransport({
//   host: "email-smtp.ap-south-1.amazonaws.com",

//   // ✅ Recommended port for AWS SES
//   port: 587,

//   secure: false,
//   requireTLS: true,

//   auth: {
//     user: config.smtpUser,
//     pass: config.smtpPass,
//   },

//   tls: {
//     rejectUnauthorized: false,
//   },

//   // ✅ Production Stability
//   pool: true,
//   maxConnections: 5,
//   maxMessages: 100,

//   connectionTimeout: 20000,
//   greetingTimeout: 20000,
//   socketTimeout: 20000,
// });

// // ✅ Verify transporter on startup
// transporter.verify((err) => {
//   if (err) {
//     console.log("❌ SMTP VERIFY ERROR:", err);
//   } else {
//     console.log("✅ AWS SES SMTP READY");
//   }
// });

// // ✅ Reusable Email Function
// const sendEmail = async (to, subject, html) => {
//   try {
//     const info = await transporter.sendMail({
//       from: `"Bunndle Support" <${config.email}>`,
//       to,
//       subject,
//       html,
//     });

//     console.log("✅ EMAIL SENT:", info.messageId);

//     return true;

//   } catch (error) {
//     console.error("❌ EMAIL ERROR:", error);

//     return false;
//   }
// };

// export default sendEmail;