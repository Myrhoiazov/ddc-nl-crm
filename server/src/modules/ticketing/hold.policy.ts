import type { HoldRejectionReason, HoldSessionSnapshot } from './ticketing.types';

// Чистые правила удержания мест: без I/O, тестируются напрямую.

export const normalizeSeatIds = (seatIds: number[]): number[] | null => {
    const valid = seatIds.every((seatId) => Number.isInteger(seatId) && seatId > 0);
    if (!valid || seatIds.length === 0) return null;
    // Сортировка задаёт единый порядок блокировок строк для пересекающихся запросов.
    return Array.from(new Set(seatIds)).sort((a, b) => a - b);
};

export const isSalesOpen = (session: HoldSessionSnapshot, now: Date): boolean => {
    if (session.status !== 'ON_SALE') return false;
    if (session.salesStartAt && session.salesStartAt.getTime() > now.getTime()) return false;
    if (session.salesEndAt && session.salesEndAt.getTime() <= now.getTime()) return false;
    return true;
};

export const computeHoldExpiry = (session: HoldSessionSnapshot, now: Date): Date => (
    new Date(now.getTime() + session.holdTtlSeconds * 1000)
);

export const isHoldLive = (hold: { status: string; expiresAt: Date }, now: Date): boolean => (
    hold.status === 'ACTIVE' && hold.expiresAt.getTime() > now.getTime()
);

type SeatSelectionCheck =
    | { kind: 'ok'; seatIds: number[] }
    | { kind: 'rejected'; reason: HoldRejectionReason };

export const checkSeatSelection = (
    session: HoldSessionSnapshot | null,
    requestedSeatIds: number[],
    now: Date,
): SeatSelectionCheck => {
    if (!session) return { kind: 'rejected', reason: 'SESSION_NOT_FOUND' };
    if (!isSalesOpen(session, now)) return { kind: 'rejected', reason: 'SALES_CLOSED' };

    const seatIds = normalizeSeatIds(requestedSeatIds);
    if (!seatIds) return { kind: 'rejected', reason: 'INVALID_SEATS' };
    if (seatIds.length > session.maxSeatsPerOrder) return { kind: 'rejected', reason: 'TOO_MANY_SEATS' };

    return { kind: 'ok', seatIds };
};
