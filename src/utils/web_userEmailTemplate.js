const escapeHtml = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export const userEnquiryTemplate = ({
  userType,
  companyName,
  pointOfContact,
  name,
  message,
}) => {
  const isCorporate = userType === "corporate";
  const customerName = isCorporate ? pointOfContact : name;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Thank You for Contacting Bunndle</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        font-family: Arial, Helvetica, sans-serif;
        color: #333333;
      ">
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="background-color: #f4f4f4; padding: 30px 15px;"
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  max-width: 600px;
                  background-color: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
                "
              >
                <tr>
                  <td style="
                    background-color: #14578e;
                    padding: 24px;
                    text-align: center;
                  ">
                    <h1 style="
                      margin: 0;
                      color: #ffffff;
                      font-size: 28px;
                    ">
                      Bunndle
                    </h1>

                    <p style="
                      margin: 8px 0 0;
                      color: #e8f3fb;
                      font-size: 14px;
                    ">
                      Flexible Leasing Solutions
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 30px;">
                    <h2 style="
                      margin: 0 0 18px;
                      color: #14578e;
                      font-size: 22px;
                    ">
                      Thank You for Contacting Us
                    </h2>

                    <p style="
                      margin: 0 0 16px;
                      line-height: 1.6;
                    ">
                      Hello <strong>${escapeHtml(customerName)}</strong>,
                    </p>

                    ${
                      isCorporate
                        ? `
                          <p style="
                            margin: 0 0 16px;
                            line-height: 1.6;
                          ">
                            We have successfully received your corporate
                            enquiry for
                            <strong>${escapeHtml(companyName)}</strong>.
                          </p>
                        `
                        : `
                          <p style="
                            margin: 0 0 16px;
                            line-height: 1.6;
                          ">
                            We have successfully received your enquiry.
                          </p>
                        `
                    }

                    <p style="
                      margin: 0 0 20px;
                      line-height: 1.6;
                    ">
                      Our team will review your request and contact you soon.
                    </p>

                    <div style="
                      padding: 18px;
                      background-color: #f7f9fb;
                      border-left: 4px solid #14578e;
                      border-radius: 6px;
                    ">
                      <p style="
                        margin: 0 0 8px;
                        font-weight: bold;
                      ">
                        Your Message
                      </p>

                      <p style="
                        margin: 0;
                        line-height: 1.6;
                        white-space: pre-line;
                      ">
                        ${escapeHtml(message)}
                      </p>
                    </div>

                    <p style="
                      margin: 28px 0 0;
                      line-height: 1.6;
                    ">
                      Regards,<br />
                      <strong>Bunndle Team</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="
                    padding: 18px;
                    text-align: center;
                    background-color: #f7f9fb;
                    color: #777777;
                    font-size: 12px;
                  ">
                    © ${new Date().getFullYear()} Bunndle. All rights reserved.
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