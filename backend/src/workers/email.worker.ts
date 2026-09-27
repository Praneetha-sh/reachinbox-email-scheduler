import "dotenv/config";
import { Job, Worker } from "bullmq";
import { EMAIL_QUEUE_NAME } from "../queues/email.queue.js";
import { redisConnection } from "../config/redis.js";
import { sendEmail } from "../services/email.service.js";
import { prisma } from "../config/prisma.js";
import { indexEmailById } from "../services/email-indexing.service.js";

interface EmailJobData {
  emailId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
}

const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const processingStartedAt = new Date();

    console.log("Processing email job:");
    console.log({
      jobId: job.id,
      emailId: job.data.emailId,
      recipientEmail: job.data.recipientEmail,
      processingStartedAt:
        processingStartedAt.toISOString(),
    });

    /*
     * Atomically claim the email.
     *
     * Only an email currently in QUEUED state can
     * be changed to PROCESSING.
     *
     * This prevents multiple workers from sending
     * the same email simultaneously.
     */
    const claimResult = await prisma.email.updateMany({
      where: {
        id: job.data.emailId,
        status: "QUEUED",
      },
      data: {
  status: "PROCESSING",
  processingStartedAt: processingStartedAt,
  attempts: {
    increment: 1,
  },
},
    });

    /*
     * If no row was updated, another worker has already
     * claimed this email OR the email was already sent.
     */
    if (claimResult.count === 0) {
      const existingEmail = await prisma.email.findUnique({
        where: {
          id: job.data.emailId,
        },
        select: {
          status: true,
        },
      });

      console.log(
        "Email job skipped because the email is no longer QUEUED:",
        {
          jobId: job.id,
          emailId: job.data.emailId,
          status: existingEmail?.status ?? "NOT_FOUND",
        },
      );

      return {
        success: true,
        skipped: true,
        reason:
          existingEmail?.status ??
          "EMAIL_NOT_FOUND",
      };
    }

    /*
     * Record that processing started.
     */
    await prisma.emailEvent.create({
      data: {
        emailId: job.data.emailId,
        type: "PROCESSING",
        message:
          `Email processing started by BullMQ job ${job.id}.`,
      },
    });

    try {
      const result = await sendEmail({
  senderId: job.data.senderId,
  recipientEmail: job.data.recipientEmail,
  subject: job.data.subject,
  body: job.data.body,
});

      /*
       * SMTP succeeded.
       *
       * Now mark the email as SENT.
       */
      await prisma.email.update({
        where: {
          id: job.data.emailId,
        },
        data: {
  status: "SENT",
  sentAt: new Date(),
  processingStartedAt: null,
  bullmqJobId: String(job.id),
  lastError: null,
},
      });

      await prisma.emailEvent.create({
        data: {
          emailId: job.data.emailId,
          type: "SENT",
          message:
            `Email sent successfully. Message ID: ${result.messageId}`,
        },
      });

      await indexEmailById(job.data.emailId);

      const processingFinishedAt =
        new Date();

      console.log("Email sent successfully:");
      console.log({
        messageId: result.messageId,
        previewUrl: result.previewUrl,
        processingFinishedAt:
          processingFinishedAt.toISOString(),
      });

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
        processedAt:
          processingFinishedAt.toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown email error";

      await prisma.email.update({
        where: {
          id: job.data.emailId,
        },
        data: {
          status: "FAILED",
          lastError: errorMessage,
          bullmqJobId: String(job.id),
        },
      });

      await prisma.emailEvent.create({
        data: {
          emailId: job.data.emailId,
          type: "FAILED",
          message: errorMessage,
        },
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: Number(
      process.env.WORKER_CONCURRENCY ?? 5,
    ),
  },
);

emailWorker.on("completed", (job) => {
  console.log(
    `Email job ${job.id} completed successfully.`,
  );
});

emailWorker.on("failed", (job, error) => {
  console.error(
    `Email job ${job?.id ?? "unknown"} failed:`,
    error.message,
  );
});

emailWorker.on("error", (error) => {
  console.error(
    "BullMQ worker error:",
    error,
  );
});

console.log("Email worker started.");