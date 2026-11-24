
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value || 0));

const manualBankDetailsTemplate = ({
  customerName,
  orderId,
  assetName,
  fractions,
  amountPerFraction,
  totalAmount,
  bankAccountHolder,
  bankName,
  bankAccountNumber,
  bankIfsc,
  expiresAt,
}) => {
  const name = escapeHtml(customerName || "Customer");

  const order = escapeHtml(orderId);
  const asset = escapeHtml(assetName || "N/A");

  const fractionCount = escapeHtml(fractions);

  const fractionAmount = escapeHtml(
    formatINR(amountPerFraction)
  );

  const payableAmount = escapeHtml(
    formatINR(totalAmount)
  );

  const holder = escapeHtml(bankAccountHolder);
  const bank = escapeHtml(bankName);
  const account = escapeHtml(bankAccountNumber);
  const ifsc = escapeHtml(bankIfsc);

  const deadline = expiresAt
    ? new Date(expiresAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "long",
        timeStyle: "short",
      })
    : null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />

  <title>Bunndle - Bank Transfer & Payment Instructions</title>

  <style>
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #f2f5f9;
      color: #172033;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
    }

    table {
      border-spacing: 0;
    }

    td {
      overflow-wrap: anywhere;
    }

    img {
      border: 0;
      outline: none;
      text-decoration: none;
    }

    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }

      .email-content {
        padding: 20px 16px !important;
      }

      .email-heading {
        font-size: 21px !important;
      }

      .table-cell {
        padding: 10px 8px !important;
        font-size: 12px !important;
      }
    }
  </style>
</head>

<body
  bgcolor="#f2f5f9"
  style="
    margin:0;
    padding:0;
    background-color:#f2f5f9;
    font-family:Arial,Helvetica,sans-serif;
    color:#172033;
  "
