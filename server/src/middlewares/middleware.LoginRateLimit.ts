import { NextFunction, Request, Response } from 'express';
import { AuthSecurityEventType } from '@prisma/client';
import { recordAuthSecurityEvent } from '../services/service.AuthSecurityAudit';
import { calculateProgressiveDelayMs, hitRateLimit, resetRateLimit } from '../services/service.RateLimit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const keyFor = (req: Request) => {
    const email = typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : 'unknown';
    return `rate-limit:login:${req.ip}:${email}`;
};

export const loginRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const key = keyFor(req);
    const result = await hitRateLimit({
        key,
        windowMs: WINDOW_MS,
        maxAttempts: MAX_ATTEMPTS,
    });

    if (result.limited) {
        void recordAuthSecurityEvent({
            type: AuthSecurityEventType.LOGIN_BLOCKED,
            req,
            metadata: {
                email: typeof req.body?.email === 'string'
                    ? req.body.email.trim().toLowerCase()
                    : 'unknown',
                retryAfterSeconds: result.retryAfterSeconds,
                count: result.count,
                store: result.store,
            },
        });
        res.setHeader('Retry-After', result.retryAfterSeconds);
        res.status(429).json({ message: 'Слишком много попыток входа. Попробуйте позже.' });
        return;
    }

    res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            void resetRateLimit(key);
        }
    });

    const delayMs = calculateProgressiveDelayMs(result.count);
    if (delayMs > 0) {
        setTimeout(next, delayMs);
        return;
    }

    next();
};
