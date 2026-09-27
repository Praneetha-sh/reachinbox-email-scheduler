import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  AUTH_COOKIE_NAME,
  JWT_SECRET,
} from "../config/auth.js";
import { prisma } from "../config/prisma.js";

interface AuthTokenPayload {
  userId: string;
}

export interface AuthenticatedRequest
  extends Request {
  user?: {
    id: string;
    googleId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token =
      req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      res.status(401).json({
        status: "error",
        message: "Authentication required.",
      });
      return;
    }

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET,
      ) as AuthTokenPayload;

    if (!decoded.userId) {
      res.status(401).json({
        status: "error",
        message:
          "Invalid authentication token.",
      });
      return;
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
      });

    if (!user) {
      res.status(401).json({
        status: "error",
        message:
          "Authenticated user was not found.",
      });
      return;
    }

    req.user = {
      id: user.id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    next();
  } catch (error) {
    console.error(
      "Authentication middleware failed:",
      error,
    );

    res.status(401).json({
      status: "error",
      message:
        "Invalid or expired authentication session.",
    });
  }
}