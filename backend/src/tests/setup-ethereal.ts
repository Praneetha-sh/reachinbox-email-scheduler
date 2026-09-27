import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

async function main() {
  console.log("Creating a new Ethereal test account...");

  const account = await nodemailer.createTestAccount();

  const envPath = path.resolve(process.cwd(), ".env");

  const etherealConfig = `
# Ethereal SMTP
ETHEREAL_SMTP_HOST="${account.smtp.host}"
ETHEREAL_SMTP_PORT="${account.smtp.port}"
ETHEREAL_SMTP_SECURE="${account.smtp.secure}"
ETHEREAL_SMTP_USER="${account.user}"
ETHEREAL_SMTP_PASSWORD="${account.pass}"
ETHEREAL_FROM_NAME="ReachInbox"
`;

  fs.appendFileSync(envPath, etherealConfig);

  console.log("Ethereal account created and saved to backend/.env.");
  console.log({
    smtpHost: account.smtp.host,
    smtpPort: account.smtp.port,
    user: account.user,
  });
}

main().catch((error) => {
  console.error("Failed to configure Ethereal:", error);
  process.exit(1);
});