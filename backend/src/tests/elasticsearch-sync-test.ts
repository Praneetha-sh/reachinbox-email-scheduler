import "dotenv/config";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { emailQueue } from "../queues/email.queue.js";
import {
  elasticsearchClient,
  EMAIL_INDEX,
} from "../config/elasticsearch.js";

async function main() {
  console.log("Elasticsearch sync test started.");

  const user = await prisma.user.findUnique({
    where: {
      id: "47bcee84-fc24-42a2-9598-a4ad63244b57",
    },
  });

  const sender = await prisma.sender.findUnique({
    where: {
      id: "0a894e9d-e959-47c2-8a6e-162fe59da47c",
    },
  });

  if (!user || !sender) {
    throw new Error(
      "Existing test user or sender was not found.",
    );
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId: user.id,
      senderId: sender.id,
      name: "Elasticsearch Sync Test",
      subject: "Elasticsearch Sync Test",
      body: "Testing MySQL to Elasticsearch synchronization.",
      startTime: new Date(),
      delayBetweenMs: 0,
      hourlyLimit: 100,
    },
  });

  const email = await prisma.email.create({
    data: {
      campaignId: campaign.id,
      senderId: sender.id,
      recipientEmail: `elasticsearch-sync-${crypto.randomUUID()}@example.com`,
      subject: campaign.subject,
      body: campaign.body,
      scheduledAt: new Date(),
      status: "SCHEDULED",
      idempotencyKey: `elasticsearch-sync-${crypto.randomUUID()}`,
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

const job = await emailQueue.add(
  "send-email",
  {
    emailId: email.id,
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

  console.log("Test email queued:");
  console.log({
    emailId: email.id,
    recipientEmail: email.recipientEmail,
    jobId: String(job.id),
  });

  const maxWaitMs = 30_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const currentEmail = await prisma.email.findUnique({
      where: {
        id: email.id,
      },
      select: {
        status: true,
        sentAt: true,
      },
    });

    if (currentEmail?.status === "SENT") {
      console.log("MySQL email status is SENT.");
      break;
    }

    if (currentEmail?.status === "FAILED") {
      throw new Error(
        "Test email failed before reaching SENT state.",
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 1000),
    );
  }

  const finalEmail = await prisma.email.findUnique({
    where: {
      id: email.id,
    },
    select: {
      status: true,
      sentAt: true,
    },
  });

  if (finalEmail?.status !== "SENT") {
    throw new Error(
      "Email did not reach SENT state within 30 seconds.",
    );
  }

  await new Promise((resolve) =>
    setTimeout(resolve, 1000),
  );

  const elasticsearchResponse =
    await elasticsearchClient.get({
      index: EMAIL_INDEX,
      id: email.id,
    });

  console.log("Elasticsearch document:");
  console.log(elasticsearchResponse._source);

  const indexedStatus =
    (
      elasticsearchResponse._source as
        | { status?: string }
        | undefined
    )?.status;

  if (indexedStatus !== "SENT") {
    throw new Error(
      `Expected Elasticsearch status SENT, got ${indexedStatus}.`,
    );
  }

  console.log(
    "PASS: Elasticsearch was synchronized after the email was sent.",
  );

  await elasticsearchClient.close();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(
    "Elasticsearch sync test failed:",
    error,
  );

  await elasticsearchClient.close();
  await prisma.$disconnect();

  process.exit(1);
});