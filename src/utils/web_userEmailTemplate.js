const escapeHtml = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};


const userEnquiryTemplate = ({
  userType,
  name,
  companyName,
  pointOfContact,
  mobile,
  email,
  city,
  address,
  message,
}) => {
  const isCorporate = userType === "corporate";

  const customerName = isCorporate ? pointOfContact : name;

  const safeName = escapeHtml(customerName || "there");
  const safeCompanyName = escapeHtml(companyName);
  const safeMobile = escapeHtml(mobile);
  const safeEmail = escapeHtml(email);
  const safeCity = escapeHtml(city);
  const safeAddress = escapeHtml(address);
  const safeMessage = escapeHtml(message);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>Enquiry Received - Bunndle</title>
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

          <!-- Header -->
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
                    height="104"
                    bgcolor="#ffffff"
                    style="
                      width:104px;
                      height:104px;
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
                        max-width:104px;
                        height:auto;
                        background-color:#ffffff;
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
                  line-height:1.25;
                  font-weight:700;
                "
              >
                Enquiry Received
              </h1>

              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin:12px auto 10px;"
              >
                <tr>
                  <td
                    width="78"
                    style="
                      width:78px;
                      height:1px;
                      background-color:#f58220;
                      font-size:0;
                      line-height:0;
                    "
                  ></td>

                  <td
                    style="
                      padding:0 9px;
                      color:#f58220;
                      font-size:11px;
                    "
                  >
                    ◆
                  </td>

                  <td
                    width="78"
                    style="
                      width:78px;
                      height:1px;
                      background-color:#f58220;
                      font-size:0;
                      line-height:0;
                    "
                  ></td>
                </tr>
              </table>

              <p
                style="
                  margin:0;
                  color:#ffffff;
                  font-size:15px;
                  line-height:1.4;
                "
              >
                Lease • Co-Own • Earn
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 20px 26px;">

              <h2
                style="
                  margin:0 0 14px;
                  color:#111827;
                  font-size:20px;
                  line-height:1.4;
                  font-weight:700;
                "
              >
                Hello ${safeName},
              </h2>

              <p
                style="
                  margin:0 0 12px;
                  color:#334155;
                  font-size:14px;
                  line-height:1.65;
                "
              >
                Thank you for contacting <strong>Bunndle</strong>.
              </p>

              <p
                style="
                  margin:0 0 20px;
                  color:#334155;
                  font-size:14px;
                  line-height:1.65;
                "
              >
                ${
                  isCorporate
                    ? `We have successfully received your corporate enquiry for
                       <strong>${safeCompanyName}</strong>.`
                    : "We have successfully received your individual enquiry."
                }
                Our team will review your request and contact you shortly.
              </p>

              <!-- Status -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin-bottom:20px;"
              >
                <tr>
                  <td
                    bgcolor="#eef7ff"
                    style="
                      background-color:#eef7ff;
                      border:1px solid #d4e8fa;
                      border-radius:12px;
                      padding:16px;
                    "
                  >
                    <p
                      style="
                        margin:0 0 4px;
                        color:#0f4f91;
                        font-size:14px;
                        line-height:1.5;
                        font-weight:700;
                      "
                    >
                      ✓ Your enquiry has been submitted
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#24577f;
                        font-size:13px;
                        line-height:1.6;
                      "
                    >
                      Our leasing team will get in touch with you as soon as
                      possible.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Submitted Details -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                bgcolor="#f6f9fd"
                style="
                  width:100%;
                  background-color:#f6f9fd;
                  border-left:4px solid #f58220;
                  border-radius:12px;
                  margin-bottom:20px;
                "
              >
                <tr>
                  <td style="padding:18px 16px;">

                    <p
                      style="
                        margin:0 0 16px;
                        color:#0f4f91;
                        font-size:15px;
                        font-weight:700;
                      "
                    >
                      Your Submitted Details
                    </p>

                    ${
                      isCorporate
                        ? `
                          ${detailRow(
                            "🏢",
                            "Company Name",
                            safeCompanyName || "Not provided"
                          )}

                          ${detailRow(
                            "👤",
                            "Point of Contact",
                            safeName
                          )}
                        `
                        : detailRow("👤", "Name", safeName)
                    }

                    ${detailRow(
                      "📞",
                      "Mobile",
                      safeMobile || "Not provided"
                    )}

                    ${detailRow(
                      "✉",
                      "Email",
                      `
                        <a
                          href="mailto:${safeEmail}"
                          style="
                            color:#0f4f91;
                            text-decoration:none;
                          "
                        >
                          ${safeEmail || "Not provided"}
                        </a>
                      `
                    )}

                    ${detailRow(
                      "📍",
                      "City",
                      safeCity || "Not provided"
                    )}

                    ${detailRow(
                      "🏠",
                      "Address",
                      safeAddress || "Not provided",
                      true
                    )}

                  </td>
                </tr>
              </table>

              <!-- Message -->
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
                    bgcolor="#ffffff"
                    style="
                      background-color:#ffffff;
                      border:1px solid #dbe4ee;
                      border-radius:12px;
                      padding:18px 16px;
                    "
                  >
                    <p
                      style="
                        margin:0 0 10px;
                        color:#475569;
                        font-size:12px;
                        line-height:1.4;
                        font-weight:600;
                      "
                    >
                      💬 Your Message
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#1f2937;
                        font-size:14px;
                        line-height:1.65;
                        white-space:pre-line;
                        word-break:break-word;
                      "
                    >
                      ${safeMessage || "No message provided"}
                    </p>
                  </td>
                </tr>
              </table>

              <p
                style="
                  margin:0 0 8px;
                  color:#334155;
                  font-size:14px;
                  line-height:1.6;
                "
              >
                Thank you for choosing Bunndle.
              </p>

              <p
                style="
                  margin:0;
                  color:#334155;
                  font-size:14px;
                  line-height:1.6;
                "
              >
                Regards,<br />
                <strong style="color:#0f4f91;">
                  Bunndle Support Team
                </strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          ${footerTemplate()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const detailRow = (icon, label, value, isLast = false) => {
  return `
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
    >
      <tr>
        <td
          width="32"
          valign="top"
          style="
            width:32px;
            color:#0f4f91;
            font-size:16px;
            padding:3px 8px ${isLast ? "0" : "12px"} 0;
          "
        >
          ${icon}
        </td>

        <td style="padding-bottom:${isLast ? "0" : "12px"};">
          <p
            style="
              margin:0;
              color:#475569;
              font-size:12px;
              line-height:1.4;
            "
          >
            ${label}
          </p>

          <p
            style="
              margin:2px 0 0;
              color:#111827;
              font-size:14px;
              line-height:1.5;
              font-weight:600;
              word-break:break-word;
            "
          >
            ${value}
          </p>
        </td>
      </tr>
    </table>
  `;
};

const footerTemplate = () => {
  return `
    <tr>
      <td
        align="center"
        bgcolor="#f5f9fe"
        style="
          background-color:#f5f9fe;
          border-top:1px solid #e3edf7;
          padding:22px 18px;
        "
      >
        <p
          style="
            margin:0 0 8px;
            color:#334155;
            font-size:13px;
            line-height:1.5;
          "
        >
          Need help?

          <a
            href="mailto:support@bunndle.in"
            style="
              color:#0f4f91;
              text-decoration:none;
              font-weight:600;
            "
          >
            Contact Bunndle Support
          </a>
        </p>

        <p
          style="
            margin:0;
            color:#64748b;
            font-size:11px;
            line-height:1.5;
          "
        >
          © ${new Date().getFullYear()} Agent Alliance Private Limited.
          All rights reserved.
        </p>
      </td>
    </tr>
  `;
};

export default userEnquiryTemplate;