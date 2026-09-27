import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createSlackOAuthState,
  exchangeSlackCode,
  getSlackAuthorizationUrl,
  saveSlackConnection,
  verifySlackOAuthState,
} from "../services/slack.service.js";

export function startSlackOAuth(
  req: AuthenticatedRequest,
  res: Response,
): void {
  if (!req.user) {
    res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
    return;
  }

  const state = createSlackOAuthState(
    req.user.id,
  );

  const authorizationUrl =
    getSlackAuthorizationUrl(state);

  res.redirect(authorizationUrl);
}

export async function handleSlackCallback(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const code =
      typeof req.query.code === "string"
        ? req.query.code
        : null;

    const state =
      typeof req.query.state === "string"
        ? req.query.state
        : null;

    if (!code) {
      res.status(400).json({
        status: "error",
        message: "Slack authorization code is missing.",
      });
      return;
    }

    if (!state) {
      res.status(400).json({
        status: "error",
        message: "Slack OAuth state is missing.",
      });
      return;
    }

    const userId =
      verifySlackOAuthState(state);

    const oauthResponse =
      await exchangeSlackCode(code);

    await saveSlackConnection(
      userId,
      oauthResponse,
    );

    res.status(200).json({
      status: "ok",
      message:
        "Slack connected successfully.",
    });
  } catch (error) {
    console.error(
      "Slack OAuth failed:",
      error,
    );

    res.status(500).json({
      status: "error",
      message: "Slack connection failed.",
    });
  }
}