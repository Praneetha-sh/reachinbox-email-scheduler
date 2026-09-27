import "dotenv/config";
import {
  elasticsearchClient,
  EMAIL_INDEX,
} from "../config/elasticsearch.js";
import { ensureEmailIndex } from "../services/elasticsearch.service.js";

async function main() {
  console.log("Elasticsearch index test started.");

  const health = await elasticsearchClient.cluster.health();

  console.log("Elasticsearch cluster status:");
  console.log({
    status: health.status,
    clusterName: health.cluster_name,
  });

  await ensureEmailIndex();

  const exists =
    await elasticsearchClient.indices.exists({
      index: EMAIL_INDEX,
    });

  console.log("Index verification:");
  console.log({
    index: EMAIL_INDEX,
    exists: Boolean(exists),
  });

  await elasticsearchClient.close();

  console.log(
    "Elasticsearch index test completed.",
  );
}

main().catch(async (error) => {
  console.error(
    "Elasticsearch index test failed:",
    error,
  );

  await elasticsearchClient.close();

  process.exit(1);
});