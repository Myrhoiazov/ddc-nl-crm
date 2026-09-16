import express from 'express';
import { asyncHandler } from '../auth/auth.middleware';
import { telegramApprovalWebhookController } from './telegram-approval.controller';

const router = express.Router();

router.post('/webhook', asyncHandler(telegramApprovalWebhookController));

export default router;
