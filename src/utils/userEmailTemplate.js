export const userEmailTemplate = ({
  name,
  email,
  message,
}) => {

  return `

  <div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">

    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden;">

      <div style="background: #000000; padding: 20px; text-align: center;">

        <h1 style="color: #ffffff; margin: 0;">
          Bunndle
        </h1>

      </div>

      <div style="padding: 30px; color: #333333;">

        <h2>Hello ${name},</h2>

        <p>
          Thank you for contacting <strong>Bunndle</strong>.
        </p>

        <p>
          We have successfully received your quick connect request.
        </p>

        <div style="
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        ">

          <p>
            <strong>Name:</strong> ${name}
          </p>

          <p>
            <strong>Email:</strong> ${email}
          </p>

          <p>
            <strong>Message:</strong>
          </p>

          <p>
            ${message}
          </p>

        </div>

        <p>
          Our team will review your request and contact you shortly.
        </p>

        <p>
          Thank you for choosing Bunndle.
        </p>

        <br />

        <p>
          Regards,
        </p>

        <p>
          <strong>Bunndle Support Team</strong>
        </p>

      </div>

      <div style="
        background: #f1f1f1;
        padding: 15px;
        text-align: center;
        font-size: 12px;
        color: #777777;
      ">

        © ${new Date().getFullYear()} Bunndle. All rights reserved.

      </div>

    </div>

  </div>

  `;
};