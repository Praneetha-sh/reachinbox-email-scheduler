import "dotenv/config";
import nodemailer from "nodemailer";
import { prisma } from "../config/prisma.js";
import { emailQueue } from "../queues/email.queue.js";

async function main(): Promise<void> {
  console.log("Multiple sender test started.");

  const userId =
    "ce57d4d4-1ed6-4aff-82ed-7f4daa0eb419";

  // Create a second Ethereal test account.
  const etherealAccount =
    await nodemailer.createTestAccount();

  console.log("Second Ethereal account created:");
  console.log({
    email: etherealAccount.user,
    host: etherealAccount.smtp.host,
  });

  // Create a second sender for our authenticated user.
  const secondSender = await prisma.sender.create({
    data: {
      userId,
      email: etherealAccount.user,
      name: "Second Test Sender",
      smtpHost: etherealAccount.smtp.host,
      smtpPort: etherealAccount.smtp.port,
      smtpUsername: etherealAccount.user,
      smtpPasswordEncrypted: etherealAccount.pass,
      isActive: true,
    },
  });

  console.log("Second sender created:");
  console.log({
    senderId: secondSender.id,
    email: secondSender.email,
  });

  // Create a campaign.
  const campaign = await prisma.emailCampaign.create({
    data: {
      userId,
      senderId: secondSender.id,
      name: "Multiple Sender Test",
      subject: "Multiple Sender Test",
      body: "Testing sender-specific SMTP configuration.",
      startTime: new Date(),
      delayBetweenMs: 0,
      hourlyLimit: 100,
    },
  });

  // Create an email using the SECOND sender.
  const email = await prisma.email.create({
    data: {
      campaignId: campaign.id,
      senderId: secondSender.id,
      recipientEmail: "test@example.com",
      subject: "Multiple Sender Test",
      body: "Testing sender-specific SMTP configuration.",
      scheduledAt: new Date(),
      status: "QUEUED",
      idempotencyKey:
        `multiple-sender-test-${Date.now()}`,
    },
  });

  // Queue the email.
  const job = await emailQueue.add(
    "send-email",
    {
      emailId: email.id,
      senderId: secondSender.id,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
    },
    {
      jobId: email.id,
    },
  );

  await prisma.email.update({
    where: {
      id: email.id,
    },
    data: {
      bullmqJobId: String(job.id),
    },
  });

  console.log("Email queued:");
  console.log({
    emailId: email.id,
    senderId: secondSender.id,
    jobId: String(job.id),
  });

  console.log("");
  console.log(
    "Now keep the backend worker running and wait for the email to be processed.",
  );
}

main()
  .catch((error) => {
    console.error(
      "Multiple sender test failed:",
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });