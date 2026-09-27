import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { prisma } from "../config/prisma.js";

export async function getSenders(
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

    const senders = await prisma.sender.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.status(200).json({
      status: "ok",
      senders,
    });
  } catch (error) {
    console.error(
      "Failed to fetch senders:",
      error,
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch senders.",
    });
  }
}