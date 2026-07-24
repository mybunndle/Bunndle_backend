// const escapeHtml = (value = "") => {
//   return String(value)
//     .replaceAll("&", "&amp;")
//     .replaceAll("<", "&lt;")
//     .replaceAll(">", "&gt;")
//     .replaceAll('"', "&quot;")
//     .replaceAll("'", "&#039;");
// };


// const adminEnquiryTemplate = ({
//   userType,
//   name,
//   companyName,
//   pointOfContact,
//   mobile,
//   email,
//   city,
//   address,
//   message,
// }) => {
//   const isCorporate = userType === "corporate";

//   const customerName = isCorporate ? pointOfContact : name;
//   const enquiryType = isCorporate ? "Corporate" : "Individual";

//   const safeName = escapeHtml(customerName);
//   const safeCompanyName = escapeHtml(companyName);
//   const safeMobile = escapeHtml(mobile);
//   const safeEmail = escapeHtml(email);
//   const safeCity = escapeHtml(city);
//   const safeAddress = escapeHtml(address);
//   const safeMessage = escapeHtml(message);

//   return `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />

//   <meta
//     name="viewport"
//     content="width=device-width, initial-scale=1.0"
//   />

//   <title>New ${enquiryType} Enquiry - Bunndle</title>
// </head>

// <body
//   bgcolor="#f3f7fb"
//   style="
//     margin:0;
//     padding:0;
//     background-color:#f3f7fb;
//     font-family:Arial,Helvetica,sans-serif;
//     color:#111827;
//   "
// >
//   <table
//     role="presentation"
//     width="100%"
//     cellspacing="0"
//     cellpadding="0"
//     border="0"
//     bgcolor="#f3f7fb"
//     style="
//       width:100%;
//       background-color:#f3f7fb;
//       padding:18px 8px;
//     "
//   >
//     <tr>
//       <td align="center">

//         <table
//           role="presentation"
//           width="100%"
//           cellspacing="0"
//           cellpadding="0"
//           border="0"
//           bgcolor="#ffffff"
//           style="
//             width:100%;
//             max-width:560px;
//             background-color:#ffffff;
//             border-radius:16px;
//             overflow:hidden;
//             box-shadow:0 8px 24px rgba(14,61,105,0.10);
//           "
//         >

//           <!-- Header -->
//           <tr>
//             <td
//               align="center"
//               bgcolor="#0f4f91"
//               style="
//                 background-color:#0f4f91;
//                 padding:26px 18px 24px;
//               "
//             >
//               <table
//                 role="presentation"
//                 cellspacing="0"
//                 cellpadding="0"
//                 border="0"
//                 style="margin:0 auto 14px;"
//               >
//                 <tr>
//                   <td
//                     align="center"
//                     width="104"
//                     height="104"
//                     bgcolor="#ffffff"
//                     style="
//                       width:104px;
//                       height:104px;
//                       background-color:#ffffff;
//                       border-radius:14px;
//                       overflow:hidden;
//                       padding:0;
//                       line-height:0;
//                     "
//                   >
//                     <img
//                       src="https://ik.imagekit.io/bunndle/logo/WhatsApp%20Image%202026-07-10%20at%2012.02.32.jpeg"
//                       alt="Bunndle"
//                       width="104"
//                       style="
//                         display:block;
//                         width:104px;
//                         max-width:104px;
//                         height:auto;
//                         background-color:#ffffff;
//                         border:0;
//                         margin:0 auto;
//                       "
//                     />
//                   </td>
//                 </tr>
//               </table>

//               <h1
//                 style="
//                   margin:0;
//                   color:#ffffff;
//                   font-family:Georgia,'Times New Roman',serif;
//                   font-size:27px;
//                   line-height:1.25;
//                   font-weight:700;
//                 "
//               >
//                 New ${enquiryType} Enquiry
//               </h1>

//               <table
//                 role="presentation"
//                 cellspacing="0"
//                 cellpadding="0"
//                 border="0"
//                 style="margin:12px auto 10px;"
//               >
//                 <tr>
//                   <td
//                     width="78"
//                     style="
//                       width:78px;
//                       height:1px;
//                       background-color:#f58220;
//                       font-size:0;
//                       line-height:0;
//                     "
//                   ></td>

