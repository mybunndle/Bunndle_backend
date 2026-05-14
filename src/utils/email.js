import nodemailer from "nodemailer";
import config from "../config/config.js";

// ✅ Create ONE global transporter
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",

  // ✅ More stable than 465 on Hostinger
  port: 587,
  secure: false,
  requireTLS: true,

  auth: {
    user: config.email,
    pass: config.password,
  },

  tls: {
    rejectUnauthorized: false,
  },

  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

// ✅ Verify once on server startup
transporter.verify((err) => {
  if (err) {
    console.log("SMTP VERIFY ERROR:", err);
  } else {
    console.log("SMTP READY");
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Bunndle Support" <${config.email}>`,
      to,
      subject,
      html,
    });

    console.log("✅ EMAIL SENT:", info.messageId);

    return true;
  } catch (error) {
    console.error("❌ EMAIL ERROR:", error);

    return false;
  }
};

export default sendEmail;


// import nodemailer from "nodemailer";
// import config from "../config/config.js";

// let transporter;

// const createTransporter = () => {
//   if (!transporter) {
//     transporter = nodemailer.createTransport({
//       host: "smtp.hostinger.com",
//       port: 465,
//       secure: true,

//       auth: {
//         user: config.email,
//         pass: config.password,
//       },

//       connectionTimeout: 20000,
//       greetingTimeout: 20000,
//       socketTimeout: 20000,
//     });

//     transporter.verify((err, success) => {
//       if (err) {
//         console.log("SMTP ERROR:", err);
//       } else {
//         console.log("SMTP READY");
//       }
//     });
//   }

//   return transporter;
// };

// export default createTransporter;