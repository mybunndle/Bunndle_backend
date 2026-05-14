import nodemailer from "nodemailer";
import config from "../config/config.js";

let transporter; // ✅ singleton

const createTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,           // ✅ stable port
      secure: true,        // ✅ must be true for 465
      pool: true,          // ✅ reuse connection (FAST)
      maxConnections: 5,
      maxMessages: 100,
      auth: {
        user: config.email,      // your gmail
        pass: config.password,   // app password
      },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 20_000,
    });
  }

  return transporter;
};

const sendEmail = async (to, subject, html) => {
  try {
    const mailer = createTransporter();

    await mailer.sendMail({
      from: `"Bunndel Support" <${config.email}>`,
      to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
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