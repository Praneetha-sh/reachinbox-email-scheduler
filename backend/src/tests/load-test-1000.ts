import "dotenv/config";

import { emailQueue } from "../queues/email.queue.js";

async function main(): Promise<void> {
  console.log("1000-job BullMQ load test started.");

  const startTime = Date.now() + 60 * 60 * 1000;

  const jobs = Array.from(
    { length: 1000 },
    (_, index) => ({
      name: "send-email",
      data: {
        emailId: `load-test-${Date.now()}-${index}`,
        senderId: "load-test-sender",
        recipientEmail:
          `load-test-${index}@example.com`,
        subject: "Load Test",
        body: "1000 BullMQ delayed-job load test.",
      },
      opts: {
        delay:
          startTime +
          index * 1000 -
          Date.now(),
        jobId:
          `load-test-${Date.now()}-${index}`,
      },
    }),
  );

  const start = Date.now();

  await emailQueue.addBulk(jobs);

  const elapsedMs = Date.now() - start;

  console.log("1000-job BullMQ load test completed:");
  console.log({
    jobsCreated: jobs.length,
    elapsedMs,
    scheduledFrom:
      new Date(startTime).toISOString(),
  });

  await emailQueue.close();

  console.log(
    "All 1000 delayed jobs were accepted by BullMQ.",
  );
}

main().catch((error) => {
  console.error(
    "1000-job load test failed:",
    error,
  );

  process.exit(1);
});