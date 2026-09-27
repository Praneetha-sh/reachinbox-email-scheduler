import "dotenv/config";
import { redisConnection } from "../config/redis.js";
import { scheduleEmail } from "../services/scheduling.service.js";

async function main() {
  const senderId = `combined-scheduling-test-${Date.now()}`;

  const startTime = new Date();
  const delayBetweenMs = 5_000;
  const hourlyLimit = 2;

  let previousScheduledAt: Date | undefined;

  console.log("Combined scheduling test started.");

  console.log({
    senderId,
    startTime: startTime.toISOString(),
    delayBetweenMs,
    hourlyLimit,
  });

  for (let index = 0; index < 5; index++) {
    const result = await scheduleEmail({
      senderId,
      startTime,
      index,
      delayBetweenMs,
      hourlyLimit,
      previousScheduledAt,
    });

    previousScheduledAt = result.scheduledAt;

    console.log(`Email ${index + 1}:`);
    console.log({
      scheduledAt: result.scheduledAt.toISOString(),
      rateLimited: result.rateLimited,
    });
  }

  await redisConnection.quit();

  console.log("Combined scheduling test completed.");
}

main().catch(async (error) => {
  console.error("Combined scheduling test failed:", error);

  await redisConnection.quit();

  process.exit(1);
});