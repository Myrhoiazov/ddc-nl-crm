// Публичный контракт ядра инвентаря Ticketing. Сервисы зависят от этих интерфейсов,
// а не от Prisma-реализации — см. docs/ticketing/DATABASE_DESIGN.md §5.

export type TicketingSessionStatus = 'DRAFT' | 'ON_SALE' | 'PAUSED' | 'CLOSED' | 'CANCELLED';

export interface HoldSessionSnapshot {
    id: number;
    status: TicketingSessionStatus;
    salesStartAt: Date | null;
    salesEndAt: Date | null;
    holdTtlSeconds: number;
    maxSeatsPerOrder: number;
}

export interface HoldRecord {
    id: number;
    sessionId: number;
    status: 'ACTIVE' | 'CONVERTED' | 'RELEASED' | 'EXPIRED';
    expiresAt: Date;
    seatIds: number[];
}

export interface HoldSeatsParams {
    sessionId: number;
    // Отсортированы по возрастанию и уникальны — порядок блокировок фиксирован.
    seatIds: number[];
    tokenHash: string;
    expiresAt: Date;
    clientIpHash: string | null;
}

export type HoldSeatsOutcome =
    | { kind: 'held'; hold: HoldRecord }
    | { kind: 'unavailable'; unavailableSeatIds: number[] }
    // Параллельный запрос с тем же токеном (тем же requestKey) успел создать hold первым.
    | { kind: 'duplicate' };

export interface HoldRepository {
    findSession(sessionId: number): Promise<HoldSessionSnapshot | null>;
    findHoldByTokenHash(tokenHash: string): Promise<HoldRecord | null>;
    holdSeats(params: HoldSeatsParams): Promise<HoldSeatsOutcome>;
    releaseHold(tokenHash: string, now: Date): Promise<boolean>;
    findExpiredHoldIds(now: Date, limit: number): Promise<number[]>;
    expireHold(holdId: number, now: Date): Promise<boolean>;
}

export interface CreateHoldInput {
    sessionId: number;
    seatIds: number[];
    // Клиентский ключ запроса: повтор с тем же ключом возвращает тот же hold и тот же токен.
    // Знание ключа равносильно знанию токена, поэтому он обязан быть случайным ≥ 128 бит
    // (UUID или base64url от 22 символов) и никогда не должен покидать браузер покупателя.
    requestKey?: string;
    clientIp?: string;
}

export type HoldRejectionReason =
    | 'SESSION_NOT_FOUND'
    | 'SALES_CLOSED'
    | 'INVALID_SEATS'
    | 'TOO_MANY_SEATS'
    | 'INVALID_REQUEST_KEY'
    | 'REQUEST_KEY_REUSED';

export type CreateHoldResult =
    | { kind: 'held'; holdToken: string; expiresAt: Date; seatIds: number[] }
    | { kind: 'unavailable'; unavailableSeatIds: number[] }
    | { kind: 'rejected'; reason: HoldRejectionReason };

export interface HoldServiceDeps {
    repository: HoldRepository;
    tokenSecret: string;
    now?: () => Date;
    sleep?: (ms: number) => Promise<void>;
}
