import "dotenv/config";
import { prisma } from "../config/prisma.js";

async function main() {
  console.log("Worker idempotency test started.");

  const email = await prisma.email.findFirst({
    where: {
      status: "SENT",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      recipientEmail: true,
      status: true,
      attempts: true,
      bullmqJobId: true,
    },
  });

  if (!email) {
    console.log(
      "No SENT email was found for the test.",
    );

    await prisma.$disconnect();
    return;
  }

  console.log("Found existing SENT email:");
  console.log(email);

  /*
   * A SENT email must never go back to PROCESSING.
   *
   * This simulates a duplicate worker attempt.
   */
  const claimResult = await prisma.email.updateMany({
    where: {
      id: email.id,
      status: "QUEUED",
    },
    data: {
      status: "PROCESSING",
      attempts: {
        increment: 1,
      },
    },
  });

  console.log("Duplicate worker claim result:");
  console.log({
    rowsUpdated: claimResult.count,
  });

  const finalEmail = await prisma.email.findUnique({
    where: {
      id: email.id,
    },
    select: {
      id: true,
      recipientEmail: true,
      status: true,
      attempts: true,
      bullmqJobId: true,
    },
  });

  console.log("Final email state:");
  console.log(finalEmail);

  if (
    claimResult.count === 0 &&
    finalEmail?.status === "SENT"
  ) {
    console.log(
      "PASS: A SENT email cannot be claimed again.",
    );
  } else {
    console.error(
      "FAIL: The SENT email was incorrectly claimable.",
    );

    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(
    "Worker idempotency test failed:",
    error,
  );

  await prisma.$disconnect();
  process.exit(1);
});