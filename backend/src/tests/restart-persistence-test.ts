import "dotenv/config";

import { prisma } from "../config/prisma.js";
import { emailQueue } from "../queues/email.queue.js";

async function main(): Promise<void> {
  console.log("Restart persistence test started.");

  const userId =
    "ce57d4d4-1ed6-4aff-82ed-7f4daa0eb419";

  const sender = await prisma.sender.findFirst({
    where: {
      userId,
      isActive: true,
    },
  });

  if (!sender) {
    throw new Error(
      "No active sender found for the test user.",
    );
  }

  const startTime = new Date(
    Date.now() + 30_000,
  );

  const campaign =
    await prisma.emailCampaign.create({
      data: {
        userId,
        senderId: sender.id,
        name: "Restart Persistence Test",
        subject: "Restart Persistence Test",
        body:
          "This email should survive a backend restart.",
        startTime,
        delayBetweenMs: 0,
        hourlyLimit: 100,
      },
    });

  const email = await prisma.email.create({
    data: {
      campaignId: campaign.id,
      senderId: sender.id,
      recipientEmail: "test@example.com",
      subject: "Restart Persistence Test",
      body:
        "This email should survive a backend restart.",
      scheduledAt: startTime,
      status: "QUEUED",
      idempotencyKey:
        `restart-test-${Date.now()}`,
    },
  });

  const delay =
    startTime.getTime() - Date.now();

  const job = await emailQueue.add(
    "send-email",
    {
      emailId: email.id,
      senderId: email.senderId,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
    },
    {
      delay: Math.max(0, delay),
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

  console.log("Future job created:");
  console.log({
    emailId: email.id,
    jobId: String(job.id),
    scheduledAt: startTime.toISOString(),
  });

  console.log("");
  console.log(
    "STOP THE BACKEND NOW, THEN START IT AGAIN WITH npm run dev.",
  );
  console.log(
    "The email should be processed after the scheduled time.",
  );
}

main()
  .catch((error) => {
    console.error(
      "Restart persistence test failed:",
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });