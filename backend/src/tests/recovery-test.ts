import "dotenv/config";
import { prisma } from "../config/prisma.js";

async function main() {
  console.log("Recovery test started.");

  const user = await prisma.user.create({
    data: {
      googleId: `recovery-test-google-${Date.now()}`,
      email: `recovery-test-${Date.now()}@example.com`,
      name: "Recovery Test User",
    },
  });

  const sender = await prisma.sender.create({
    data: {
      userId: user.id,
      email: process.env.ETHEREAL_SMTP_USER!,
      name: "Recovery Test Sender",
      smtpHost: process.env.ETHEREAL_SMTP_HOST!,
      smtpPort: Number(process.env.ETHEREAL_SMTP_PORT),
      smtpUsername: process.env.ETHEREAL_SMTP_USER!,
      smtpPasswordEncrypted: "TEST_PASSWORD_PLACEHOLDER",
    },
  });

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId: user.id,
      senderId: sender.id,
      name: "Recovery Test Campaign",
      subject: "Recovery Test",
      body: "This email is only for testing recovery.",
      startTime: new Date(),
      delayBetweenMs: 1000,
      hourlyLimit: 100,
    },
  });

  const staleProcessingTime = new Date(
    Date.now() - 20 * 60 * 1000,
  );

  const email = await prisma.email.create({
    data: {
      campaignId: campaign.id,
      senderId: sender.id,
      recipientEmail: "recovery-test@example.com",
      subject: "Recovery Test",
      body: "This email must never be sent.",
      scheduledAt: new Date(),
      status: "PROCESSING",
      processingStartedAt: staleProcessingTime,
      idempotencyKey:
        `recovery-test-${Date.now()}`,
      attempts: 1,
    },
  });

  console.log("Created stale PROCESSING email:");
  console.log({
    emailId: email.id,
    status: email.status,
    processingStartedAt:
      email.processingStartedAt?.toISOString(),
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(
    "Recovery test setup failed:",
    error,
  );

  await prisma.$disconnect();
  process.exit(1);
});