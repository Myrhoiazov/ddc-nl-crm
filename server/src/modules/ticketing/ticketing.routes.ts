import express from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../auth/auth.middleware';
import {
    createSeatMapController,
    createVenueController,
    getSeatMapController,
    listVenuesController,
    publishSeatMapController,
} from './venue.controller';

// Административный API Ticketing: сессия + CSRF (общая middleware) + явная роль на каждом маршруте.
const router = express.Router();
const staff = [asyncHandler(isToken), requireRole(UserRole.ADMIN, UserRole.MANAGER)];

router.get('/admin/venues', ...staff, asyncHandler(listVenuesController));
router.post('/admin/venues', ...staff, asyncHandler(createVenueController));
router.post('/admin/venues/:venueId/seat-maps', ...staff, asyncHandler(createSeatMapController));
router.get('/admin/seat-maps/:seatMapId', ...staff, asyncHandler(getSeatMapController));
router.post('/admin/seat-maps/:seatMapId/publish', ...staff, asyncHandler(publishSeatMapController));

export default router;
