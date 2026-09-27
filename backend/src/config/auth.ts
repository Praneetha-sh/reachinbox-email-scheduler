import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error(
    "JWT_SECRET is missing from backend/.env",
  );
}

export const JWT_SECRET = jwtSecret;

export const AUTH_COOKIE_NAME =
  "reachinbox_session";