import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { prisma } from "../config/prisma.js";

export async function getEmails(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        status: "error",
        message: "Authentication required.",
      });
      return;
    }

    const status =
      typeof req.query.status === "string"
        ? req.query.status.toLowerCase()
        : "scheduled";

    let statuses: (
      | "SCHEDULED"
      | "QUEUED"
      | "PROCESSING"
      | "RATE_LIMITED"
      | "SENT"
      | "FAILED"
    )[];

    if (status === "scheduled") {
      statuses = [
        "SCHEDULED",
        "QUEUED",
        "RATE_LIMITED",
        "PROCESSING",
      ];
    } else if (status === "sent") {
      statuses = ["SENT", "FAILED"];
    } else {
      res.status(400).json({
        status: "error",
        message:
          "Status must be either scheduled or sent.",
      });
      return;
    }

    const emails = await prisma.email.findMany({
      where: {
        sender: {
          userId: req.user.id,
        },
        status: {
          in: statuses,
        },
      },
      select: {
        id: true,
        recipientName: true,
        recipientEmail: true,
        subject: true,
        body: true,
        scheduledAt: true,
        sentAt: true,
        status: true,
      },
      orderBy:
        status === "scheduled"
          ? {
              scheduledAt: "asc",
            }
          : {
              sentAt: "desc",
            },
    });

    res.status(200).json({
      status: "ok",
      emails,
    });
  } catch (error) {
    console.error(
      "Failed to fetch emails:",
      error,
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch emails.",
    });
  }
}