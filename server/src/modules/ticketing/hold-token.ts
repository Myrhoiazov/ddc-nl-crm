import { createHash, createHmac, randomBytes } from 'crypto';

// В БД хранится только SHA-256 токена: утечка таблицы не даёт действующих токенов.
export const hashTicketingToken = (token: string): string => (
    createHash('sha256').update(token).digest('hex')
);

const generateOpaqueToken = (): string => randomBytes(32).toString('base64url');

// Детерминированный токен для идемпотентного повтора: тот же (сеанс, requestKey) даёт тот же
// токен, поэтому клиент, не дождавшийся ответа, получает свой hold, а не конфликт мест.
// Без секрета сервера токен из requestKey не выводится.
export const deriveHoldToken = (secret: string, sessionId: number, requestKey: string): string => (
    createHmac('sha256', secret).update(`hold:${sessionId}:${requestKey}`).digest('base64url')
);

export const resolveHoldToken = (secret: string, sessionId: number, requestKey?: string): string => (
    requestKey ? deriveHoldToken(secret, sessionId, requestKey) : generateOpaqueToken()
);

// IP нужен только для лимитов и разбора злоупотреблений — в открытом виде не хранится.
export const hashClientIp = (secret: string, clientIp?: string): string | null => (
    clientIp ? createHmac('sha256', secret).update(`ip:${clientIp}`).digest('hex') : null
);

// Токен доступа к заказу выводится из токена hold: повтор checkout возвращает тот же токен,
// а в БД хранится только его хеш.
export const deriveOrderAccessToken = (secret: string, holdToken: string): string => (
    createHmac('sha256', secret).update(`order:${holdToken}`).digest('base64url')
);

// Токен восстановления выводится из id заказа, поэтому worker может вставить его в ссылку,
// не храня секрет в outbox. В БД по-прежнему лежит только хеш токена доступа.
export const deriveRecoveryToken = (secret: string, orderId: number): string => (
    createHmac('sha256', secret).update(`recovery:${orderId}`).digest('base64url')
);
