import { Router } from "express";
import {
  scheduleEmails,
} from "../controllers/email.controller.js";
import {
  getEmails,
} from "../controllers/email-list.controller.js";
import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/schedule",
  requireAuth,
  scheduleEmails,
);

router.get(
  "/",
  requireAuth,
  getEmails,
);

export default router;