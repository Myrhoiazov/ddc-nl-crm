import crypto from 'crypto';

// Чистые правила билетов: из токена наружу не уходит ничего, кроме непрозрачного значения.
// В БД хранятся только хеш, короткий код, nonce и версия ключа.

export interface TicketTokenSource {
    id: number;
    nonce: string;
    version: number;
}

// 128 бит энтропии: токен неподделен даже при известном номере позиции заказа.
export const newTicketNonce = (): string => crypto.randomBytes(16).toString('hex');

const signatureOf = (secret: string, payload: string): string => (
    crypto.createHmac('sha256', secret).update(payload).digest('base64url')
);

export const buildTicketToken = (secret: string, source: TicketTokenSource): string => (
    `v${source.version}.${signatureOf(secret, `${source.id}:${source.nonce}`)}`
);

export const hashTicketToken = (token: string): string => (
    crypto.createHash('sha256').update(token).digest('hex')
);

// Короткий код для ручного ввода: выводится из хеша токена, а не из PII или номера заказа.
export const shortCodeFromToken = (token: string): string => (
    crypto.createHash('sha256').update(`short:${token}`).digest('hex').slice(0, 8).toUpperCase()
);

export interface StoredTicketToken extends TicketTokenSource {
    codeHash: string;
}

// Токен не хранится: выводим его из nonce и текущего секрета, но отдаём только если
// получился тот же хеш. После ротации секрета или при повреждении строки билет недоступен.
export const restoreTicketToken = (secret: string, stored: StoredTicketToken): string | null => {
    const token = buildTicketToken(secret, stored);
    return hashTicketToken(token) === stored.codeHash ? token : null;
};
