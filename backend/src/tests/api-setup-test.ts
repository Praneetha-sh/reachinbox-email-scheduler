import "dotenv/config";
import { prisma } from "../config/prisma.js";

async function main() {
  console.log("Creating API test user...");

  const user = await prisma.user.create({
    data: {
      googleId: `api-test-google-${Date.now()}`,
      email: `api-test-user-${Date.now()}@example.com`,
      name: "ReachInbox API Test User",
    },
  });

  console.log("API test user created:");
  console.log({
    userId: user.id,
    email: user.email,
  });

  console.log("Creating API test sender...");

  const sender = await prisma.sender.create({
    data: {
      userId: user.id,
      email: process.env.ETHEREAL_SMTP_USER!,
      name: "ReachInbox API Test Sender",
      smtpHost: process.env.ETHEREAL_SMTP_HOST!,
      smtpPort: Number(process.env.ETHEREAL_SMTP_PORT),
      smtpUsername: process.env.ETHEREAL_SMTP_USER!,
      smtpPasswordEncrypted: "TEST_PASSWORD_PLACEHOLDER",
    },
  });

  console.log("API test sender created:");
  console.log({
    senderId: sender.id,
    email: sender.email,
  });

  console.log("\nCopy these two IDs for the next test:");
  console.log({
    userId: user.id,
    senderId: sender.id,
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("API setup test failed:", error);

  await prisma.$disconnect();

  process.exit(1);
});