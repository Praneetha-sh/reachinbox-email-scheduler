import { Router } from "express";
import { getSenders } from "../controllers/sender.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  getSenders,
);

export default router;