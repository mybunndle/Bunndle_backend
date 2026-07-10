const otpTemplate = (otp) => {
  if (!otp) {
    throw new Error("OTP is required");
  }

  const formattedOtp = String(otp).split("").join(" ");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset OTP</title>
</head>

<body style="
  margin:0;
  padding:0;
  background-color:#f3f7fb;
  font-family:Arial,Helvetica,sans-serif;
  color:#111827;
">
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="width:100%;background-color:#f3f7fb;padding:30px 12px;"
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
            width:100%;
            max-width:620px;
            background-color:#ffffff;
            border-radius:20px;
            overflow:hidden;
            box-shadow:0 12px 35px rgba(14,61,105,0.12);
          "
        >

          <!-- Header -->
          <tr>
            <td
              align="center"
              style="
                background-color:#0f4f91;
                padding:38px 24px 34px;
              "
            >
              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin:0 auto 20px;"
              >
                <tr>
                  <td
                    align="center"
                    width="125"
                    height="125"
                    style="
                      width:125px;
                      height:125px;
                      background-color:#ffffff;
                      border-radius:18px;
                      padding:0;
                      overflow:hidden;
                      line-height:0;
                    "
                  >
                    <img
                      src="https://ik.imagekit.io/bunndle/logo/WhatsApp%20Image%202026-07-10%20at%2012.02.32.jpeg"
                      alt="Bunndle"
                      width="125"
                      height="125"
                      style="
                        display:block;
                        width:125px;
                        height:125px;
                        object-fit:contain;
                        background-color:#ffffff;
                        border:0;
                        margin:0;
                        padding:0;
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
                  font-size:34px;
                  line-height:1.25;
                  font-weight:700;
                "
              >
                Password Reset Request
              </h1>

              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="margin:16px auto 14px;"
              >
                <tr>
                  <td
                    width="120"
                    style="
                      width:120px;
                      height:1px;
                      background-color:#f58220;
                      font-size:0;
                      line-height:0;
                    "
                  ></td>

                  <td
                    style="
                      padding:0 12px;
                      color:#f58220;
                      font-size:15px;
                    "
                  >
                    ◆
                  </td>

                  <td
                    width="120"
                    style="
                      width:120px;
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
                  font-size:18px;
                  line-height:1.5;
                "
              >
                Bunndle Smart Leasing
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:42px 38px 34px;">

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
                    width="58"
                    valign="top"
                    style="width:58px;padding-right:16px;"
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
                          width="46"
                          height="46"
                          style="
                            width:46px;
                            height:46px;
                            background-color:#e9f2ff;
                            border-radius:50%;
                            color:#0f4f91;
                            font-size:22px;
                            line-height:46px;
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
                        font-size:17px;
                        line-height:1.8;
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
                style="margin:30px 0;"
              >
                <tr>
                  <td
                    align="center"
                    style="
                      background-color:#f3f8ff;
                      border:1px solid #d7e6f7;
                      border-left:5px solid #f58220;
                      border-radius:14px;
                      padding:30px 18px;
                    "
                  >
                    <p
                      style="
                        margin:0 0 16px;
                        color:#475569;
                        font-size:17px;
                      "
                    >
                      Your verification code
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#0f4f91;
                        font-size:44px;
                        line-height:1.2;
                        font-weight:700;
                        letter-spacing:7px;
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
                style="margin-bottom:20px;"
              >
                <tr>
                  <td
                    width="58"
                    valign="top"
                    style="width:58px;padding-right:16px;"
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
                          width="46"
                          height="46"
                          style="
                            width:46px;
                            height:46px;
                            background-color:#e9f2ff;
                            border-radius:50%;
                            color:#0f4f91;
                            font-size:21px;
                            line-height:46px;
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
                        font-size:16px;
                        line-height:1.7;
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
                style="margin-bottom:26px;"
              >
                <tr>
                  <td
                    width="58"
                    valign="top"
                    style="width:58px;padding-right:16px;"
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
                          width="46"
                          height="46"
                          style="
                            width:46px;
                            height:46px;
                            background-color:#e9f2ff;
                            border-radius:50%;
                            color:#0f4f91;
                            font-size:20px;
                            line-height:46px;
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
                        font-size:16px;
                        line-height:1.7;
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
                    style="
                      background-color:#fff7ef;
                      border:1px solid #ffd8b5;
                      border-radius:14px;
                      padding:20px;
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
                          width="52"
                          valign="top"
                          style="width:52px;padding-right:14px;"
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
                                width="42"
                                height="42"
                                style="
                                  width:42px;
                                  height:42px;
                                  background-color:#ffead6;
                                  border-radius:50%;
                                  color:#d95f02;
                                  font-size:22px;
                                  line-height:42px;
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
                              font-size:15px;
                              line-height:1.7;
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
              style="
                background-color:#f5f9fe;
                border-top:1px solid #e3edf7;
                padding:28px 24px;
              "
            >
              <div
                style="
                  width:48px;
                  height:48px;
                  margin:0 auto 12px;
                  border-radius:50%;
                  background-color:#e6f0fd;
                  color:#0f4f91;
                  font-size:22px;
                  line-height:48px;
                "
              >
                ☎
              </div>

              <p
                style="
                  margin:0 0 14px;
                  color:#334155;
                  font-size:14px;
                  line-height:1.6;
                "
              >
                Need help? Contact the Bunndle support team.
              </p>

              <p
                style="
                  margin:0;
                  color:#64748b;
                  font-size:12px;
                  line-height:1.6;
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