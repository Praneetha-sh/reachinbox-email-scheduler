import "dotenv/config";

import { elasticsearchClient } from "../config/elasticsearch.js";
import {
  ensureEmailIndex,
  searchEmails,
} from "../services/elasticsearch.service.js";
import { indexAllEmails } from "../services/email-indexing.service.js";
import { prisma } from "../config/prisma.js";

async function main(): Promise<void> {
  console.log("Elasticsearch data test started.");

  await ensureEmailIndex();

  const indexedCount = await indexAllEmails();

  console.log("Emails indexed:");
  console.log({
    indexedCount,
  });

  const user = await prisma.user.findUnique({
  where: {
    id: "ce57d4d4-1ed6-4aff-82ed-7f4daa0eb419",
  },
  select: {
    id: true,
    email: true,
  },
});

  if (!user) {
    throw new Error(
      "No users found in the database.",
    );
  }

  console.log("Searching emails for user:");
  console.log({
    userId: user.id,
    email: user.email,
  });

  const results = await searchEmails(
    "",
    user.id,
  );

  console.log("Search result count:");
  console.log(results.length);

  console.log("Indexed email documents:");

  for (const result of results.slice(0, 5)) {
    console.log({
      id: result._id,
      emailId: result._source?.emailId,
      userId: result._source?.userId,
      recipientEmail:
        result._source?.recipientEmail,
      subject: result._source?.subject,
      status: result._source?.status,
    });
  }

  await prisma.$disconnect();
  await elasticsearchClient.close();

  console.log(
    "Elasticsearch data test completed.",
  );
}

main().catch(async (error) => {
  console.error(
    "Elasticsearch data test failed:",
    error,
  );

  await prisma.$disconnect();
  await elasticsearchClient.close();

  process.exit(1);
});