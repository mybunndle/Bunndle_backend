import sendEmail from "../utils/email.js";
// Update import path to match your actual filename.

export const sendPaymentWelcomeEmail = async ({
  email,
  name,
  assetName,
  assetCode,
  totalAmountPaid,
  fractionsPurchased,
}) => {
  const subject = "Welcome to Bunndle – Co-Ownership Confirmation";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">

      <div style="background:#102b58;color:white;padding:25px;text-align:center;">
        <h2>Welcome to Bunndle</h2>
        <p>Your Co-Ownership Journey Begins</p>
      </div>

      <div style="padding:25px;">

        <h3>Dear ${escapeHtml(name || "Customer")},</h3>

        <p>
          Congratulations! Your payment has been
          successfully received.
        </p>

        <p>
          Your co-ownership acquisition details are:
        </p>

        <table style="width:100%;border-collapse:collapse;">

          <tr>
            <td><strong>Asset Name</strong></td>
            <td>${escapeHtml(assetName || "N/A")}</td>
          </tr>

          <tr>
            <td><strong>Asset Code</strong></td>
            <td>${escapeHtml(assetCode || "N/A")}</td>
          </tr>

          <tr>
            <td><strong>Fractions Purchased</strong></td>
            <td>${escapeHtml(fractionsPurchased ?? "N/A")}</td>
          </tr>

          <tr>
            <td><strong>Total Amount Paid</strong></td>
            <td>₹${escapeHtml(totalAmountPaid ?? "N/A")}</td>
          </tr>

        </table>

        <h3>Generate Your Co-Ownership Agreement</h3>

        <p>
          Open Bunndle App →
          My Ownership →
          Purchase Tab →
          Generate Agreement
        </p>

        <p>
          Thank you for choosing Bunndle.
        </p>

        <p>
          Regards,<br/>
          <strong>Team Bunndle</strong><br/>
          Agent Alliance Private Limited
        </p>

      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
};

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]
  );