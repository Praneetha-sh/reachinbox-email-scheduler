import { redisConnection } from "../config/redis.js";
import { notifyRateLimitReached } from "./slack-notification.service.js";

const RESERVE_SLOT_SCRIPT = `
local currentCount = redis.call("GET", KEYS[1])

if not currentCount then
  currentCount = 0
end

currentCount = tonumber(currentCount)
local limit = tonumber(ARGV[1])
local expiresInSeconds = tonumber(ARGV[2])

if currentCount < limit then
  local newCount = redis.call("INCR", KEYS[1])

  if newCount == 1 then
    redis.call("EXPIRE", KEYS[1], expiresInSeconds)
  end

  return 1
end

return 0
`;

export interface RateLimitReservation {
  scheduledAt: Date;
  rateLimited: boolean;
}

function getHourStart(date: Date): Date {
  const hourStart = new Date(date);

  hourStart.setUTCMinutes(0, 0, 0);

  return hourStart;
}

function getNextHourStart(date: Date): Date {
  const nextHour = new Date(date);

  nextHour.setUTCMinutes(0, 0, 0);
  nextHour.setUTCHours(
    nextHour.getUTCHours() + 1,
  );

  return nextHour;
}

export async function reserveSendSlot(input: {
  senderId: string;
  candidateTime: Date;
  hourlyLimit: number;
}): Promise<RateLimitReservation> {
  if (input.hourlyLimit <= 0) {
    throw new Error(
      "Hourly limit must be greater than zero.",
    );
  }

  let candidateTime = new Date(
    input.candidateTime,
  );

  let rateLimited = false;

  while (true) {
    const hourStart =
      getHourStart(candidateTime);

    const hourKey = hourStart
      .toISOString()
      .replace(/[-:.TZ]/g, "");

    const redisKey =
      `email-rate:${input.senderId}:${hourKey}`;

    const nextHourStart =
      getNextHourStart(candidateTime);

    const expiresInSeconds = Math.max(
      1,
      Math.ceil(
        (nextHourStart.getTime() -
          Date.now()) /
          1000,
      ) + 60,
    );

    const result =
      await redisConnection.eval(
        RESERVE_SLOT_SCRIPT,
        1,
        redisKey,
        input.hourlyLimit,
        expiresInSeconds,
      );

    if (Number(result) === 1) {
      return {
        scheduledAt: candidateTime,
        rateLimited,
      };
    }

    await notifyRateLimitReached(
      input.senderId,
      hourStart,
    );

    candidateTime = nextHourStart;
    rateLimited = true;
  }
}