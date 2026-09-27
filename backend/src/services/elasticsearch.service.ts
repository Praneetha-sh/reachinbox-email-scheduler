import {
  estypes,
} from "@elastic/elasticsearch";
import {
  elasticsearchClient,
  EMAIL_INDEX,
} from "../config/elasticsearch.js";

export interface EmailSearchDocument {
  emailId: string;
  userId: string;
  campaignId: string;
  senderId: string;

  recipientName: string | null;
  recipientEmail: string;

  subject: string;
  body: string;

  status: string;

  scheduledAt: string;
  sentAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export async function ensureEmailIndex(): Promise<void> {
  const existsResponse =
    await elasticsearchClient.indices.exists({
      index: EMAIL_INDEX,
    });

  if (existsResponse) {
    console.log(
      `Elasticsearch index "${EMAIL_INDEX}" already exists.`,
    );
    return;
  }

  await elasticsearchClient.indices.create({
    index: EMAIL_INDEX,
    mappings: {
      properties: {
        emailId: {
          type: "keyword",
        },

        userId: {
          type: "keyword",
        },

        campaignId: {
          type: "keyword",
        },

        senderId: {
          type: "keyword",
        },

        recipientName: {
          type: "text",
        },

        recipientEmail: {
          type: "keyword",
        },

        subject: {
          type: "text",
        },

        body: {
          type: "text",
        },

        status: {
          type: "keyword",
        },

        scheduledAt: {
          type: "date",
        },

        sentAt: {
          type: "date",
        },

        createdAt: {
          type: "date",
        },

        updatedAt: {
          type: "date",
        },
      },
    },
  });

  console.log(
    `Elasticsearch index "${EMAIL_INDEX}" created.`,
  );
}

export async function indexEmail(
  document: EmailSearchDocument,
): Promise<void> {
  await elasticsearchClient.index({
    index: EMAIL_INDEX,
    id: document.emailId,
    document,
    refresh: "wait_for",
  });
}

export async function updateIndexedEmail(
  emailId: string,
  document: Partial<EmailSearchDocument>,
): Promise<void> {
  await elasticsearchClient.update({
    index: EMAIL_INDEX,
    id: emailId,
    doc: document,
    refresh: "wait_for",
  });
}

export async function searchEmails(
  query: string,
  userId: string,
  status?: string,
): Promise<
  estypes.SearchHit<EmailSearchDocument>[]
> {
  const must: estypes.QueryDslQueryContainer[] = [];

  if (query.trim()) {
    must.push({
      multi_match: {
        query: query.trim(),
        fields: [
          "recipientEmail",
          "recipientName",
          "subject",
          "body",
        ],
      },
    });
  } else {
    must.push({
      match_all: {},
    });
  }

  const filters: estypes.QueryDslQueryContainer[] = [
    {
      term: {
        userId,
      },
    },
  ];

  if (status) {
    filters.push({
      term: {
        status,
      },
    });
  }

  const response =
    await elasticsearchClient.search<EmailSearchDocument>({
      index: EMAIL_INDEX,
      query: {
        bool: {
          must,
          filter: filters,
        },
      },
      sort: [
        {
          scheduledAt: {
            order: "desc",
          },
        },
      ],
    });

  return response.hits.hits;
}