>
  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    bgcolor="#f2f5f9"
    style="background-color:#f2f5f9;"
  >
    <tr>
      <td align="center" style="padding:24px 10px;">

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          bgcolor="#ffffff"
          class="email-container"
          style="
            max-width:640px;
            background-color:#ffffff;
            border:1px solid #dce4ed;
          "
        >

          <!-- ================= LOGO HEADER ================= -->

          <tr>
            <td
              align="center"
              bgcolor="#ffffff"
              style="
                padding:28px 20px;
                background-color:#ffffff;
                border-bottom:3px solid #ff7919;
              "
            >
              <img
                src="https://ik.imagekit.io/bunndle/logo/WhatsApp%20Image%202026-07-10%20at%2012.02.32.jpeg?updatedAt=1783666098521"
                alt="Bunndle Logo"
                width="130"
                style="
                  display:block;
                  width:130px;
                  max-width:100%;
                  height:auto;
                  margin:0 auto;
                "
              />
            </td>
          </tr>

          <!-- ================= MAIN CONTENT ================= -->

          <tr>
            <td
              bgcolor="#ffffff"
              class="email-content"
              style="
                padding:28px 24px;
                background-color:#ffffff;
                color:#172033;
                font-size:14px;
                line-height:1.7;
              "
            >

              <h1
                class="email-heading"
                style="
                  margin:0 0 24px;
                  color:#124f8c;
                  font-size:24px;
                  font-weight:700;
                  text-align:center;
                  line-height:1.4;
                "
              >
                Bank Transfer &amp; Payment Instructions
              </h1>

              <!-- GREETING -->

              <p>Dear <strong>${name}</strong>,</p>

              <p>
                Greetings from <strong>Team Bunndle!</strong>
              </p>

              <p>
                Thank you for choosing Bunndle and initiating
                a manual payment request for your asset fraction
                ownership purchase through the Bunndle mobile
                application.
              </p>

              <p>
                Following the review of your request by our team,
                you may now proceed with the bank transfer using
                the official company bank account details below.
              </p>

              <!-- ================= STATUS ================= -->

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                bgcolor="#fff3e5"
                style="
                  margin:22px 0;
                  background-color:#fff3e5;
                  border:1px solid #f5b779;
                  border-radius:6px;
                "
              >
                <tr>
                  <td align="center" style="padding:18px 12px;">

                    <div
                      style="
                        font-size:17px;
                        font-weight:bold;
                        color:#b45309;
                      "
                    >
                      Awaiting Bank Transfer
                    </div>

                    <div
                      style="
                        font-size:12px;
                        color:#334155;
                        margin-top:5px;
                      "
                    >
                      Order ID: <strong>${order}</strong>
                    </div>

                  </td>
                </tr>
              </table>

              <!-- ================= ASSET DETAILS ================= -->

              <h2
                style="
                  font-size:18px;
                  color:#124f8c;
                  margin:26px 0 12px;
                "
              >
                Asset &amp; Order Details
              </h2>

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  border-collapse:collapse;
                  font-size:13px;
                  border:1px solid #cbd5e1;
                "
              >
                <tr bgcolor="#124f8c">
                  <th
                    align="left"
                    style="padding:12px;color:#ffffff;"
                  >
                    Particulars
                  </th>
                  <th
                    align="left"
                    style="padding:12px;color:#ffffff;"
                  >
                    Details
                  </th>
                </tr>

                <tr bgcolor="#edf3fa">
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    Asset Name
                  </td>
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    <strong>${asset}</strong>
                  </td>
                </tr>

                <tr bgcolor="#ffffff">
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    Number of Fractions
                  </td>
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    ${fractionCount}
                  </td>
                </tr>

                <tr bgcolor="#edf3fa">
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    Cost Per Fraction
                  </td>
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    ${fractionAmount}
                  </td>
                </tr>

                <tr bgcolor="#dbeafe">
                  <td class="table-cell" style="padding:14px 12px;color:#124f8c;">
                    <strong>Total Amount Payable</strong>
                  </td>
                  <td
                    class="table-cell"
                    style="
                      padding:14px 12px;
                      font-size:17px;
                      color:#124f8c;
                    "
                  >
                    <strong>${payableAmount}</strong>
                  </td>
                </tr>
              </table>

              <!-- ================= BANK DETAILS ================= -->

              <h2
                style="
                  font-size:18px;
                  color:#124f8c;
                  margin:28px 0 10px;
                "
              >
                Bank Account Details
              </h2>

              <p>
                Kindly transfer the payable amount to our
                official company bank account mentioned below:
              </p>

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  border-collapse:collapse;
                  border:1px solid #cbd5e1;
                  font-size:13px;
                "
              >
                <tr bgcolor="#124f8c">
                  <th
                    colspan="2"
                    align="left"
                    style="padding:12px;color:#ffffff;"
                  >
                    Official Company Bank Account
                  </th>
                </tr>

                <tr bgcolor="#edf3fa">
                  <td class="table-cell" width="43%" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    Account Holder Name
                  </td>
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    <strong>${holder}</strong>
                  </td>
                </tr>

                <tr bgcolor="#ffffff">
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    Bank Name
                  </td>
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    <strong>${bank}</strong>
                  </td>
                </tr>

                <tr bgcolor="#edf3fa">
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    Account Number
                  </td>
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;font-size:15px;">
                    <strong>${account}</strong>
                  </td>
                </tr>

                <tr bgcolor="#ffffff">
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    IFSC Code
                  </td>
                  <td class="table-cell" style="padding:12px;border-bottom:1px solid #cbd5e1;">
                    <strong>${ifsc}</strong>
                  </td>
                </tr>

                <tr bgcolor="#dbeafe">
                  <td class="table-cell" style="padding:14px 12px;color:#124f8c;">
                    <strong>Amount to Transfer</strong>
                  </td>
                  <td class="table-cell" style="padding:14px 12px;color:#124f8c;font-size:18px;">
                    <strong>${payableAmount}</strong>
                  </td>
                </tr>
              </table>

              ${
                deadline
                  ? `
                    <p style="
                      margin:22px 0;
                      color:#b45309;
                      font-size:14px;
                    ">
                      <strong>Payment Deadline:</strong>
                      ${escapeHtml(deadline)} IST
                    </p>
                  `
                  : ""
              }

              <!-- ================= PAYMENT INSTRUCTIONS ================= -->

              <h2
                style="
                  font-size:18px;
                  color:#124f8c;
                  margin:28px 0 10px;
                "
              >
                Payment Confirmation &amp; Verification
              </h2>

              <p>
                Once you have successfully completed the bank
                transfer, kindly follow the steps below:
              </p>

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                bgcolor="#edf3fa"
                style="
                  background-color:#edf3fa;
                  border-left:4px solid #ff7919;
                  border-radius:5px;
                "
              >
                <tr>
                  <td style="padding:18px 16px;">

                    <ol
                      style="
                        margin:0;
                        padding-left:20px;
                        font-size:13px;
                        color:#172033;
                        line-height:1.9;
                      "
                    >
                      <li>
                        Open the <strong>Bunndle mobile application</strong>.
                      </li>
                      <li>
                        Navigate to the <strong>Co-Own</strong> section.
                      </li>
                      <li>
                        Select your asset –
                        <strong>${asset}</strong>.
                      </li>
                      <li>
                        Click <strong>Upload Payment Receipt</strong>.
                      </li>
                      <li>
                        Enter your payment details, including UTR,
                        upload the screenshot or bank receipt,
                        and click <strong>Submit</strong>.
                      </li>
                    </ol>

                  </td>
                </tr>
              </table>

              <p style="margin:20px 0;">
                Our team will review and verify the submitted
                payment details. Upon successful verification,
                your asset fraction ownership will be allocated,
                and you will be able to generate your
                <strong>Co-Ownership Agreement</strong>
                through the Bunndle mobile application.
              </p>

              <!-- ================= IMPORTANT INSTRUCTIONS ================= -->

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                bgcolor="#fff3e5"
                style="
                  margin:24px 0;
                  background-color:#fff3e5;
                  border:1px solid #f5b779;
                  border-radius:6px;
                "
              >
                <tr>
                  <td style="padding:18px;">

                    <h3
                      style="
                        font-size:16px;
                        color:#b45309;
                        margin:0 0 12px;
                      "
                    >
                      Important Instructions
                    </h3>

                    <ul
                      style="
                        margin:0;
                        padding-left:18px;
                        font-size:13px;
                        line-height:1.8;
                        color:#78350f;
                      "
                    >
                      <li>
                        Transfer the exact amount mentioned in this email.
                      </li>
                      <li>
                        Verify the beneficiary name and bank details.
                      </li>
                      <li>
                        Ensure the UTR and payment receipt are accurate.
                      </li>
                      <li>
                        Submit payment details through the Bunndle app.
                      </li>
                      <li>
                        Ownership allocation is subject to bank
                        verification and fraction availability.
                      </li>
                    </ul>

                  </td>
                </tr>
              </table>

              <!-- ================= CLOSING ================= -->

              <h2
                style="
                  font-size:18px;
                  color:#124f8c;
                  margin:24px 0 12px;
                "
              >
                Welcome to a Smarter Way of Co-Owning Assets
              </h2>

              <p>
                Thank you for choosing Bunndle.
                We look forward to welcoming you as a fraction owner.
              </p>

              <p>
                For assistance with your payment,
                please contact our support team.
              </p>

              <p
                style="
                  text-align:center;
                  color:#e66b00;
                  font-weight:bold;
                  font-size:16px;
                  margin:30px 0;
                "
              >
                Own Together. Earn Together.
              </p>

              <p style="font-size:13px;line-height:1.8;">
                Warm regards,<br>
                <strong style="color:#124f8c;">Team Bunndle</strong>
                <br>
                A Brand of Agent Alliance Private Limited
              </p>
            </td>
          </tr>

          <!-- ================= FOOTER ================= -->

          <tr>
            <td
              align="center"
              bgcolor="#124f8c"
              style="
                background-color:#124f8c;
                color:#ffffff;
                padding:26px 15px;
                font-size:13px;
                line-height:1.9;
              "
            >
              <strong style="color:#ffffff;font-size:16px;">
                Need Assistance?
              </strong>

              <br><br>

              <a
                href="mailto:support@bunndle.in"
                style="color:#ffffff;text-decoration:underline;"
              >
                support@bunndle.in
              </a>

              <br>

              <a
                href="mailto:info@bunndle.in"
                style="color:#ffffff;text-decoration:underline;"
              >
                info@bunndle.in
              </a>

              <br>

              <a
                href="https://www.bunndle.in/"
                style="color:#ffffff;text-decoration:underline;"
              >
                www.bunndle.in
              </a>
            </td>
          </tr>

          <!-- ================= DISCLAIMER ================= -->

          <tr>
            <td
              align="center"
              bgcolor="#edf2f7"
              style="
                padding:18px;
                background-color:#edf2f7;
                color:#334155;
                font-size:11px;
                line-height:1.7;
              "
            >
              <strong>Disclaimer:</strong>
              This email contains bank transfer instructions
              for your manual payment order. Receipt submission
              does not constitute payment approval or ownership
              allocation. Ownership rights, rental terms,
              lock-in periods and exit provisions are governed
              by the applicable Co-Ownership Agreement.
            </td>
          </tr>

        </table>

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="max-width:640px;"
        >
          <tr>
            <td
              align="center"
              style="
                padding:18px 10px;
                font-size:11px;
                color:#475569;
              "
            >
              &copy; ${new Date().getFullYear()}
              Agent Alliance Private Limited.
              All rights reserved.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;
};

export default manualBankDetailsTemplate;
