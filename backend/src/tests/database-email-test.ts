import "dotenv/config";
import { prisma } from "../config/prisma.js";
import { emailQueue } from "../queues/email.queue.js";
import { calculateScheduledTime } from "../services/scheduling.service.js";

async function main() {
  console.log("Creating test user...");

  const testUser = await prisma.user.create({
    data: {
      googleId: `test-google-${Date.now()}`,
      email: `test-user-${Date.now()}@example.com`,
      name: "ReachInbox Test User",
    },
  });

  console.log("Test user created:", testUser.id);

  console.log("Creating test sender...");

  const sender = await prisma.sender.create({
    data: {
      userId: testUser.id,
      email: process.env.ETHEREAL_SMTP_USER!,
      name: "ReachInbox Test Sender",
      smtpHost: process.env.ETHEREAL_SMTP_HOST!,
      smtpPort: Number(process.env.ETHEREAL_SMTP_PORT),
      smtpUsername: process.env.ETHEREAL_SMTP_USER!,
      smtpPasswordEncrypted: "TEST_PASSWORD_PLACEHOLDER",
    },
  });

  console.log("Test sender created:", sender.id);

  const delayBetweenMs = 2_000;
  const startTime = new Date(Date.now() + 5_000);

  console.log("Creating test campaign...");

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId: testUser.id,
      senderId: sender.id,
      name: "Scheduling Delay Test",
      subject: "ReachInbox Scheduling Test",
      body: "This email tests persistent scheduling with BullMQ.",
      startTime,
      delayBetweenMs,
      hourlyLimit: 100,
    },
  });

  console.log("Test campaign created:", campaign.id);

  const recipients = [
    "test1@example.com",
    "test2@example.com",
    "test3@example.com",
  ];

  for (let index = 0; index < recipients.length; index++) {
    const recipientEmail = recipients[index];

    const scheduledAt = calculateScheduledTime({
      startTime,
      index,
      delayBetweenMs,
    });

    console.log(`Creating email ${index + 1}...`);

    const email = await prisma.email.create({
      data: {
        campaignId: campaign.id,
        senderId: sender.id,
        recipientEmail,
        subject: "ReachInbox Scheduling Test",
        body: `Scheduling test email ${index + 1}.`,
        scheduledAt,
        status: "SCHEDULED",
        idempotencyKey: `scheduling-test-${Date.now()}-${index}`,
      },
    });

    const delay = Math.max(
      0,
      scheduledAt.getTime() - Date.now(),
    );

    const job = await emailQueue.add(
      "send-email",
      {
        emailId: email.id,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        body: email.body,
      },
      {
        delay,
      },
    );

    await prisma.email.update({
      where: {
        id: email.id,
      },
      data: {
        status: "QUEUED",
        bullmqJobId: String(job.id),
      },
    });

    await prisma.emailEvent.create({
      data: {
        emailId: email.id,
        type: "QUEUED",
        message: `BullMQ job ${job.id} scheduled for ${scheduledAt.toISOString()}.`,
      },
    });

    console.log({
      emailNumber: index + 1,
      emailId: email.id,
      jobId: job.id,
      recipientEmail,
      scheduledAt: scheduledAt.toISOString(),
      delayMs: delay,
    });
  }

  console.log("\nScheduling test completed.");

  await emailQueue.close();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Scheduling test failed:", error);

  await prisma.$disconnect();

  process.exit(1);
});