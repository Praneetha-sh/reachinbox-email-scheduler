import "dotenv/config";

const clientId = process.env.SLACK_CLIENT_ID;
const clientSecret = process.env.SLACK_CLIENT_SECRET;
const redirectUri = process.env.SLACK_REDIRECT_URI;

if (!clientId) {
  throw new Error(
    "SLACK_CLIENT_ID is missing from backend/.env",
  );
}

if (!clientSecret) {
  throw new Error(
    "SLACK_CLIENT_SECRET is missing from backend/.env",
  );
}

if (!redirectUri) {
  throw new Error(
    "SLACK_REDIRECT_URI is missing from backend/.env",
  );
}

export const SLACK_CLIENT_ID = clientId;
export const SLACK_CLIENT_SECRET = clientSecret;
export const SLACK_REDIRECT_URI = redirectUri;

export const SLACK_SCOPES = [
  "chat:write",
  "incoming-webhook",
];