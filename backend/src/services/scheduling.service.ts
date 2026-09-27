import { reserveSendSlot } from "./rate-limit.service.js";

export interface ScheduleTimeInput {
  startTime: Date;
  index: number;
  delayBetweenMs: number;
}

export function calculateScheduledTime(
  input: ScheduleTimeInput,
): Date {
  return new Date(
    input.startTime.getTime() +
      input.index * input.delayBetweenMs,
  );
}

export interface ScheduleEmailInput {
  senderId: string;
  startTime: Date;
  index: number;
  delayBetweenMs: number;
  hourlyLimit: number;
  previousScheduledAt?: Date;
}

export interface ScheduleEmailResult {
  scheduledAt: Date;
  rateLimited: boolean;
}

export async function scheduleEmail(
  input: ScheduleEmailInput,
): Promise<ScheduleEmailResult> {
  if (input.index < 0) {
    throw new Error("Email index cannot be negative.");
  }

  if (input.delayBetweenMs < 0) {
    throw new Error("Delay between emails cannot be negative.");
  }

  if (input.hourlyLimit <= 0) {
    throw new Error("Hourly limit must be greater than zero.");
  }

  const calculatedTime = calculateScheduledTime({
    startTime: input.startTime,
    index: input.index,
    delayBetweenMs: input.delayBetweenMs,
  });

  let candidateTime = calculatedTime;

  if (input.previousScheduledAt) {
    const minimumTimeAfterPrevious = new Date(
      input.previousScheduledAt.getTime() +
        input.delayBetweenMs,
    );

    if (minimumTimeAfterPrevious > candidateTime) {
      candidateTime = minimumTimeAfterPrevious;
    }
  }

  return reserveSendSlot({
    senderId: input.senderId,
    candidateTime,
    hourlyLimit: input.hourlyLimit,
  });
}