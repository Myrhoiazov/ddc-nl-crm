import type {
    HoldRecord,
    HoldRepository,
    HoldSeatsOutcome,
    HoldSeatsParams,
    HoldServiceDeps,
    HoldSessionSnapshot,
} from './ticketing.types';

// Подставной репозиторий в памяти: повторяет контракт Prisma-реализации (всё или ничего,
// условные переходы), чтобы сервис тестировался без базы данных.

const TEST_TOKEN_SECRET = 'ticketing-test-secret';

export const onSaleSession = (overrides: Partial<HoldSessionSnapshot> = {}): HoldSessionSnapshot => ({
    id: 1,
    status: 'ON_SALE',
    salesStartAt: null,
    salesEndAt: null,
    holdTtlSeconds: 600,
    maxSeatsPerOrder: 4,
    ...overrides,
});

export interface FakeHoldStore {
    session: HoldSessionSnapshot | null;
    availableSeatIds: Set<number>;
    holds: Map<string, HoldRecord>;
    holdSeatsCalls: number;
    failuresBeforeSuccess: unknown[];
}

export const createFakeHoldStore = (seatIds: number[], session = onSaleSession()): FakeHoldStore => ({
    session,
    availableSeatIds: new Set(seatIds),
    holds: new Map(),
    holdSeatsCalls: 0,
    failuresBeforeSuccess: [],
});

const fakeHoldSeats = (store: FakeHoldStore, params: HoldSeatsParams): HoldSeatsOutcome => {
    store.holdSeatsCalls += 1;
    const failure = store.failuresBeforeSuccess.shift();
    if (failure) throw failure;
    if (store.holds.has(params.tokenHash)) return { kind: 'duplicate' };

    const unavailableSeatIds = params.seatIds.filter((seatId) => !store.availableSeatIds.has(seatId));
    if (unavailableSeatIds.length > 0) return { kind: 'unavailable', unavailableSeatIds };

    params.seatIds.forEach((seatId) => store.availableSeatIds.delete(seatId));
    const hold: HoldRecord = {
        id: store.holds.size + 1,
        sessionId: params.sessionId,
        status: 'ACTIVE',
        expiresAt: params.expiresAt,
        seatIds: params.seatIds,
    };
    store.holds.set(params.tokenHash, hold);
    return { kind: 'held', hold };
};

const closeFakeHold = (store: FakeHoldStore, hold: HoldRecord | undefined, status: HoldRecord['status']) => {
    if (!hold || hold.status !== 'ACTIVE') return false;
    hold.status = status;
    hold.seatIds.forEach((seatId) => store.availableSeatIds.add(seatId));
    return true;
};

const findFakeHoldById = (store: FakeHoldStore, holdId: number) => (
    Array.from(store.holds.values()).find((hold) => hold.id === holdId)
);

const findFakeExpiredHoldIds = (store: FakeHoldStore, now: Date, limit: number) => (
    Array.from(store.holds.values())
        .filter((hold) => hold.status === 'ACTIVE' && hold.expiresAt.getTime() <= now.getTime())
        .slice(0, limit)
        .map((hold) => hold.id)
);

const expireFakeHold = (store: FakeHoldStore, holdId: number, now: Date) => {
    const hold = findFakeHoldById(store, holdId);
    if (!hold || hold.expiresAt.getTime() > now.getTime()) return false;
    return closeFakeHold(store, hold, 'EXPIRED');
};

const createFakeHoldRepository = (store: FakeHoldStore): HoldRepository => ({
    findSession: async () => store.session,
    findHoldByTokenHash: async (tokenHash) => store.holds.get(tokenHash) ?? null,
    holdSeats: async (params) => fakeHoldSeats(store, params),
    releaseHold: async (tokenHash) => closeFakeHold(store, store.holds.get(tokenHash), 'RELEASED'),
    findExpiredHoldIds: async (now, limit) => findFakeExpiredHoldIds(store, now, limit),
    expireHold: async (holdId, now) => expireFakeHold(store, holdId, now),
});

export const createTestDeps = (store: FakeHoldStore, now: Date): HoldServiceDeps => ({
    repository: createFakeHoldRepository(store),
    tokenSecret: TEST_TOKEN_SECRET,
    now: () => now,
    sleep: async () => undefined,
});
