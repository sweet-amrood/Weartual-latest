import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { createRealtimeToken } from "../controllers/decart.controller.js";

const router = Router();

router.post("/realtime-token", requireAuth, createRealtimeToken);

export default router;
