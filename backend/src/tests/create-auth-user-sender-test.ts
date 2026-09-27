import "dotenv/config";
import { prisma } from "../config/prisma.js";

async function main(): Promise<void> {
  const userId = "ce57d4d4-1ed6-4aff-82ed-7f4daa0eb419";

  const smtpHost = process.env.ETHEREAL_SMTP_HOST;
  const smtpPort = Number(process.env.ETHEREAL_SMTP_PORT);
  const smtpUsername = process.env.ETHEREAL_SMTP_USER;
  const smtpPassword = process.env.ETHEREAL_SMTP_PASSWORD;

  if (
    !smtpHost ||
    !smtpPort ||
    !smtpUsername ||
    !smtpPassword
  ) {
    throw new Error(
      "Ethereal SMTP configuration is missing from backend/.env",
    );
  }

  const existingSender = await prisma.sender.findFirst({
    where: {
      userId,
    },
  });

  if (existingSender) {
    console.log("Sender already exists:", {
      id: existingSender.id,
      email: existingSender.email,
    });

    return;
  }

  const sender = await prisma.sender.create({
    data: {
      userId,
      email: smtpUsername,
      name: "ReachInbox Test Sender",
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPasswordEncrypted: smtpPassword,
      isActive: true,
    },
  });

  console.log("Test sender created:", {
    id: sender.id,
    email: sender.email,
    userId: sender.userId,
  });
}

main()
  .catch((error) => {
    console.error("Failed to create test sender:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });