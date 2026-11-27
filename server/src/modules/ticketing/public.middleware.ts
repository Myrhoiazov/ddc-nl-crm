import type { NextFunction, Request, Response } from 'express';
import { hitRateLimit } from '../auth/auth.rate-limit.service';
import { isPublicSalesReady, readTicketingConfig } from './ticketing.config';

// Публичные маршруты закрыты целиком, пока продажа не включена и не задан секрет токенов.
export const requirePublicSales = (_req: Request, res: Response, next: NextFunction) => {
    if (!isPublicSalesReady(readTicketingConfig())) {
        res.status(503).json({ message: 'Ticket sales are not available' });
        return;
    }
    next();
};

const WINDOW_MS = 60 * 1000;

// Лимит по IP: у покупателя нет учётной записи. Имя разделяет счётчики разных действий.
export const ticketingRateLimit = (name: string, maxAttempts: number) => (
    async (req: Request, res: Response, next: NextFunction) => {
        const result = await hitRateLimit({ key: `rate-limit:ticketing:${name}:${req.ip}`, windowMs: WINDOW_MS, maxAttempts });
        if (result.limited) {
            res.setHeader('Retry-After', result.retryAfterSeconds);
            res.status(429).json({ message: 'Too many requests' });
            return;
        }
        next();
    }
);