//                   <td
//                     style="
//                       padding:0 9px;
//                       color:#f58220;
//                       font-size:11px;
//                     "
//                   >
//                     ◆
//                   </td>

//                   <td
//                     width="78"
//                     style="
//                       width:78px;
//                       height:1px;
//                       background-color:#f58220;
//                       font-size:0;
//                       line-height:0;
//                     "
//                   ></td>
//                 </tr>
//               </table>

//               <p
//                 style="
//                   margin:0;
//                   color:#ffffff;
//                   font-size:15px;
//                   line-height:1.4;
//                 "
//               >
//                 Website Enquiry Notification
//               </p>
//             </td>
//           </tr>

//           <!-- Body -->
//           <tr>
//             <td style="padding:28px 20px 26px;">

//               <h2
//                 style="
//                   margin:0 0 14px;
//                   color:#111827;
//                   font-size:20px;
//                   line-height:1.4;
//                   font-weight:700;
//                 "
//               >
//                 New customer enquiry received
//               </h2>

//               <p
//                 style="
//                   margin:0 0 20px;
//                   color:#334155;
//                   font-size:14px;
//                   line-height:1.65;
//                 "
//               >
//                 A new <strong>${enquiryType.toLowerCase()}</strong> enquiry has
//                 been submitted through the Bunndle website. The complete
//                 details are provided below.
//               </p>

//               <!-- Enquiry Badge -->
//               <table
//                 role="presentation"
//                 width="100%"
//                 cellspacing="0"
//                 cellpadding="0"
//                 border="0"
//                 style="margin-bottom:20px;"
//               >
//                 <tr>
//                   <td
//                     bgcolor="#fff5eb"
//                     style="
//                       background-color:#fff5eb;
//                       border:1px solid #fed7aa;
//                       border-radius:12px;
//                       padding:15px 16px;
//                     "
//                   >
//                     <p
//                       style="
//                         margin:0;
//                         color:#9a4f0a;
//                         font-size:13px;
//                         line-height:1.6;
//                         font-weight:600;
//                       "
//                     >
//                       Enquiry Type: ${enquiryType}
//                     </p>
//                   </td>
//                 </tr>
//               </table>

//               <!-- Customer Details -->
//               <table
//                 role="presentation"
//                 width="100%"
//                 cellspacing="0"
//                 cellpadding="0"
//                 border="0"
//                 bgcolor="#f6f9fd"
//                 style="
//                   width:100%;
//                   background-color:#f6f9fd;
//                   border-left:4px solid #f58220;
//                   border-radius:12px;
//                   margin-bottom:20px;
//                 "
//               >
//                 <tr>
//                   <td style="padding:18px 16px;">

//                     <p
//                       style="
//                         margin:0 0 16px;
//                         color:#0f4f91;
//                         font-size:15px;
//                         font-weight:700;
//                       "
//                     >
//                       Customer Details
//                     </p>

//                     ${
//                       isCorporate
//                         ? `
//                           ${detailRow(
//                             "🏢",
//                             "Company Name",
//                             safeCompanyName || "Not provided"
//                           )}

//                           ${detailRow(
//                             "👤",
//                             "Point of Contact",
//                             safeName || "Not provided"
//                           )}
//                         `
//                         : detailRow(
//                             "👤",
//                             "Name",
//                             safeName || "Not provided"
//                           )
//                     }

//                     ${detailRow(
//                       "📞",
//                       "Mobile",
//                       `
//                         <a
//                           href="tel:${safeMobile}"
//                           style="
//                             color:#0f4f91;
//                             text-decoration:none;
//                           "
//                         >
//                           ${safeMobile || "Not provided"}
//                         </a>
//                       `
//                     )}

//                     ${detailRow(
//                       "✉",
//                       "Email",
//                       `
//                         <a
//                           href="mailto:${safeEmail}"
//                           style="
//                             color:#0f4f91;
//                             text-decoration:none;
//                           "
//                         >
//                           ${safeEmail || "Not provided"}
//                         </a>
//                       `
//                     )}

