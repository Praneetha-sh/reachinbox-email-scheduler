import { redisConnection } from "../config/redis.js";

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

export interface IdempotencyRecord {
  campaignId: string;
}

export async function getIdempotencyRecord(
  key: string,
): Promise<IdempotencyRecord | null> {
  const redisKey = `idempotency:schedule:${key}`;

  const value = await redisConnection.get(redisKey);

  if (!value) {
    return null;
  }

  return JSON.parse(value) as IdempotencyRecord;
}

export async function reserveIdempotencyKey(
  key: string,
  campaignId: string,
): Promise<boolean> {
  const redisKey = `idempotency:schedule:${key}`;

  const value = JSON.stringify({
    campaignId,
  });

  const result = await redisConnection.set(
    redisKey,
    value,
    "EX",
    IDEMPOTENCY_TTL_SECONDS,
    "NX",
  );

  return result === "OK";
}