import "dotenv/config";

import { redisConnection } from "../config/redis.js";
import { reserveSendSlot } from "../services/rate-limit.service.js";

async function main(): Promise<void> {
  console.log("Slack rate-limit test started.");

  const senderId =
    "6d16ad3c-2fab-4a18-a8af-0dba559a250c";

  const testHourStart = new Date();

  testHourStart.setUTCMinutes(0, 0, 0);

  const hourKey = testHourStart
    .toISOString()
    .replace(/[-:.TZ]/g, "");

  const redisKey =
    `email-rate:${senderId}:${hourKey}`;

  // Clear the test sender's rate-limit counter
  // for the current hour so this test starts clean.
  await redisConnection.del(redisKey);

  console.log("Rate-limit counter cleared.");

  const first =
    await reserveSendSlot({
      senderId,
      candidateTime: new Date(),
      hourlyLimit: 1,
    });

  console.log("First reservation:");
  console.log({
    scheduledAt:
      first.scheduledAt.toISOString(),
    rateLimited: first.rateLimited,
  });

  const second =
    await reserveSendSlot({
      senderId,
      candidateTime: new Date(),
      hourlyLimit: 1,
    });

  console.log("Second reservation:");
  console.log({
    scheduledAt:
      second.scheduledAt.toISOString(),
    rateLimited: second.rateLimited,
  });

  console.log("");
  console.log(
    "The second reservation should have triggered the Slack notification.",
  );

  await redisConnection.quit();

  console.log(
    "Slack rate-limit test completed.",
  );
}

main().catch(async (error) => {
  console.error(
    "Slack rate-limit test failed:",
    error,
  );

  await redisConnection.quit();

  process.exit(1);
});