import { emailQueue } from "../queues/email.queue.js";

async function main() {
  const delay = 10_000;

  const job = await emailQueue.add(
    "test-email",
    {
      emailId: "smtp-worker-test-001",
      recipientEmail: "test@example.com",
      subject: "ReachInbox BullMQ Worker Test",
      body: "This email was sent by the BullMQ worker through Ethereal SMTP.",
    },
    {
      delay,
    },
  );

  console.log("Test BullMQ email job created.");
  console.log({
    jobId: job.id,
    delay: `${delay / 1000} seconds`,
    scheduledFor: new Date(Date.now() + delay).toISOString(),
  });

  await emailQueue.close();
}

main().catch((error) => {
  console.error("Failed to create test job:", error);
  process.exit(1);
});