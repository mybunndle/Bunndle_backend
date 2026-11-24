
const LOGO_URL =
  "https://ik.imagekit.io/bunndle/logo/WhatsApp%20Image%202026-07-10%20at%2012.02.32.jpeg?updatedAt=1783666098521";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return escapeHtml(value);
};

const infoRow = (label, value, highlighted = false) => `
  <tr style="background-color:${highlighted ? "#eef5fc" : "#ffffff"};">
    <td style="
      padding:13px 14px;
      border-bottom:1px solid #e5eaf0;
      color:#475467;
      font-size:13px;
      line-height:20px;
      width:45%;
    ">
      ${escapeHtml(label)}
    </td>

    <td style="
      padding:13px 14px;
      border-bottom:1px solid #e5eaf0;
      color:#101828;
      font-size:13px;
      line-height:20px;
      font-weight:${highlighted ? "700" : "500"};
      overflow-wrap:anywhere;
    ">
      ${formatValue(value)}
    </td>
  </tr>
`;

const table = (rows) => `
  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
      width:100%;
      border:1px solid #e5eaf0;
      border-collapse:collapse;
    "
  >
    <thead>
      <tr style="background-color:#0f4f91;">
        <th align="left" style="
          padding:13px 14px;
          color:#ffffff;
          font-size:13px;
        ">
          Particulars
        </th>
        <th align="left" style="
          padding:13px 14px;
          color:#ffffff;
          font-size:13px;
        ">
          Details
        </th>
      </tr>
    </thead>

    <tbody>
      ${rows.join("")}
    </tbody>
  </table>
`;

const notice = (heading, message, type = "info") => {
  const colors = {
    info: {
      background: "#eef5fc",
      border: "#cbdff5",
      text: "#0f4f91",
    },
    warning: {
      background: "#fff7ed",
      border: "#fed7aa",
      text: "#9a3412",
    },
    success: {
      background: "#eaf7ee",
      border: "#c9e9d1",
      text: "#16803d",
    },
  };

  const color = colors[type] || colors.info;

  return `
    <div style="
      background-color:${color.background};
      border:1px solid ${color.border};
      border-radius:10px;
      padding:18px;
      text-align:center;
      margin:24px 0;
    ">
      <div style="
        font-size:18px;
        line-height:25px;
        font-weight:700;
        color:${color.text};
      ">
        ${escapeHtml(heading)}
      </div>

      <p style="
        margin:10px 0 0;
        font-size:13px;
        line-height:21px;
        color:#475467;
      ">
        ${escapeHtml(message)}
      </p>
    </div>
  `;
};