//                     ${detailRow(
//                       "📍",
//                       "City",
//                       safeCity || "Not provided"
//                     )}

//                     ${detailRow(
//                       "🏠",
//                       "Address",
//                       safeAddress || "Not provided",
//                       true
//                     )}

//                   </td>
//                 </tr>
//               </table>

//               <!-- Customer Message -->
//               <table
//                 role="presentation"
//                 width="100%"
//                 cellspacing="0"
//                 cellpadding="0"
//                 border="0"
//                 style="margin-bottom:20px;"
//               >
//                 <tr>
//                   <td
//                     bgcolor="#ffffff"
//                     style="
//                       background-color:#ffffff;
//                       border:1px solid #dbe4ee;
//                       border-radius:12px;
//                       padding:18px 16px;
//                     "
//                   >
//                     <p
//                       style="
//                         margin:0 0 10px;
//                         color:#475569;
//                         font-size:12px;
//                         line-height:1.4;
//                         font-weight:600;
//                       "
//                     >
//                       💬 Customer Message
//                     </p>

//                     <p
//                       style="
//                         margin:0;
//                         color:#1f2937;
//                         font-size:14px;
//                         line-height:1.65;
//                         white-space:pre-line;
//                         word-break:break-word;
//                       "
//                     >
//                       ${safeMessage || "No message provided"}
//                     </p>
//                   </td>
//                 </tr>
//               </table>

//               <!-- Action Box -->
//               <table
//                 role="presentation"
//                 width="100%"
//                 cellspacing="0"
//                 cellpadding="0"
//                 border="0"
//                 style="margin-bottom:22px;"
//               >
//                 <tr>
//                   <td
//                     bgcolor="#eef7ff"
//                     style="
//                       background-color:#eef7ff;
//                       border:1px solid #d4e8fa;
//                       border-radius:12px;
//                       padding:16px;
//                     "
//                   >
//                     <p
//                       style="
//                         margin:0 0 12px;
//                         color:#24577f;
//                         font-size:13px;
//                         line-height:1.6;
//                       "
//                     >
//                       Please review this enquiry and contact the customer at
//                       the earliest convenience.
//                     </p>

//                     <table
//                       role="presentation"
//                       cellspacing="0"
//                       cellpadding="0"
//                       border="0"
//                     >
//                       <tr>
//                         <td
//                           bgcolor="#0f4f91"
//                           style="
//                             background-color:#0f4f91;
//                             border-radius:8px;
//                           "
//                         >
//                           <a
//                             href="mailto:${safeEmail}"
//                             style="
//                               display:inline-block;
//                               padding:11px 18px;
//                               color:#ffffff;
//                               text-decoration:none;
//                               font-size:13px;
//                               font-weight:700;
//                             "
//                           >
//                             Reply to Customer
//                           </a>
//                         </td>

//                         <td width="10"></td>

//                         <td
//                           bgcolor="#f58220"
//                           style="
//                             background-color:#f58220;
//                             border-radius:8px;
//                           "
//                         >
//                           <a
//                             href="tel:${safeMobile}"
//                             style="
//                               display:inline-block;
//                               padding:11px 18px;
//                               color:#ffffff;
//                               text-decoration:none;
//                               font-size:13px;
//                               font-weight:700;
//                             "
//                           >
//                             Call Customer
//                           </a>
//                         </td>
//                       </tr>
//                     </table>
//                   </td>
//                 </tr>
//               </table>

//               <p
//                 style="
//                   margin:0;
//                   color:#334155;
//                   font-size:14px;
//                   line-height:1.6;
//                 "
//               >
//                 Regards,<br />

//                 <strong style="color:#0f4f91;">
//                   Bunndle Website System
//                 </strong>
//               </p>
//             </td>
//           </tr>

//           <!-- Footer -->
//           ${adminFooterTemplate()}

//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>
//   `;
// };

