import crypto from "node:crypto";
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { prisma } from "../config/prisma.js";
import { emailQueue } from "../queues/email.queue.js";
import { scheduleEmail } from "../services/scheduling.service.js";
import {
  getIdempotencyRecord,
  reserveIdempotencyKey,
} from "../services/idempotency.service.js";
import { indexEmailById } from "../services/email-indexing.service.js";

export async function scheduleEmails(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const idempotencyKey = req.header("Idempotency-Key")?.trim();

    if (!idempotencyKey) {
      res.status(400).json({
        status: "error",
        message: "Idempotency-Key header is required.",
      });
      return;
    }

    const {
  senderId,
  subject,
  body,
  startTime,
  delayBetweenMs,
  hourlyLimit,
  recipients,
} = req.body;

if (!req.user) {
  res.status(401).json({
    status: "error",
    message: "Authentication required.",
  });
  return;
}

const userId = req.user.id;

    /*
     * Check whether this request was already completed.
     */
    const existingRequest =
      await getIdempotencyRecord(idempotencyKey);

    if (existingRequest) {
      const existingCampaign =
        await prisma.emailCampaign.findUnique({
          where: {
            id: existingRequest.campaignId,
          },
          include: {
            emails: true,
          },
        });

      if (
  existingCampaign &&
  existingCampaign.userId === req.user.id
) {
        res.status(200).json({
          status: "ok",
          message: "Existing email campaign returned.",
          data: {
            campaignId: existingCampaign.id,
            emailCount: existingCampaign.emails.length,
            emails: existingCampaign.emails.map((email) => ({
              id: email.id,
              recipientEmail: email.recipientEmail,
              scheduledAt: email.scheduledAt.toISOString(),
              jobId: email.bullmqJobId,
              rateLimited:
                email.status === "RATE_LIMITED",
            })),
          },
        });

        return;
      }
    }

    if (!senderId) {
      res.status(400).json({
        status: "error",
        message: "senderId is required.",
      });
      return;
    }

    if (!subject || typeof subject !== "string") {
      res.status(400).json({
        status: "error",
        message: "subject is required.",
      });
      return;
    }

    if (!body || typeof body !== "string") {
      res.status(400).json({
        status: "error",
        message: "body is required.",
      });
      return;
    }

    if (!startTime) {
      res.status(400).json({
        status: "error",
        message: "startTime is required.",
      });
      return;
    }

    const parsedStartTime = new Date(startTime);

    if (Number.isNaN(parsedStartTime.getTime())) {
      res.status(400).json({
        status: "error",
        message: "startTime must be a valid date.",
      });
      return;
    }

    if (
      typeof delayBetweenMs !== "number" ||
      delayBetweenMs < 0
    ) {
      res.status(400).json({
        status: "error",
        message:
          "delayBetweenMs must be a non-negative number.",
      });
      return;
    }

    if (
      typeof hourlyLimit !== "number" ||
      hourlyLimit <= 0
    ) {
      res.status(400).json({
        status: "error",
        message:
          "hourlyLimit must be greater than zero.",
      });
      return;
    }

    if (
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      res.status(400).json({
        status: "error",
        message:
          "At least one recipient is required.",
      });
      return;
    }

    for (const recipient of recipients) {
      if (
        !recipient ||
        typeof recipient.email !== "string" ||
        !recipient.email.trim()
      ) {
        res.status(400).json({
          status: "error",
          message:
            "Every recipient must contain a valid email address.",
        });
        return;
      }
    }

    /*
     * Make sure the sender belongs to the requesting user
     * and is active.
     */
    const sender = await prisma.sender.findFirst({
      where: {
        id: senderId,
        userId,
        isActive: true,
      },
    });

    if (!sender) {
      res.status(404).json({
        status: "error",
        message:
          "Active sender was not found for this user.",
      });
      return;
    }

    /*
     * Generate the actual campaign ID BEFORE reserving
     * the idempotency key.
     *
     * Redis will store this exact ID.
     */
    const campaignId = crypto.randomUUID();

    /*
     * Atomically reserve the idempotency key.
     *
     * Only one concurrent request can successfully
     * reserve the same key.
     */
    const reserved = await reserveIdempotencyKey(
      idempotencyKey,
      campaignId,
    );

    if (!reserved) {
      const existingRequest =
        await getIdempotencyRecord(idempotencyKey);

      if (!existingRequest) {
        res.status(409).json({
          status: "error",
          message:
            "Request is already being processed. Please retry shortly.",
        });
        return;
      }

      const existingCampaign =
        await prisma.emailCampaign.findUnique({
          where: {
            id: existingRequest.campaignId,
          },
          include: {
            emails: true,
          },
        });

      /*
       * Another request has reserved the key but hasn't
       * finished creating the campaign yet.
       */
      if (
  !existingCampaign ||
  existingCampaign.userId !== req.user.id
) {
        res.status(409).json({
          status: "error",
          message:
            "Request is already being processed. Please retry shortly.",
        });
        return;
      }

      /*
       * Campaign already exists, so return it instead
       * of creating duplicate emails/jobs.
       */
      res.status(200).json({
        status: "ok",
        message: "Existing email campaign returned.",
        data: {
          campaignId: existingCampaign.id,
          emailCount: existingCampaign.emails.length,
          emails: existingCampaign.emails.map((email) => ({
            id: email.id,
            recipientEmail: email.recipientEmail,
            scheduledAt:
              email.scheduledAt.toISOString(),
            jobId: email.bullmqJobId,
            rateLimited:
              email.status === "RATE_LIMITED",
          })),
        },
      });

      return;
    }

    /*
     * Create the campaign using the SAME campaign ID
     * stored in Redis.
     */
    const campaign =
      await prisma.emailCampaign.create({
        data: {
          id: campaignId,
          userId,
          senderId,
          name: `Campaign ${new Date().toISOString()}`,
          subject,
          body,
          startTime: parsedStartTime,
          delayBetweenMs,
          hourlyLimit,
        },
      });

    const createdEmails = [];

    let previousScheduledAt: Date | undefined;

    /*
     * Schedule each recipient.
     */
    for (
      let index = 0;
      index < recipients.length;
      index++
    ) {
      const recipient = recipients[index];

      const scheduleResult =
        await scheduleEmail({
          senderId,
          startTime: parsedStartTime,
          index,
          delayBetweenMs,
          hourlyLimit,
          previousScheduledAt,
        });

      previousScheduledAt =
        scheduleResult.scheduledAt;

      /*
       * Create the email record first.
       */
      const email = await prisma.email.create({
  data: {
    campaignId: campaign.id,
    senderId,
    recipientName:
      typeof recipient.name === "string"
        ? recipient.name
        : null,
    recipientEmail:
      recipient.email.trim(),
    subject,
    body,
    scheduledAt:
      scheduleResult.scheduledAt,
    status: "SCHEDULED",
    idempotencyKey:
      `${campaign.id}-${index}-${recipient.email.trim()}`,
  },
});

await prisma.email.update({
  where: {
    id: email.id,
  },
  data: {
    status: "QUEUED",
  },
});

const delay = Math.max(
  0,
  scheduleResult.scheduledAt.getTime() -
    Date.now(),
);

const job = await emailQueue.add(
  "send-email",
  {
  emailId: email.id,
  senderId: email.senderId,
  recipientEmail:
    email.recipientEmail,
  subject: email.subject,
  body: email.body,
},
  {
    delay,
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

      /*
       * Record the queue event.
       */
      await prisma.emailEvent.create({
        data: {
          emailId: email.id,
          type: "QUEUED",
          message:
            `BullMQ job ${job.id} scheduled for ` +
            `${scheduleResult.scheduledAt.toISOString()}.`,
        },
      });

      await indexEmailById(email.id);
      
      createdEmails.push({
        id: email.id,
        recipientEmail:
          email.recipientEmail,
        scheduledAt:
          scheduleResult.scheduledAt.toISOString(),
        jobId: String(job.id),
        rateLimited:
          scheduleResult.rateLimited,
      });
    }

    /*
     * Return the newly created campaign.
     */
    res.status(201).json({
      status: "ok",
      message:
        "Email campaign scheduled successfully.",
      data: {
        campaignId: campaign.id,
        emailCount: createdEmails.length,
        emails: createdEmails,
      },
    });
  } catch (error) {
    console.error(
      "Schedule email API failed:",
      error,
    );

    res.status(500).json({
      status: "error",
      message:
        "Failed to schedule email campaign.",
    });
  }
}