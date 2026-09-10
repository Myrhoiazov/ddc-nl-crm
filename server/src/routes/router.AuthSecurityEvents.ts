import express from 'express';
import { UserRole } from '@prisma/client';
import { getAuthSecurityEventsController } from '../controllers/controller.AuthSecurityEvents';
import { asyncHandler, isToken, requireRole } from '../middlewares/middleware.Auth';

const router = express.Router();

router.get('/', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(getAuthSecurityEventsController));

export default router;