// const detailRow = (icon, label, value, isLast = false) => {
//   return `
//     <table
//       role="presentation"
//       width="100%"
//       cellspacing="0"
//       cellpadding="0"
//       border="0"
//     >
//       <tr>
//         <td
//           width="32"
//           valign="top"
//           style="
//             width:32px;
//             color:#0f4f91;
//             font-size:16px;
//             padding:3px 8px ${isLast ? "0" : "12px"} 0;
//           "
//         >
//           ${icon}
//         </td>

//         <td style="padding-bottom:${isLast ? "0" : "12px"};">
//           <p
//             style="
//               margin:0;
//               color:#475569;
//               font-size:12px;
//               line-height:1.4;
//             "
//           >
//             ${label}
//           </p>

//           <p
//             style="
//               margin:2px 0 0;
//               color:#111827;
//               font-size:14px;
//               line-height:1.5;
//               font-weight:600;
//               word-break:break-word;
//             "
//           >
//             ${value}
//           </p>
//         </td>
//       </tr>
//     </table>
//   `;
// };

// const adminFooterTemplate = () => {
//   return `
//     <tr>
//       <td
//         align="center"
//         bgcolor="#f5f9fe"
//         style="
//           background-color:#f5f9fe;
//           border-top:1px solid #e3edf7;
//           padding:22px 18px;
//         "
//       >
//         <p
//           style="
//             margin:0 0 8px;
//             color:#334155;
//             font-size:13px;
//             line-height:1.5;
//           "
//         >
//           This is an automated enquiry notification from Bunndle.
//         </p>

//         <p
//           style="
//             margin:0;
//             color:#64748b;
//             font-size:11px;
//             line-height:1.5;
//           "
//         >
//           © ${new Date().getFullYear()} Agent Alliance Private Limited.
//           All rights reserved.
//         </p>
//       </td>
//     </tr>
//   `;
// };

// export default adminEnquiryTemplate;



