import { Router } from "express";
import {
  handleSlackCallback,
  startSlackOAuth,
} from "../controllers/slack.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/slack",
  requireAuth,
  startSlackOAuth,
);

router.get(
  "/slack/callback",
  handleSlackCallback,
);

export default router;