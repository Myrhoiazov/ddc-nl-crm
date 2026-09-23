import express from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../auth/auth.middleware';
import { simulateEmailAssistant } from './simulation.controller';

const router = express.Router();

router.post('/simulate', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(simulateEmailAssistant));

export default router;