const escapeHtml = (value = "") => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const adminEnquiryTemplate = ({
  userType,
  name,
  companyName,
  pointOfContact,
  mobile,
  email,
  city,
  address,
  message,
  asset,
}) => {
  const isCorporate = userType === "corporate";

  const customerName = isCorporate ? pointOfContact : name;
  const enquiryType = isCorporate ? "Corporate" : "Individual";

  const safeName = escapeHtml(customerName);
  const safeCompanyName = escapeHtml(companyName);
  const safeMobile = escapeHtml(mobile);
  const safeEmail = escapeHtml(email);
  const safeCity = escapeHtml(city);
  const safeAddress = escapeHtml(address);
  const safeMessage = escapeHtml(message);

  const safeAssetId = escapeHtml(asset?.id);
  const safeAssetName = escapeHtml(asset?.assetName);
  const safeBrand = escapeHtml(asset?.brand);
  const safeModel = escapeHtml(asset?.model);
  const safeCategory = escapeHtml(asset?.category);
  const safeSubCategory = escapeHtml(asset?.subCategory);
  const safePrice = escapeHtml(asset?.price);
  const safePurchaseYear = escapeHtml(asset?.purchaseYear);
  const safeImageUrl = escapeHtml(asset?.imageUrl);

  const assetTitle =
    safeAssetName ||
    `${safeBrand || ""} ${safeModel || ""}`.trim() ||
    "Selected Asset";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>New ${enquiryType} Enquiry - Bunndle</title>
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
                New ${enquiryType} Enquiry
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
                Website Asset Enquiry Notification
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
                New customer enquiry received
              </h2>

              <p
                style="
                  margin:0 0 20px;
                  color:#334155;
                  font-size:14px;
                  line-height:1.65;
                "
              >
                A new <strong>${enquiryType.toLowerCase()}</strong> enquiry has
                been submitted for <strong>${assetTitle}</strong>. The complete
                asset and customer details are shown below.
              </p>

              <!-- Enquiry Type -->
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
                    bgcolor="#fff5eb"
                    style="
                      background-color:#fff5eb;
                      border:1px solid #fed7aa;
                      border-radius:12px;
                      padding:15px 16px;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        color:#9a4f0a;
                        font-size:13px;
                        line-height:1.6;
                        font-weight:600;
                      "
                    >
                      Enquiry Type: ${enquiryType}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Asset Details -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                bgcolor="#fff8f1"
                style="
                  width:100%;
                  background-color:#fff8f1;
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
                        color:#9a4f0a;
                        font-size:15px;
                        font-weight:700;
                      "
                    >
                      Enquired Asset Details
                    </p>

                    ${
                      safeImageUrl
                        ? `
                          <img
                            src="${safeImageUrl}"
                            alt="${assetTitle}"
                            width="100%"
                            style="
                              display:block;
                              width:100%;
                              max-width:500px;
                              max-height:280px;
                              height:auto;
                              object-fit:cover;
                              border-radius:12px;
                              margin:0 0 18px;
                              border:0;
                            "
                          />
                        `
                        : ""
                    }

                    <p
                      style="
                        margin:0 0 14px;
                        color:#111827;
                        font-size:18px;
                        line-height:1.4;
                        font-weight:700;
                      "
                    >
                      ${assetTitle}
                    </p>

                    ${detailRow(
                      "🆔",
                      "Asset ID",
                      safeAssetId || "Not available"
                    )}

                    ${detailRow(
                      "📂",
                      "Category",
                      safeCategory || "Not provided"
                    )}

                    ${detailRow(
                      "📁",
                      "Subcategory",
                      safeSubCategory || "Not provided"
                    )}

                    ${detailRow(
                      "🏷️",
                      "Brand",
                      safeBrand || "Not provided"
                    )}

                    ${detailRow(
                      "⚙️",
                      "Model",
                      safeModel || "Not provided"
                    )}

                    ${detailRow(
                      "📅",
                      "Purchase Year",
                      safePurchaseYear || "Not provided"
                    )}

                    ${detailRow(
                      "₹",
                      "Price",
                      safePrice || "Contact for price",
                      true
                    )}

                  </td>
                </tr>
              </table>

              <!-- Customer Details -->
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
                  border-left:4px solid #0f4f91;
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
                      Customer Details
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
                            safeName || "Not provided"
                          )}
                        `
                        : detailRow(
                            "👤",
                            "Name",
                            safeName || "Not provided"
                          )
                    }

                    ${detailRow(
                      "📞",
                      "Mobile",
                      `
                        <a
                          href="tel:${safeMobile}"
                          style="
                            color:#0f4f91;
                            text-decoration:none;
                          "
                        >
                          ${safeMobile || "Not provided"}
                        </a>
                      `
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

              <!-- Customer Message -->
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
                      💬 Customer Message
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

              <!-- Admin Actions -->
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
                        margin:0 0 12px;
                        color:#24577f;
                        font-size:13px;
                        line-height:1.6;
                      "
                    >
                      Please review this asset enquiry and contact the customer
                      at the earliest convenience.
                    </p>

                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          bgcolor="#0f4f91"
                          style="
                            background-color:#0f4f91;
                            border-radius:8px;
                          "
                        >
                          <a
                            href="mailto:${safeEmail}"
                            style="
                              display:inline-block;
                              padding:11px 16px;
                              color:#ffffff;
                              text-decoration:none;
                              font-size:13px;
                              font-weight:700;
                            "
                          >
                            Reply to Customer
                          </a>
                        </td>

                        <td width="10"></td>

                        <td
                          bgcolor="#f58220"
                          style="
                            background-color:#f58220;
                            border-radius:8px;
                          "
                        >
                          <a
                            href="tel:${safeMobile}"
                            style="
                              display:inline-block;
                              padding:11px 16px;
                              color:#ffffff;
                              text-decoration:none;
                              font-size:13px;
                              font-weight:700;
                            "
                          >
                            Call Customer
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

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
                  Bunndle Website System
                </strong>
              </p>

            </td>
          </tr>

          ${adminFooterTemplate()}

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

const adminFooterTemplate = () => {
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
          This is an automated asset enquiry notification from Bunndle.
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

export default adminEnquiryTemplate;