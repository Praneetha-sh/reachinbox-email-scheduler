import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { searchEmails } from "../services/elasticsearch.service.js";

export async function searchEmailRecords(
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

    const query =
      typeof req.query.q === "string"
        ? req.query.q
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : undefined;

    const results = await searchEmails(
      query,
      req.user.id,
      status,
    );

    const emails = results.map((result) => ({
      id: result._id,
      ...(result._source ?? {}),
    }));

    res.status(200).json({
      status: "ok",
      count: emails.length,
      data: emails,
    });
  } catch (error) {
    console.error(
      "Email search failed:",
      error,
    );

    res.status(500).json({
      status: "error",
      message: "Email search failed.",
    });
  }
}