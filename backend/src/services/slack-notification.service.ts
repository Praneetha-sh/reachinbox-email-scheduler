import { prisma } from "../config/prisma.js";
import { redisConnection } from "../config/redis.js";

export async function notifyRateLimitReached(
  senderId: string,
  hourStart: Date,
): Promise<void> {
  const sender = await prisma.sender.findUnique({
    where: {
      id: senderId,
    },
    select: {
      userId: true,
    },
  });

  if (!sender) {
    return;
  }

  const slackConnection =
    await prisma.slackConnection.findUnique({
      where: {
        userId: sender.userId,
      },
      select: {
        webhookUrl: true,
        isActive: true,
      },
    });

  if (
    !slackConnection ||
    !slackConnection.isActive
  ) {
    return;
  }

  const hourKey = hourStart
    .toISOString()
    .replace(/[-:.TZ]/g, "");

  const notificationKey =
    `slack-rate-limit:${senderId}:${hourKey}`;

  const reserved =
    await redisConnection.set(
      notificationKey,
      "1",
      "EX",
      3600,
      "NX",
    );

  if (reserved !== "OK") {
    return;
  }

  try {
    const response = await fetch(
      slackConnection.webhookUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text:
            `ReachInbox rate limit reached for sender ` +
            `${senderId}. Emails have been rescheduled ` +
            `to the next available hour.`,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Slack webhook returned HTTP ${response.status}.`,
      );
    }

    console.log(
      "Slack rate-limit notification sent.",
      {
        senderId,
        hourStart: hourStart.toISOString(),
      },
    );
  } catch (error) {
    await redisConnection.del(notificationKey);

    console.error(
      "Failed to send Slack rate-limit notification:",
      error,
    );
  }
}