import { Prisma, PrismaClient, TicketHoldStatus, TicketSeatStatus } from '@prisma/client';
import type {
    HoldRecord,
    HoldRepository,
    HoldSeatsOutcome,
    HoldSeatsParams,
    HoldSessionSnapshot,
} from './ticketing.types';

// READ COMMITTED: условные UPDATE по первичному ключу не нуждаются в gap-блокировках
// REPEATABLE READ, а именно они — основной источник deadlock.
const INVENTORY_TX_OPTIONS = {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 3000,
    timeout: 5000,
};

// Маркер отката «не все места свободны». Признак — поле code, а не подкласс Error:
// при цели компиляции ES5 `instanceof` для наследников Error не работает.
const SEATS_UNAVAILABLE_CODE = 'TICKETING_SEATS_UNAVAILABLE';

const seatsUnavailableError = () => Object.assign(new Error('Seats are not available'), { code: SEATS_UNAVAILABLE_CODE });

const isSeatsUnavailable = (error: unknown) => (
    Boolean(error) && (error as { code?: unknown }).code === SEATS_UNAVAILABLE_CODE
);

const sessionSnapshotSelect = {
    id: true,
    status: true,
    salesStartAt: true,
    salesEndAt: true,
    holdTtlSeconds: true,
    maxSeatsPerOrder: true,
} as const;

const findSession = (prisma: PrismaClient, sessionId: number): Promise<HoldSessionSnapshot | null> => (
    prisma.ticketSession.findUnique({ where: { id: sessionId }, select: sessionSnapshotSelect })
);

const findHoldByTokenHash = async (prisma: PrismaClient, tokenHash: string): Promise<HoldRecord | null> => {
    const hold = await prisma.ticketHold.findUnique({
        where: { tokenHash },
        select: {
            id: true,
            sessionId: true,
            status: true,
            expiresAt: true,
            seats: { select: { seatId: true }, orderBy: { seatId: 'asc' } },
        },
    });
    if (!hold) return null;
    return { ...hold, seatIds: hold.seats.map((seat) => seat.seatId) };
};

// Одна транзакция: hold + условный UPDATE всех мест. Затронуто меньше строк, чем запрошено, —
// откат целиком, частичного удержания не бывает.
const holdSeatsInTransaction = async (tx: Prisma.TransactionClient, params: HoldSeatsParams): Promise<HoldRecord> => {
    const hold = await tx.ticketHold.create({
        data: {
            sessionId: params.sessionId,
            tokenHash: params.tokenHash,
            expiresAt: params.expiresAt,
            seatCount: params.seatIds.length,
            clientIpHash: params.clientIpHash,
        },
        select: { id: true, sessionId: true, status: true, expiresAt: true },
    });
    const held = await tx.ticketSessionSeat.updateMany({
        where: { sessionId: params.sessionId, seatId: { in: params.seatIds }, status: TicketSeatStatus.AVAILABLE },
        data: { status: TicketSeatStatus.HELD, holdId: hold.id, version: { increment: 1 } },
    });
    if (held.count !== params.seatIds.length) throw seatsUnavailableError();
    return { ...hold, seatIds: params.seatIds };
};

// Вне транзакции: только чтобы сообщить покупателю, какие места заняты (или не существуют).
const findUnavailableSeatIds = async (prisma: PrismaClient, sessionId: number, seatIds: number[]) => {
    const available = await prisma.ticketSessionSeat.findMany({
        where: { sessionId, seatId: { in: seatIds }, status: TicketSeatStatus.AVAILABLE },
        select: { seatId: true },
    });
    const availableIds = new Set(available.map((seat) => seat.seatId));
    const unavailable = seatIds.filter((seatId) => !availableIds.has(seatId));
    // Место могло освободиться между откатом и этим чтением; покупатель всё равно должен
    // увидеть отказ, поэтому пустой список заменяется полным.
    return unavailable.length > 0 ? unavailable : seatIds;
};

const isDuplicateHoldToken = (error: unknown) => (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
);

const holdSeats = async (prisma: PrismaClient, params: HoldSeatsParams): Promise<HoldSeatsOutcome> => {
    try {
        const hold = await prisma.$transaction((tx) => holdSeatsInTransaction(tx, params), INVENTORY_TX_OPTIONS);
        return { kind: 'held', hold };
    } catch (error) {
        if (isDuplicateHoldToken(error)) return { kind: 'duplicate' };
        if (!isSeatsUnavailable(error)) throw error;
        const unavailableSeatIds = await findUnavailableSeatIds(prisma, params.sessionId, params.seatIds);
        return { kind: 'unavailable', unavailableSeatIds };
    }
};

// Порядок блокировок: сначала hold, затем места — тот же, что при создании.
const closeHoldInTransaction = async (
    tx: Prisma.TransactionClient,
    where: Prisma.TicketHoldWhereInput,
    target: { status: TicketHoldStatus; now: Date },
): Promise<boolean> => {
    const holds = await tx.ticketHold.findMany({
        where: { ...where, status: TicketHoldStatus.ACTIVE },
        select: { id: true },
        take: 1,
    });
    const holdId = holds[0]?.id;
    if (!holdId) return false;

    const claimed = await tx.ticketHold.updateMany({
        where: { id: holdId, status: TicketHoldStatus.ACTIVE },
        data: { status: target.status, releasedAt: target.now },
    });
    if (claimed.count !== 1) return false;

    await tx.ticketSessionSeat.updateMany({
        where: { holdId, status: TicketSeatStatus.HELD },
        data: { status: TicketSeatStatus.AVAILABLE, holdId: null, version: { increment: 1 } },
    });
    return true;
};

const releaseHold = (prisma: PrismaClient, tokenHash: string, now: Date): Promise<boolean> => (
    prisma.$transaction(
        (tx) => closeHoldInTransaction(tx, { tokenHash }, { status: TicketHoldStatus.RELEASED, now }),
        INVENTORY_TX_OPTIONS,
    )
);

const findExpiredHoldIds = async (prisma: PrismaClient, now: Date, limit: number): Promise<number[]> => {
    const holds = await prisma.ticketHold.findMany({
        where: { status: TicketHoldStatus.ACTIVE, expiresAt: { lte: now } },
        orderBy: { expiresAt: 'asc' },
        take: limit,
        select: { id: true },
    });
    return holds.map((hold) => hold.id);
};

// Истекает только ACTIVE: hold, превращённый в заказ (CONVERTED), сюда не попадает —
// его местами управляет заказ.
const expireHold = (prisma: PrismaClient, holdId: number, now: Date): Promise<boolean> => (
    prisma.$transaction(
        (tx) => closeHoldInTransaction(
            tx,
            { id: holdId, expiresAt: { lte: now } },
            { status: TicketHoldStatus.EXPIRED, now },
        ),
        INVENTORY_TX_OPTIONS,
    )
);

export const createPrismaHoldRepository = (prisma: PrismaClient): HoldRepository => ({
    findSession: (sessionId) => findSession(prisma, sessionId),
    findHoldByTokenHash: (tokenHash) => findHoldByTokenHash(prisma, tokenHash),
    holdSeats: (params) => holdSeats(prisma, params),
    releaseHold: (tokenHash, now) => releaseHold(prisma, tokenHash, now),
    findExpiredHoldIds: (now, limit) => findExpiredHoldIds(prisma, now, limit),
    expireHold: (holdId, now) => expireHold(prisma, holdId, now),
});
