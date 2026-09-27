import "dotenv/config";
import { redisConnection } from "../config/redis.js";
import { reserveSendSlot } from "../services/rate-limit.service.js";

async function main() {
  const senderId = `rate-limit-test-${Date.now()}`;

  const hourlyLimit = 2;

  const candidateTime = new Date();

  console.log("Rate-limit test started.");
  console.log({
    senderId,
    hourlyLimit,
    candidateTime: candidateTime.toISOString(),
  });

  for (let index = 1; index <= 5; index++) {
    const result = await reserveSendSlot({
      senderId,
      candidateTime,
      hourlyLimit,
    });

    console.log(`Reservation ${index}:`);
    console.log({
      scheduledAt: result.scheduledAt.toISOString(),
      rateLimited: result.rateLimited,
    });
  }

  await redisConnection.quit();

  console.log("Rate-limit test completed.");
}

main().catch(async (error) => {
  console.error("Rate-limit test failed:", error);

  await redisConnection.quit();

  process.exit(1);
});