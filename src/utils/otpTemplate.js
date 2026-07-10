const otpTemplate = (otp) => {
  if (!otp) {
    throw new Error("OTP is required");
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset OTP</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="background-color:#f4f6f8;padding:30px 15px;"
  >
    <tr>
      <td align="center">
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,0.08);"
        >
          <tr>
            <td
              align="center"
              style="background-color:#285b83;padding:28px 20px;"
            >
              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin:0 auto 16px;"
              >
                <tr>
                  <td
                    align="center"
                    width="100"
                    height="100"
                    style="background-color:#ffffff;border-radius:16px;"
                  >
                    <img
                      src="https://bunndle.in/logo.png"
                      alt="Bunndle"
                      width="78"
                      style="display:block;width:78px;max-width:78px;height:auto;border:0;margin:auto;"
                    />
                  </td>
                </tr>
              </table>

              <h1
                style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3;"
              >
                Password Reset Request
              </h1>

              <p style="margin:6px 0 0;color:#ffffff;font-size:13px;">
                Bunndle Smart Leasing
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 32px;">
              <p
                style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;"
              >
                We received a request to reset the password for your Bunndle
                account. Please use the verification code below:
              </p>

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin:22px 0;"
              >
                <tr>
                  <td
                    align="center"
                    style="background-color:#f7f9fc;border-left:4px solid #f28c28;border-radius:8px;padding:24px 15px;"
                  >
                    <p
                      style="margin:0 0 10px;font-size:14px;color:#6b7280;"
                    >
                      Your verification code
                    </p>

                    <p
                      style="margin:0;font-size:34px;line-height:1;font-weight:700;letter-spacing:8px;color:#285b83;"
                    >
                      ${otp}
                    </p>
                  </td>
                </tr>
              </table>

              <p
                style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#4b5563;"
              >
                This OTP is valid for
                <strong style="color:#111827;">10 minutes</strong>.
              </p>

              <p
                style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;"
              >
                Do not share this OTP with anyone. Bunndle will never ask for
                your OTP over a phone call, message, or email.
              </p>

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin-top:26px;"
              >
                <tr>
                  <td
                    style="padding:16px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;"
                  >
                    <p
                      style="margin:0;font-size:13px;line-height:1.6;color:#9a3412;"
                    >
                      If you did not request a password reset, you can safely
                      ignore this email. Your password will remain unchanged.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td
              align="center"
              style="background-color:#f8fafc;border-top:1px solid #e5e7eb;padding:22px 20px;"
            >
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">
                Need help? Contact the Bunndle support team.
              </p>

              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} Agent Alliance Private Limited.
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

export default otpTemplate;