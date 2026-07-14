const otpTemplate = (otp) => {
  const normalizedOtp = String(otp ?? "").trim();

  if (!/^\d{4,8}$/.test(normalizedOtp)) {
    throw new Error("A valid numeric OTP is required");
  }

  const formattedOtp = normalizedOtp.split("").join(" ");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset OTP</title>
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
                Password Reset<br />Request
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

              <!-- Intro -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    width="46"
                    valign="top"
                    style="width:46px;padding-right:12px;"
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          align="center"
                          width="38"
                          height="38"
                          bgcolor="#e9f2ff"
                          style="
                            width:38px;
                            height:38px;
                            background-color:#e9f2ff;
                            border-radius:50%;
                            color:#0f4f91;
                            font-size:17px;
                            line-height:38px;
                          "
                        >
                          ✉
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td valign="middle">
                    <p
                      style="
                        margin:0;
                        color:#1f2937;
                        font-size:14px;
                        line-height:1.65;
                      "
                    >
                      We received a request to reset the password for your
                      Bunndle account. Please use the verification code below:
                    </p>
                  </td>
                </tr>
              </table>

              <!-- OTP Box -->
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
                    bgcolor="#f3f8ff"
                    style="
                      background-color:#f3f8ff;
                      border:1px solid #d7e6f7;
                      border-left:4px solid #f58220;
                      border-radius:12px;
                      padding:22px 12px;
                    "
                  >
                    <p
                      style="
                        margin:0 0 12px;
                        color:#475569;
                        font-size:14px;
                        line-height:1.4;
                      "
                    >
                      Your verification code
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#0f4f91;
                        font-size:34px;
                        line-height:1.2;
                        font-weight:700;
                        letter-spacing:4px;
                        white-space:nowrap;
                        font-family:Arial,Helvetica,sans-serif;
                      "
                    >
                      ${formattedOtp}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Validity -->
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
                    width="46"
                    valign="top"
                    style="width:46px;padding-right:12px;"
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          align="center"
                          width="38"
                          height="38"
                          bgcolor="#e9f2ff"
                          style="
                            width:38px;
                            height:38px;
                            background-color:#e9f2ff;
                            border-radius:50%;
                            color:#0f4f91;
                            font-size:17px;
                            line-height:38px;
                          "
                        >
                          ◷
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td valign="middle">
                    <p
                      style="
                        margin:0;
                        color:#1f2937;
                        font-size:14px;
                        line-height:1.6;
                      "
                    >
                      This OTP is valid for
                      <strong>10 minutes</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security -->
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
                    width="46"
                    valign="top"
                    style="width:46px;padding-right:12px;"
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          align="center"
                          width="38"
                          height="38"
                          bgcolor="#e9f2ff"
                          style="
                            width:38px;
                            height:38px;
                            background-color:#e9f2ff;
                            border-radius:50%;
                            color:#0f4f91;
                            font-size:16px;
                            line-height:38px;
                          "
                        >
                          ✓
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td valign="middle">
                    <p
                      style="
                        margin:0;
                        color:#1f2937;
                        font-size:14px;
                        line-height:1.6;
                      "
                    >
                      Do not share this OTP with anyone. Bunndle will never ask
                      for your OTP over a phone call, message, or email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    bgcolor="#fff7ef"
                    style="
                      background-color:#fff7ef;
                      border:1px solid #ffd8b5;
                      border-radius:12px;
                      padding:16px;
                    "
                  >
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          width="42"
                          valign="top"
                          style="width:42px;padding-right:10px;"
                        >
                          <table
                            role="presentation"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                          >
                            <tr>
                              <td
                                align="center"
                                width="34"
                                height="34"
                                bgcolor="#ffead6"
                                style="
                                  width:34px;
                                  height:34px;
                                  background-color:#ffead6;
                                  border-radius:50%;
                                  color:#d95f02;
                                  font-size:17px;
                                  line-height:34px;
                                "
                              >
                                !
                              </td>
                            </tr>
                          </table>
                        </td>

                        <td valign="middle">
                          <p
                            style="
                              margin:0;
                              color:#b54708;
                              font-size:13px;
                              line-height:1.6;
                            "
                          >
                            If you did not request a password reset, you can
                            safely ignore this email. Your password will remain
                            unchanged.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
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
              <div
                style="
                  width:40px;
                  height:40px;
                  margin:0 auto 10px;
                  border-radius:50%;
                  background-color:#e6f0fd;
                  color:#0f4f91;
                  font-size:18px;
                  line-height:40px;
                "
              >
                ☎
              </div>

              <p
                style="
                  margin:0 0 10px;
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

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

export default otpTemplate;