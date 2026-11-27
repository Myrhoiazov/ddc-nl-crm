import express from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../auth/auth.middleware';
import {
    cloneSeatMapController,
    createSeatMapController,
    createVenueController,
    getSeatMapController,
    listVenuesController,
    publishSeatMapController,
    updateSeatsController,
} from './venue.controller';
import {
    changeSessionStatusController,
    createEventController,
    createSessionController,
    getSessionController,
    listEventsController,
    publishSessionController,
} from './event.controller';
import { mollieWebhookController } from './payment.controller';
import publicRouter from './public.routes';

// Административный API Ticketing: сессия + CSRF (общая middleware) + явная роль на каждом маршруте.
const router = express.Router();
const staff = [asyncHandler(isToken), requireRole(UserRole.ADMIN, UserRole.MANAGER)];

router.get('/admin/venues', ...staff, asyncHandler(listVenuesController));
router.post('/admin/venues', ...staff, asyncHandler(createVenueController));
router.post('/admin/venues/:venueId/seat-maps', ...staff, asyncHandler(createSeatMapController));
router.get('/admin/seat-maps/:seatMapId', ...staff, asyncHandler(getSeatMapController));
router.post('/admin/seat-maps/:seatMapId/publish', ...staff, asyncHandler(publishSeatMapController));
router.post('/admin/seat-maps/:seatMapId/seats', ...staff, asyncHandler(updateSeatsController));
router.post('/admin/seat-maps/:seatMapId/clone', ...staff, asyncHandler(cloneSeatMapController));

router.get('/admin/events', ...staff, asyncHandler(listEventsController));
router.post('/admin/events', ...staff, asyncHandler(createEventController));
router.post('/admin/events/:eventId/sessions', ...staff, asyncHandler(createSessionController));
router.get('/admin/sessions/:sessionId', ...staff, asyncHandler(getSessionController));
router.post('/admin/sessions/:sessionId/publish', ...staff, asyncHandler(publishSessionController));
router.post('/admin/sessions/:sessionId/status', ...staff, asyncHandler(changeSessionStatusController));

// Публичный API витрины — без роли персонала, см. public.routes.ts.
router.use('/public', publicRouter);
router.post('/webhooks/mollie', asyncHandler(mollieWebhookController));

export default router;
