import jwt from "jsonwebtoken";
import {
  JWT_SECRET,
} from "../config/auth.js";

export interface AuthTokenPayload {
  userId: string;
}

export function createAuthToken(
  userId: string,
): string {
  const payload: AuthTokenPayload = {
    userId,
  };

  return jwt.sign(
    payload,
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
}