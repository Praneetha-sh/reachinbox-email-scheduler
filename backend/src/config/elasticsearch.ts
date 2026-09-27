import { Client } from "@elastic/elasticsearch";

const elasticsearchNode =
  process.env.ELASTICSEARCH_URL ??
  "http://localhost:9200";

export const elasticsearchClient = new Client({
  node: elasticsearchNode,
});

export const EMAIL_INDEX =
  "reachinbox-emails";