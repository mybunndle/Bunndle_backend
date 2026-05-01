const adminQuickConnectTemplate = ({ name, email, message }) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>New Quick Connect Request</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f6f8;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        background: #ffffff;
        margin: auto;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      h2 {
        color: #333;
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
      }
      .info {
        margin: 15px 0;
      }
      .info strong {
        display: inline-block;
        width: 90px;
      }
      .message {
        margin-top: 15px;
        padding: 12px;
        background: #f9f9f9;
        border-left: 4px solid #007bff;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>New Quick Connect Request</h2>

      <div class="info"><strong>Name:</strong> ${name}</div>
      <div class="info"><strong>Email:</strong> ${email}</div>
      

      <div class="message">
        <strong>Message:</strong><br />
        ${message}
      </div>

      <p style="margin-top: 20px; color: #666;">
        Please reach out to the user as soon as possible.
      </p>
    </div>
  </body>
  </html>
  `;
};


export default adminQuickConnectTemplate