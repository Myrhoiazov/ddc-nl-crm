import express from "express";
import { asyncHandler } from "../middlewares/middleware.Auth";
import { instagramReceiveMessageController, instagramWebhookController } from "../controllers/controller.Instagram";

const router = express.Router();

// ------------------------
// 1) VERIFY WEBHOOK (GET)
// ------------------------
router.get("/webhook", asyncHandler(instagramWebhookController));

// ------------------------
// 2) RECEIVE MESSAGES (POST)
// ------------------------
router.post("/webhook", asyncHandler(instagramReceiveMessageController));

export default router;