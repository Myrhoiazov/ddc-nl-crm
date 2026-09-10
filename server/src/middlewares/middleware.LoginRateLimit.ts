import { NextFunction, Request, Response } from 'express';
import { AuthSecurityEventType } from '@prisma/client';
import { recordAuthSecurityEvent } from '../services/service.AuthSecurityAudit';
import { calculateProgressiveDelayMs, hitRateLimit, resetRateLimit } from '../services/service.RateLimit';
import { CAPTCHA_THRESHOLD, captchaSiteKey, isCaptchaConfigured, verifyCaptchaToken } from '../services/service.Captcha';
import { notifyLoginBlocked } from '../services/service.Telegram';

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
        const email = typeof req.body?.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : 'unknown';
        void recordAuthSecurityEvent({
            type: AuthSecurityEventType.LOGIN_BLOCKED,
            req,
            metadata: {
                email,
                retryAfterSeconds: result.retryAfterSeconds,
                count: result.count,
                store: result.store,
            },
        });
        void notifyLoginBlocked({ email, ip: req.ip, retryAfterSeconds: result.retryAfterSeconds })
            .catch((error) => console.error('Failed to send login-blocked Telegram notification:', error));
        res.setHeader('Retry-After', result.retryAfterSeconds);
        res.status(429).json({ message: 'Слишком много попыток входа. Попробуйте позже.' });
        return;
    }

    if (result.count > CAPTCHA_THRESHOLD && isCaptchaConfigured()) {
        const token = typeof req.body?.captchaToken === 'string' ? req.body.captchaToken : '';
        const valid = token ? await verifyCaptchaToken(token, req.ip) : false;
        if (!valid) {
            res.status(400).json({
                code: token ? 'CAPTCHA_INVALID' : 'CAPTCHA_REQUIRED',
                message: 'Подтвердите, что вы не робот, и попробуйте снова.',
                siteKey: captchaSiteKey(),
            });
            return;
        }
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
