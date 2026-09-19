import { NextFunction, Request, Response } from 'express';
import { hitRateLimit } from '../auth.rate-limit.service';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// Looser than auth.login-rate-limit.middleware.ts's 5/15min (no password to
// guess here — this only guards the unauthenticated login-start entry point
// against being hammered), reusing the same Redis/in-memory building block.
export const telegramLoginRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const result = await hitRateLimit({
        key: `rate-limit:telegram-login:${req.ip}`,
        windowMs: WINDOW_MS,
        maxAttempts: MAX_ATTEMPTS,
    });

    if (result.limited) {
        res.setHeader('Retry-After', result.retryAfterSeconds);
        res.status(429).json({ message: 'Слишком много попыток входа через Telegram. Попробуйте позже.' });
        return;
    }

    next();
};
