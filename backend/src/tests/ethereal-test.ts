import nodemailer from "nodemailer";

async function main() {
  console.log("Creating Ethereal test account...");

  const testAccount = await nodemailer.createTestAccount();

  console.log("Ethereal test account created.");
  console.log({
    user: testAccount.user,
    smtpHost: testAccount.smtp.host,
    smtpPort: testAccount.smtp.port,
  });

  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log("Sending test email...");

  const info = await transporter.sendMail({
    from: `"ReachInbox Test" <${testAccount.user}>`,
    to: "test@example.com",
    subject: "ReachInbox Ethereal Test",
    text: "This is a test email from the ReachInbox email scheduler.",
    html: `
      <h2>ReachInbox Ethereal Test</h2>
      <p>This is a test email from the ReachInbox email scheduler.</p>
    `,
  });

  console.log("Test email sent successfully.");
  console.log({
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  });
}

main().catch((error) => {
  console.error("Ethereal test failed:", error);
  process.exit(1);
});