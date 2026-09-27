import { Request, Response } from "express";
import { googleOAuthClient } from "../config/google-auth.js";
import { prisma } from "../config/prisma.js";
import {
  AUTH_COOKIE_NAME,
} from "../config/auth.js";
import {
  createAuthToken,
} from "../services/auth.service.js";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
];

export function startGoogleAuth(
  _req: Request,
  res: Response,
): void {
  const authorizationUrl =
    googleOAuthClient.generateAuthUrl({
      access_type: "offline",
      scope: GOOGLE_SCOPES,
      prompt: "consent",
    });

  res.redirect(authorizationUrl);
}

export async function handleGoogleCallback(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const code =
      typeof req.query.code === "string"
        ? req.query.code
        : null;

    if (!code) {
      res.status(400).json({
        status: "error",
        message:
          "Google authorization code is missing.",
      });
      return;
    }

    const { tokens } =
      await googleOAuthClient.getToken(code);

    if (!tokens.id_token) {
      res.status(401).json({
        status: "error",
        message:
          "Google did not return an ID token.",
      });
      return;
    }

    const ticket =
      await googleOAuthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience:
          process.env.GOOGLE_CLIENT_ID,
      });

    const payload =
      ticket.getPayload();

    if (!payload) {
      res.status(401).json({
        status: "error",
        message:
          "Google user information was unavailable.",
      });
      return;
    }

    if (!payload.sub) {
  res.status(401).json({
    status: "error",
    message:
      "Google account ID was not provided.",
  });
  return;
}

if (!payload.email) {
  res.status(401).json({
    status: "error",
    message:
      "Google account email was not provided.",
  });
  return;
}

if (payload.email_verified !== true) {
  res.status(401).json({
    status: "error",
    message:
      "Google account email is not verified.",
  });
  return;
}

const user = await prisma.user.upsert({
  where: {
    googleId: payload.sub,
  },
  create: {
    googleId: payload.sub,
    email: payload.email,
    name:
      payload.name ??
      payload.email,
    avatarUrl:
      payload.picture ?? null,
  },
  update: {
    email: payload.email,
    name:
      payload.name ??
      payload.email,
    avatarUrl:
      payload.picture ?? null,
  },
});

console.log(
  "Google user saved successfully:",
  {
    userId: user.id,
    email: user.email,
  },
);

const authToken =
  createAuthToken(user.id);

res.cookie(
  AUTH_COOKIE_NAME,
  authToken,
  {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge:
      7 * 24 * 60 * 60 * 1000,
  },
);

res.redirect("http://localhost:5173/dashboard");
  } catch (error) {
    console.error(
      "Google authentication failed:",
      error,
    );

    res.status(500).json({
      status: "error",
      message:
        "Google authentication failed.",
    });
  }
}

export async function getCurrentUser(
  req: Request,
  res: Response,
): Promise<void> {
  const authenticatedRequest =
    req as Request & {
      user?: {
        id: string;
        googleId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
      };
    };

  if (!authenticatedRequest.user) {
    res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
    return;
  }

  res.status(200).json({
    status: "ok",
    user: authenticatedRequest.user,
  });
}

export function logout(
  _req: Request,
  res: Response,
): void {
  res.clearCookie(
    AUTH_COOKIE_NAME,
    {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  );

  res.status(200).json({
    status: "ok",
    message: "Logged out successfully.",
  });
}