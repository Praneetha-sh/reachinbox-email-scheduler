import { Router } from "express";
import { searchEmailRecords } from "../controllers/search.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/emails",
  requireAuth,
  searchEmailRecords,
);

export default router;