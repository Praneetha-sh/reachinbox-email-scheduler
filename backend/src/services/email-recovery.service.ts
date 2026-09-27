import "dotenv/config";
import { prisma } from "../config/prisma.js";

const STALE_PROCESSING_TIMEOUT_MS =
  Number(
    process.env.STALE_PROCESSING_TIMEOUT_MS ??
      15 * 60 * 1000,
  );

export interface RecoveryResult {
  recoveredCount: number;
  emailIds: string[];
}

export async function recoverStaleProcessingEmails(): Promise<RecoveryResult> {
  const staleBefore = new Date(
    Date.now() - STALE_PROCESSING_TIMEOUT_MS,
  );

  const staleEmails = await prisma.email.findMany({
    where: {
      status: "PROCESSING",
      processingStartedAt: {
        not: null,
        lt: staleBefore,
      },
    },
    select: {
      id: true,
      processingStartedAt: true,
    },
  });

  if (staleEmails.length === 0) {
    return {
      recoveredCount: 0,
      emailIds: [],
    };
  }

  const recoveredEmailIds: string[] = [];

  for (const email of staleEmails) {
    const result = await prisma.email.updateMany({
      where: {
        id: email.id,
        status: "PROCESSING",
      },
      data: {
        status: "FAILED",
        lastError:
          "Email processing became stale after the worker stopped. " +
          "Automatic resend was intentionally avoided to prevent " +
          "possible duplicate delivery.",
        nextRetryAt: null,
      },
    });

    if (result.count === 0) {
      continue;
    }

    await prisma.emailEvent.create({
      data: {
        emailId: email.id,
        type: "FAILED",
        message:
          "Stale PROCESSING email detected during recovery. " +
          "Automatic resend was not performed because SMTP delivery " +
          "status cannot be determined safely after a worker crash.",
      },
    });

    recoveredEmailIds.push(email.id);
  }

  return {
    recoveredCount: recoveredEmailIds.length,
    emailIds: recoveredEmailIds,
  };
}