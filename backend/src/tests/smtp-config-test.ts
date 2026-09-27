import "dotenv/config";
import nodemailer from "nodemailer";

async function main() {
  console.log("Reading Ethereal configuration from .env...");

  const host = process.env.ETHEREAL_SMTP_HOST;
  const port = Number(process.env.ETHEREAL_SMTP_PORT);
  const secure = process.env.ETHEREAL_SMTP_SECURE === "true";
  const user = process.env.ETHEREAL_SMTP_USER;
  const password = process.env.ETHEREAL_SMTP_PASSWORD;
  const fromName = process.env.ETHEREAL_FROM_NAME ?? "ReachInbox";

  if (!host || !port || !user || !password) {
    throw new Error("Ethereal SMTP configuration is missing from .env");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass: password,
    },
  });

  console.log("SMTP configuration loaded.");
  console.log({
    host,
    port,
    secure,
    user,
  });

  console.log("Sending test email...");

  const info = await transporter.sendMail({
    from: `"${fromName}" <${user}>`,
    to: "test@example.com",
    subject: "ReachInbox Saved SMTP Configuration Test",
    text: "This email was sent using the Ethereal credentials stored in backend/.env.",
    html: `
      <h2>ReachInbox SMTP Configuration Test</h2>
      <p>
        This email was sent using the Ethereal credentials
        stored in <code>backend/.env</code>.
      </p>
    `,
  });

  console.log("Email sent successfully.");
  console.log({
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  });
}

main().catch((error) => {
  console.error("SMTP test failed:", error);
  process.exit(1);
});