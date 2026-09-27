import { prisma } from "../config/prisma.js";
import {
  indexEmail,
  type EmailSearchDocument,
} from "./elasticsearch.service.js";

export async function indexEmailById(
  emailId: string,
): Promise<void> {
  const email = await prisma.email.findUnique({
    where: {
      id: emailId,
    },
    include: {
      campaign: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!email) {
    throw new Error(
      `Email ${emailId} was not found.`,
    );
  }

  const document: EmailSearchDocument = {
    emailId: email.id,
    userId: email.campaign.userId,
    campaignId: email.campaignId,
    senderId: email.senderId,

    recipientName: email.recipientName,
    recipientEmail: email.recipientEmail,

    subject: email.subject,
    body: email.body,

    status: email.status,

    scheduledAt:
      email.scheduledAt.toISOString(),

    sentAt:
      email.sentAt?.toISOString() ?? null,

    createdAt:
      email.createdAt.toISOString(),

    updatedAt:
      email.updatedAt.toISOString(),
  };

  await indexEmail(document);
}

export async function indexAllEmails(): Promise<number> {
  const emails = await prisma.email.findMany({
    include: {
      campaign: {
        select: {
          userId: true,
        },
      },
    },
  });

  for (const email of emails) {
    const document: EmailSearchDocument = {
      emailId: email.id,
      userId: email.campaign.userId,
      campaignId: email.campaignId,
      senderId: email.senderId,

      recipientName: email.recipientName,
      recipientEmail: email.recipientEmail,

      subject: email.subject,
      body: email.body,

      status: email.status,

      scheduledAt:
        email.scheduledAt.toISOString(),

      sentAt:
        email.sentAt?.toISOString() ?? null,

      createdAt:
        email.createdAt.toISOString(),

      updatedAt:
        email.updatedAt.toISOString(),
    };

    await indexEmail(document);
  }

  return emails.length;
}