import express from 'express';
import { asyncHandler } from '../auth/auth.middleware';
import {
    checkoutController,
    createHoldController,
    getOrderController,
    getOrderTicketsController,
    getOrderTicketsPdfController,
    getPublicSessionController,
    releaseHoldController,
} from './public.controller';
import { requirePublicSales, ticketingRateLimit } from './public.middleware';

// Публичный API витрины: без сессии персонала и без CSRF-токена (исключение в
// auth.csrf.middleware.ts). Защита — opaque-токены, лимиты по IP и Turnstile на checkout.
const router = express.Router();

router.use(requirePublicSales);

router.get('/sessions/:sessionId', asyncHandler(ticketingRateLimit('map', 120)), asyncHandler(getPublicSessionController));
router.post('/sessions/:sessionId/holds', asyncHandler(ticketingRateLimit('hold', 20)), asyncHandler(createHoldController));
router.post('/holds/release', asyncHandler(ticketingRateLimit('release', 30)), asyncHandler(releaseHoldController));
router.post('/orders', asyncHandler(ticketingRateLimit('checkout', 10)), asyncHandler(checkoutController));
router.get('/orders/current', asyncHandler(ticketingRateLimit('order', 60)), asyncHandler(getOrderController));
router.get('/orders/current/tickets', asyncHandler(ticketingRateLimit('tickets', 60)), asyncHandler(getOrderTicketsController));
router.get('/orders/current/tickets.pdf', asyncHandler(ticketingRateLimit('ticket-pdf', 20)), asyncHandler(getOrderTicketsPdfController));

export default router;
