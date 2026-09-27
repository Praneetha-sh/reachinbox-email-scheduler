import "dotenv/config";
import express from "express";
import { prisma } from "./config/prisma.js";
import "./workers/email.worker.js";
import emailRoutes from "./routes/email.routes.js";
import { recoverStaleProcessingEmails } from "./services/email-recovery.service.js";
import searchRoutes from "./routes/search.routes.js";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "./queues/email.queue.js";
import authRoutes from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import slackRoutes from "./routes/slack.routes.js";
import senderRoutes from "./routes/sender.routes.js";

const app = express();
app.use(cookieParser());
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use("/api/emails", emailRoutes);
app.use("/api/senders", senderRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth", slackRoutes);
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "ReachInbox backend is running",
  });
});

app.get("/api/db-test", async (_req, res) => {
  try {
    const result = await prisma.$queryRaw<
      Array<{ result: number }>
    >`SELECT 1 AS result`;

    res.status(200).json({
      status: "ok",
      database: "connected",
      result,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
  ],
  serverAdapter,
});

app.use(
  "/admin/queues",
  serverAdapter.getRouter(),
);

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);

  try {
    const recoveryResult =
      await recoverStaleProcessingEmails();

    console.log("Startup email recovery completed:", {
      recoveredCount:
        recoveryResult.recoveredCount,
      emailIds:
        recoveryResult.emailIds,
    });
  } catch (error) {
    console.error(
      "Startup email recovery failed:",
      error,
    );
  }
});