
const paymentSuccessTemplate = (data = {}) => {
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const requiredFields = [
    "customerName",
    "assetName",
    "transactionId",
    "fractionsAcquired",
    "totalAmountPaid",
    "acquisitionDate",
    "totalFixedMonthlyRental",
  ];

  for (const field of requiredFields) {
    if (
      data[field] === undefined ||
      data[field] === null ||
      String(data[field]).trim() === ""
    ) {
      throw new Error(`${field} is required`);
    }
  }

  const formatAmount = (value) => {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Invalid amount");
    }

    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid acquisition date");
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  };

  const customerName = escapeHtml(data.customerName);
  const assetName = escapeHtml(data.assetName);
  const transactionId = escapeHtml(data.transactionId);
  const fractionsAcquired = escapeHtml(data.fractionsAcquired);
  const totalAmountPaid = formatAmount(data.totalAmountPaid);
  const acquisitionDate = formatDate(data.acquisitionDate);
  const totalFixedMonthlyRental = formatAmount(
    data.totalFixedMonthlyRental
  );

  const detailRow = (label, value, highlight = false) => `
    <tr>
      <td
        style="
          padding:12px 10px;
          border-bottom:1px solid #e3edf7;
          font-size:13px;
          color:#64748b;
          vertical-align:top;
          width:45%;
        "
      >
        ${label}
      </td>
      <td
        align="right"
        style="
          padding:12px 10px;
          border-bottom:1px solid #e3edf7;
          font-size:13px;
          color:${highlight ? "#0f4f91" : "#1f2937"};
          font-weight:${highlight ? "700" : "600"};
          overflow-wrap:anywhere;
          vertical-align:top;
        "
      >
        ${value}
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bunndle Payment Confirmation</title>
</head>

<body
  bgcolor="#f3f7fb"
  style="
    margin:0;
    padding:0;
    background-color:#f3f7fb;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    bgcolor="#f3f7fb"
    style="
      width:100%;
      background-color:#f3f7fb;
      padding:18px 8px;
    "
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          bgcolor="#ffffff"
          style="
            width:100%;
            max-width:560px;
            background-color:#ffffff;
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 8px 24px rgba(14,61,105,0.10);
          "
        >

          <tr>
            <td
              align="center"
              bgcolor="#0f4f91"
              style="
                background-color:#0f4f91;
                padding:26px 18px 24px;
              "
            >
              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin:0 auto 14px;"
              >
                <tr>
                  <td
                    align="center"
                    width="104"
                    bgcolor="#ffffff"
                    style="
                      width:104px;
                      background-color:#ffffff;
                      border-radius:14px;
                      overflow:hidden;
                      padding:0;
                      line-height:0;
                    "
                  >
                    <img
                      src="https://ik.imagekit.io/bunndle/logo/WhatsApp%20Image%202026-07-10%20at%2012.02.32.jpeg"
                      alt="Bunndle"
                      width="104"
                      style="
                        display:block;
                        width:104px;
                        height:auto;
                        border:0;
                        margin:0 auto;
                      "
                    />
                  </td>
                </tr>
              </table>

              <h1
                style="
                  margin:0;
                  color:#ffffff;
                  font-family:Georgia,'Times New Roman',serif;
                  font-size:27px;
                  line-height:1.3;
                  font-weight:700;
                "
              >
                Payment Successful!
              </h1>

              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin:14px auto 12px;"
              >
                <tr>
                  <td
                    width="78"
                    bgcolor="#f58220"
                    style="height:1px;font-size:0;"
                  ></td>
                  <td
                    style="
                      padding:0 9px;
                      color:#f58220;
                      font-size:11px;
                    "
                  >◆</td>
                  <td
                    width="78"
                    bgcolor="#f58220"
                    style="height:1px;font-size:0;"
                  ></td>
                </tr>
              </table>

              <p
                style="
                  margin:0;
                  color:#ffffff;
                  font-size:15px;
                  line-height:1.5;
                "
              >
                Congratulations &amp; Welcome to Bunndle!
              </p>

              <p
                style="
                  margin:8px 0 0;
                  color:#dcecff;
                  font-size:13px;
                "
              >
                Lease • Co-Own • Earn
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 20px 26px;">

              <p
                style="
                  margin:0 0 14px;
                  font-size:15px;
                  font-weight:700;
                  color:#1f2937;
                "
              >
                Dear ${customerName},
              </p>

              <p
                style="
                  margin:0 0 12px;
                  font-size:14px;
                  line-height:1.7;
                  color:#334155;
                "
              >
                <strong>
                  Congratulations &amp; Welcome to Bunndle!
                </strong>
              </p>

              <p
                style="
                  margin:0 0 12px;
                  font-size:14px;
                  line-height:1.7;
                  color:#334155;
                "
              >
                Your journey towards asset co-ownership has
                officially begun!
              </p>

              <p
                style="
                  margin:0 0 20px;
                  font-size:14px;
                  line-height:1.7;
                  color:#334155;
                "
              >
                We are delighted to confirm that your payment
                has been successfully processed and your
                asset fractions have been recorded.
              </p>

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin-bottom:22px;"
              >
                <tr>
                  <td
                    align="center"
                    bgcolor="#edf8f0"
                    style="
                      background-color:#edf8f0;
                      border:1px solid #ccebd5;
                      border-radius:12px;
                      padding:22px 14px;
                    "
                  >
                    <p
                      style="
                        margin:0 0 8px;
                        color:#16803c;
                        font-size:14px;
                        font-weight:700;
                      "
                    >
                      ✓ PAYMENT CONFIRMED
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#0f4f91;
                        font-size:30px;
                        line-height:1.3;
                        font-weight:700;
                      "
                    >
                      ${totalAmountPaid}
                    </p>

                    <p
                      style="
                        margin:8px 0 0;
                        color:#64748b;
                        font-size:12px;
                      "
                    >
                      Your payment was received successfully
                    </p>
                  </td>
                </tr>
              </table>

              <h2
                style="
                  margin:0 0 14px;
                  color:#0f4f91;
                  font-size:19px;
                  line-height:1.4;
                "
              >
                Payment Confirmation
              </h2>

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  width:100%;
                  background-color:#f8fbff;
                  border:1px solid #dce8f5;
                  border-radius:12px;
                  margin-bottom:24px;
                "
              >
                ${detailRow(
                  "Payment Status",
                  '<span style="color:#16803c;">Successful</span>'
                )}
                ${detailRow("Asset Name", assetName)}
                ${detailRow("Transaction ID", transactionId)}
                ${detailRow("Fractions Purchased", fractionsAcquired)}
                ${detailRow(
                  "Total Investment Amount",
                  totalAmountPaid,
                  true
                )}
                ${detailRow("Acquisition Date", acquisitionDate)}
                ${detailRow(
                  "Fixed Monthly Rental",
                  totalFixedMonthlyRental,
                  true
                )}
              </table>

              <h2
                style="
                  margin:0 0 12px;
                  color:#0f4f91;
                  font-size:19px;
                  line-height:1.4;
                "
              >
                Complete Your Co-Ownership Agreement
              </h2>

              <p
                style="
                  margin:0 0 16px;
                  color:#334155;
                  font-size:14px;
                  line-height:1.7;
                "
              >
                To complete the required documentation,
                generate your agreement through the
                <strong>Bunndle App</strong>.
              </p>

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin-bottom:16px;"
              >
                <tr>
                  <td
                    bgcolor="#f3f8ff"
                    style="
                      background-color:#f3f8ff;
                      border:1px solid #d7e6f7;
                      border-left:4px solid #f58220;
                      border-radius:12px;
                      padding:18px 16px;
                    "
                  >
                    <p
                      style="
                        margin:0 0 14px;
                        color:#0f4f91;
                        font-size:15px;
                        font-weight:700;
                      "
                    >
                      How to Generate Your Agreement
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#334155;
                        font-size:13px;
                        line-height:2;
                      "
                    >
                      <strong>Step 1:</strong> Open the Bunndle App<br />
                      <strong>Step 2:</strong> Go to My Ownership<br />
                      <strong>Step 3:</strong> Select Purchase<br />
                      <strong>Step 4:</strong> Select Your Asset<br />
                      <strong>Step 5:</strong> Click Generate Agreement
                    </p>
                  </td>
                </tr>
              </table>

              <p
                style="
                  margin:0 0 24px;
                  color:#475569;
                  font-size:13px;
                  line-height:1.7;
                "
              >
                Follow the on-screen instructions to
                complete the agreement process.
              </p>

              <h2
                style="
                  margin:0 0 12px;
                  color:#0f4f91;
                  font-size:19px;
                  line-height:1.4;
                "
              >
                Welcome to a Smarter Way of Co-Owning Assets
              </h2>

              <p
                style="
                  margin:0 0 14px;
                  color:#334155;
                  font-size:14px;
                  line-height:1.7;
                "
              >
                At <strong>Bunndle</strong>, we believe in
                making asset co-ownership accessible,
                transparent, and convenient.
              </p>

              <p
                style="
                  margin:0 0 14px;
                  color:#334155;
                  font-size:14px;
                  line-height:1.7;
                "
              >
                Your acquired fractions and applicable rental
                entitlements are governed by your
                Co-Ownership Agreement.
              </p>

              <p
                style="
                  margin:0 0 22px;
                  color:#334155;
                  font-size:14px;
                  line-height:1.7;
                "
              >
                We sincerely appreciate your trust and
                are excited to welcome you to our
                growing community.
              </p>

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin-bottom:24px;"
              >
                <tr>
                  <td
                    align="center"
                    bgcolor="#fff7ef"
                    style="
                      background-color:#fff7ef;
                      border:1px solid #ffd8b5;
                      border-radius:12px;
                      padding:20px 14px;
                    "
                  >
                    <p
                      style="
                        margin:0 0 8px;
                        color:#0f4f91;
                        font-size:17px;
                        font-weight:700;
                      "
                    >
                      Thank You for Choosing Bunndle!
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#f58220;
                        font-size:15px;
                        font-weight:700;
                      "
                    >
                      Own Together. Earn Together.
                    </p>
                  </td>
                </tr>
              </table>

              <p
                style="
                  margin:0;
                  color:#334155;
                  font-size:14px;
                  line-height:1.8;
                "
              >
                Warm Regards,<br />
                <strong>Team Bunndle</strong><br />
                <em
                  style="
                    color:#64748b;
                    font-size:12px;
                  "
                >
                  A Trademark of Agent Alliance Private Limited
                </em>
              </p>

            </td>
          </tr>

          <tr>
            <td
              bgcolor="#f5f9fe"
              style="
                background-color:#f5f9fe;
                border-top:1px solid #e3edf7;
                padding:24px 20px;
              "
            >
              <p
                align="center"
                style="
                  margin:0 0 12px;
                  color:#0f4f91;
                  font-size:15px;
                  font-weight:700;
                "
              >
                Need Help? Contact Bunndle Support
              </p>

              <p
                align="center"
                style="
                  margin:0 0 8px;
                  font-size:13px;
                  line-height:1.7;
                "
              >
                <a
                  href="mailto:support@bunndle.in"
                  style="
                    color:#0f4f91;
                    text-decoration:none;
                  "
                >
                  support@bunndle.in
                </a>
                <br />
                <a
                  href="mailto:info@bunndle.in"
                  style="
                    color:#0f4f91;
                    text-decoration:none;
                  "
                >
                  info@bunndle.in
                </a>
              </p>

              <p
                align="center"
                style="
                  margin:0 0 20px;
                  font-size:13px;
                "
              >
                <a
                  href="https://www.bunndle.in"
                  style="
                    color:#0f4f91;
                    text-decoration:none;
                    font-weight:600;
                  "
                >
                  www.bunndle.in
                </a>
              </p>

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin-bottom:18px;"
              >
                <tr>
                  <td
                    bgcolor="#fff7ef"
                    style="
                      background-color:#fff7ef;
                      border:1px solid #ffd8b5;
                      border-radius:10px;
                      padding:14px;
                    "
                  >
                    <p
                      style="
                        margin:0 0 6px;
                        color:#b54708;
                        font-size:12px;
                        font-weight:700;
                      "
                    >
                      Disclaimer
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#795548;
                        font-size:11px;
                        line-height:1.7;
                      "
                    >
                      This confirmation acknowledges
                      successful payment and recorded
                      acquisition. Rental distributions
                      and ownership rights remain subject
                      to the executed Co-Ownership Agreement,
                      applicable deductions, and governing
                      terms.
                    </p>
                  </td>
                </tr>
              </table>

              <p
                align="center"
                style="
                  margin:0 0 10px;
                  color:#64748b;
                  font-size:11px;
                  line-height:1.6;
                "
              >
                This is an automated email.
                For assistance, please contact our support team.
              </p>

              <p
                align="center"
                style="
                  margin:0;
                  color:#64748b;
                  font-size:11px;
                  line-height:1.6;
                "
              >
                © ${new Date().getFullYear()}
                Agent Alliance Private Limited.
                All rights reserved.
              </p>
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

export default paymentSuccessTemplate;