const emailLayout = ({ title, subtitle, content }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>${escapeHtml(title)}</title>
</head>

<body style="
  margin:0;
  padding:0;
  background-color:#f3f6fa;
  font-family:Arial,Helvetica,sans-serif;
  color:#263238;
">

  <table
    role="presentation"
    cellpadding="0"
    cellspacing="0"
    width="100%"
    style="background-color:#f3f6fa;"
  >
    <tr>
      <td align="center" style="padding:28px 12px;">

        <table
          role="presentation"
          cellpadding="0"
          cellspacing="0"
          width="100%"
          style="
            max-width:600px;
            background-color:#ffffff;
            border:1px solid #e7ecf2;
            border-radius:14px;
            overflow:hidden;
          "
        >

          <!-- LOGO -->
          <tr>
            <td align="center" style="
              padding:28px 20px;
              border-bottom:3px solid #f58220;
            ">
              <img
                src="${LOGO_URL}"
                alt="Bunndle"
                width="150"
                style="
                  display:block;
                  max-width:150px;
                  height:auto;
                  border:0;
                "
              />
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding:30px 26px;">

              <h1 style="
                margin:0 0 12px;
                font-size:24px;
                line-height:32px;
                color:#0f4f91;
                text-align:center;
              ">
                ${escapeHtml(title)}
              </h1>

              <p style="
                margin:0 0 25px;
                text-align:center;
                color:#667085;
                font-size:14px;
                line-height:22px;
              ">
                ${escapeHtml(subtitle)}
              </p>

              ${content}

              <p style="
                margin:26px 0 0;
                font-size:14px;
                line-height:23px;
                color:#344054;
              ">
                Warm regards,<br/>
                <strong>Team Bunndle</strong><br/>
                A Trademark of Agent Alliance Private Limited
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="
              padding:23px;
              background-color:#0f4f91;
              color:#ffffff;
            ">

              <p style="
                margin:0 0 12px;
                font-size:13px;
                font-weight:700;
              ">
                Need Assistance?
              </p>

              <p style="
                margin:0;
                color:#ffffff;
                font-size:13px;
                line-height:24px;
              ">
                <a
                  href="mailto:support@bunndle.in"
                  style="color:#ffffff;"
                >
                  support@bunndle.in
                </a>

                <br/>

                <a
                  href="https://www.bunndle.in/"
                  style="color:#ffffff;"
                >
                  www.bunndle.in
                </a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="
              padding:17px 22px;
              text-align:center;
              font-size:11px;
              line-height:18px;
              color:#667085;
              background-color:#f8fafc;
            ">
              This is an automated notification from Bunndle.
              Payment confirmation is subject to successful
              verification of funds received by the company.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

// ============================================================
// 1. MANUAL ORDER CREATED EMAIL TEMPLATES
// ============================================================

export const manualOrderCreatedTemplates = ({
  customerName,
  customerEmail,
  assetName,
  orderId,
  totalAmount,
}) => {
  const customerContent = `
    <p style="font-size:14px;line-height:23px;color:#344054;">
      Dear ${formatValue(customerName || "Customer")},
    </p>

    <p style="font-size:14px;line-height:23px;color:#344054;">
      Thank you for choosing Bunndle!
      Your manual payment order has been created successfully.
    </p>

    ${notice(
      "Manual Payment Order Created",
      "Our team will share the official bank account details with you by email.",
      "success"
    )}

    <h2 style="
      margin:28px 0 15px;
      font-size:19px;
      color:#0f4f91;
    ">
      Your Order Details
    </h2>

    ${table([
      infoRow("Asset Name", assetName, true),
      infoRow("Order ID", orderId),
      infoRow("Amount Payable", formatAmount(totalAmount), true),
      infoRow("Payment Method", "Manual Bank Transfer"),
      infoRow("Order Status", "Awaiting Payment"),
    ])}

    <h2 style="
      margin:28px 0 12px;
      font-size:18px;
      color:#0f4f91;
    ">
      What Happens Next?
    </h2>

    <div style="
      background-color:#f4f8fd;
      border-left:4px solid #f58220;
      border-radius:6px;
      padding:18px;
      color:#344054;
      font-size:14px;
      line-height:26px;
    ">
      <strong>1.</strong> Our team will review your order.
      <br/>
      <strong>2.</strong> You will receive official bank details.
      <br/>
      <strong>3.</strong> Transfer the amount to the provided account.
      <br/>
      <strong>4.</strong> Submit your payment proof in the Bunndle App.
      <br/>
      <strong>5.</strong> Our team will verify the payment.
    </div>

    ${notice(
      "Important Payment Instructions",
      "Please do not transfer funds until you receive the official bank account details from Bunndle.",
      "warning"
    )}
  `;

  const adminContent = `
    <p style="font-size:14px;line-height:23px;color:#344054;">
      Dear Admin,
    </p>

    <p style="font-size:14px;line-height:23px;color:#344054;">
      A new manual payment order has been created.
      Bank account instructions need to be sent to the customer.
    </p>

    ${notice(
      "Bank Details Required",
      "A new manual payment order is awaiting administrative action.",
      "warning"
    )}

    <h2 style="
      margin:28px 0 15px;
      font-size:19px;
      color:#0f4f91;
    ">
      Customer & Order Information
    </h2>

    ${table([
      infoRow("Customer Name", customerName),
      infoRow("Customer Email", customerEmail),
      infoRow("Asset Name", assetName, true),
      infoRow("Order ID", orderId),
      infoRow("Amount Payable", formatAmount(totalAmount), true),
      infoRow("Payment Gateway", "MANUAL"),
      infoRow("Order Status", "PENDING_PAYMENT"),
    ])}

    <p style="
      margin:25px 0;
      font-size:14px;
      line-height:23px;
      color:#344054;
    ">
      Please review the order and send the approved
      bank transfer instructions through the Bunndle
      admin payment management system.
    </p>
  `;

  return {
    customerHtml: emailLayout({
      title: "Manual Payment Order Created",
      subtitle: "Your co-ownership payment request has been received.",
      content: customerContent,
    }),

    adminHtml: emailLayout({
      title: "New Manual Payment Order",
      subtitle: "Administrative action required.",
      content: adminContent,
    }),
  };
};

// ============================================================
// 2. MANUAL PAYMENT PROOF SUBMITTED EMAIL TEMPLATES
// ============================================================

export const manualPaymentSubmittedTemplates = ({
  customerName,
  customerEmail,
  assetName,
  orderId,
  transactionId,
  amountPaid,
  paymentMethod,
}) => {
  const customerContent = `
    <p style="font-size:14px;line-height:23px;color:#344054;">
      Dear ${formatValue(customerName || "Customer")},
    </p>

    <p style="font-size:14px;line-height:23px;color:#344054;">
      We have successfully received your manual
      payment proof for your Bunndle co-ownership order.
    </p>

    ${notice(
      "Payment Proof Received",
      "Your payment details are awaiting verification by our team.",
      "info"
    )}

    <h2 style="
      margin:28px 0 15px;
      font-size:19px;
      color:#0f4f91;
    ">
      Submitted Payment Details
    </h2>

    ${table([
      infoRow("Asset Name", assetName, true),
      infoRow("Order ID", orderId),
      infoRow("Transaction ID / UTR", transactionId),
      infoRow("Amount Submitted", formatAmount(amountPaid), true),
      infoRow("Payment Method", paymentMethod),
      infoRow("Verification Status", "Pending Verification"),
    ])}

    <h2 style="
      margin:28px 0 12px;
      font-size:18px;
      color:#0f4f91;
    ">
      What Happens Next?
    </h2>

    <div style="
      background-color:#f4f8fd;
      border-left:4px solid #f58220;
      border-radius:6px;
      padding:18px;
      color:#344054;
      font-size:14px;
      line-height:26px;
    ">
      <strong>1.</strong> Our team will review your submitted proof.
      <br/>
      <strong>2.</strong> We will verify receipt of funds in our bank account.
      <br/>
      <strong>3.</strong> Once approved, your co-ownership will be confirmed.
      <br/>
      <strong>4.</strong> You will receive a payment success and welcome email.
    </div>

    ${notice(
      "This Is Not a Payment Confirmation",
      "Your proof has been received, but your payment is not considered successful until actual bank credit has been verified and approved.",
      "warning"
    )}
  `;

  const adminContent = `
    <p style="font-size:14px;line-height:23px;color:#344054;">
      Dear Admin,
    </p>

    <p style="font-size:14px;line-height:23px;color:#344054;">
      A customer has submitted manual payment proof.
      The transaction is awaiting verification.
    </p>

    ${notice(
      "Payment Verification Required",
      "Verify the bank credit before approving the payment.",
      "warning"
    )}

    <h2 style="
      margin:28px 0 15px;
      font-size:19px;
      color:#0f4f91;
    ">
      Manual Payment Details
    </h2>

    ${table([
      infoRow("Customer Name", customerName),
      infoRow("Customer Email", customerEmail),
      infoRow("Asset Name", assetName, true),
      infoRow("Order ID", orderId),
      infoRow("Transaction ID / UTR", transactionId, true),
      infoRow("Amount Submitted", formatAmount(amountPaid), true),
      infoRow("Payment Method", paymentMethod),
      infoRow("Verification Status", "PENDING_VERIFICATION"),
    ])}

    <div style="
      background-color:#fff7ed;
      border-left:4px solid #f58220;
      border-radius:6px;
      padding:18px;
      margin-top:25px;
      color:#344054;
      font-size:14px;
      line-height:24px;
    ">
      <strong>Important:</strong>
      Confirm the exact bank credit amount and reference
      in the official bank statement before approving
      the manual payment. Do not approve based solely
      on the uploaded screenshot.
    </div>
  `;

  return {
    customerHtml: emailLayout({
      title: "Payment Proof Received",
      subtitle: "Your payment verification is in progress.",
      content: customerContent,
    }),

    adminHtml: emailLayout({
      title: "Manual Payment Awaiting Verification",
      subtitle: "Action required from the payment verification team.",
      content: adminContent,
    }),
  };
};
