const escapeHtml = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export const adminEnquiryTemplate = ({
  userType,
  companyName,
  pointOfContact,
  name,
  mobile,
  email,
  city,
  address,
  message,
}) => {
  const isCorporate = userType === "corporate";
  const customerName = isCorporate ? pointOfContact : name;
  const enquiryType = isCorporate ? "Corporate" : "Individual";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New ${enquiryType} Enquiry</title>
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
                      New ${enquiryType} Enquiry
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 30px;">
                    <h2 style="
                      margin: 0 0 20px;
                      color: #14578e;
                      font-size: 22px;
                    ">
                      Enquiry Details
                    </h2>

                    ${
                      isCorporate
                        ? `
                          <p style="margin: 10px 0;">
                            <strong>Company Name:</strong>
                            ${escapeHtml(companyName)}
                          </p>

                          <p style="margin: 10px 0;">
                            <strong>Point of Contact:</strong>
                            ${escapeHtml(pointOfContact)}
                          </p>
                        `
                        : `
                          <p style="margin: 10px 0;">
                            <strong>Name:</strong>
                            ${escapeHtml(name)}
                          </p>
                        `
                    }

                    <p style="margin: 10px 0;">
                      <strong>Enquiry Type:</strong>
                      ${enquiryType}
                    </p>

                    <p style="margin: 10px 0;">
                      <strong>Mobile:</strong>
                      ${escapeHtml(mobile)}
                    </p>

                    <p style="margin: 10px 0;">
                      <strong>Email:</strong>
                      ${escapeHtml(email)}
                    </p>

                    <p style="margin: 10px 0;">
                      <strong>City:</strong>
                      ${escapeHtml(city)}
                    </p>

                    <p style="margin: 10px 0;">
                      <strong>Address:</strong>
                      ${escapeHtml(address)}
                    </p>

                    <div style="
                      margin-top: 24px;
                      padding: 18px;
                      background-color: #f7f9fb;
                      border-left: 4px solid #14578e;
                      border-radius: 6px;
                    ">
                      <p style="
                        margin: 0 0 8px;
                        font-weight: bold;
                      ">
                        Message from ${escapeHtml(customerName)}
                      </p>

                      <p style="
                        margin: 0;
                        line-height: 1.6;
                        white-space: pre-line;
                      ">
                        ${escapeHtml(message)}
                      </p>
                    </div>
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
                    This email was generated from the Bunndle enquiry form.
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