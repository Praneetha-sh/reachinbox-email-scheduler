import "dotenv/config";
import jwt from "jsonwebtoken";
import {
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  SLACK_REDIRECT_URI,
  SLACK_SCOPES,
} from "../config/slack.js";
import { JWT_SECRET } from "../config/auth.js";
import { prisma } from "../config/prisma.js";

interface SlackStatePayload {
  userId: string;
  purpose: "slack-oauth";
}

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  authed_user?: {
    id?: string;
  };
  team?: {
    id?: string;
    name?: string;
  };
  incoming_webhook?: {
    url?: string;
    channel?: string;
    channel_id?: string;
  };
  error?: string;
}

export function createSlackOAuthState(
  userId: string,
): string {
  const payload: SlackStatePayload = {
    userId,
    purpose: "slack-oauth",
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "10m",
  });
}

export function verifySlackOAuthState(
  state: string,
): string {
  const decoded = jwt.verify(
    state,
    JWT_SECRET,
  ) as SlackStatePayload;

  if (
    decoded.purpose !== "slack-oauth" ||
    !decoded.userId
  ) {
    throw new Error("Invalid Slack OAuth state.");
  }

  return decoded.userId;
}

export function getSlackAuthorizationUrl(
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: SLACK_SCOPES.join(","),
    redirect_uri: SLACK_REDIRECT_URI,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(
  code: string,
): Promise<SlackOAuthResponse> {
  const body = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    client_secret: SLACK_CLIENT_SECRET,
    code,
    redirect_uri: SLACK_REDIRECT_URI,
  });

  const response = await fetch(
    "https://slack.com/api/oauth.v2.access",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const result =
    (await response.json()) as SlackOAuthResponse;

  if (!response.ok || !result.ok) {
    throw new Error(
      result.error ??
        "Slack OAuth code exchange failed.",
    );
  }

  return result;
}

export async function saveSlackConnection(
  userId: string,
  oauthResponse: SlackOAuthResponse,
): Promise<void> {
  const accessToken =
    oauthResponse.access_token;

  const webhookUrl =
    oauthResponse.incoming_webhook?.url;

  if (!accessToken) {
    throw new Error(
      "Slack OAuth response did not contain an access token.",
    );
  }

  if (!webhookUrl) {
    throw new Error(
      "Slack OAuth response did not contain an incoming webhook URL.",
    );
  }

  await prisma.slackConnection.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      slackUserId:
        oauthResponse.authed_user?.id ??
        null,
      teamId:
        oauthResponse.team?.id ?? null,
      teamName:
        oauthResponse.team?.name ?? null,
      accessTokenEncrypted: accessToken,
      webhookUrl,
      isActive: true,
    },
    update: {
      slackUserId:
        oauthResponse.authed_user?.id ??
        null,
      teamId:
        oauthResponse.team?.id ?? null,
      teamName:
        oauthResponse.team?.name ?? null,
      accessTokenEncrypted: accessToken,
      webhookUrl,
      isActive: true,
    },
  });
}