import "dotenv/config";
import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!clientId) {
  throw new Error(
    "GOOGLE_CLIENT_ID is missing from backend/.env",
  );
}

if (!clientSecret) {
  throw new Error(
    "GOOGLE_CLIENT_SECRET is missing from backend/.env",
  );
}

if (!redirectUri) {
  throw new Error(
    "GOOGLE_REDIRECT_URI is missing from backend/.env",
  );
}

export const googleOAuthClient =
  new OAuth2Client(
    clientId,
    clientSecret,
    redirectUri,
  );