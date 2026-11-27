import { randomBytes } from 'crypto';
import { PrismaClient, TicketEventStatus, TicketSeatMapStatus, TicketSessionStatus } from '@prisma/client';
import { allowedSourceStatuses, buildEventSlug, checkPriceCoverage, isSalesWindowValid } from './event.policy';
import type { CreateEventInput, CreateSessionInput, ManualSessionStatus } from './event.schema';
import { generateSessionInventory } from './inventory-generation.service';

// События и сеансы. Сеанс привязан к опубликованной версии схемы зала; продажа открывается
// публикацией сеанса, которая создаёт инвентарь мест.

const sessionSummarySelect = {
    id: true,
    startsAt: true,
    status: true,
    currency: true,
    inventoryGeneratedAt: true,
    seatMap: { select: { id: true, name: true, version: true, venue: { select: { name: true } } } },
} as const;

const countSeatsByStatus = async (prisma: PrismaClient, sessionIds: number[]) => {
    const groups = await prisma.ticketSessionSeat.groupBy({
        by: ['sessionId', 'status'],
        where: { sessionId: { in: sessionIds } },
        _count: true,
    });
    const counts = new Map<number, Record<string, number>>();
    groups.forEach((group) => {
        counts.set(group.sessionId, { ...counts.get(group.sessionId), [group.status]: group._count });
    });
    return counts;
};

export const listEvents = async (prisma: PrismaClient) => {
    const events = await prisma.ticketEvent.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            status: true,
            sessions: { select: sessionSummarySelect, orderBy: { startsAt: 'asc' } },
        },
    });
    const sessionIds = events.flatMap((event) => event.sessions.map((session) => session.id));
    const counts = await countSeatsByStatus(prisma, sessionIds);
    return events.map((event) => ({
        ...event,
        sessions: event.sessions.map((session) => ({ ...session, seatCounts: counts.get(session.id) ?? {} })),
    }));
};

export const createEvent = (prisma: PrismaClient, input: CreateEventInput, userId?: number) => prisma.ticketEvent.create({
    data: {
        title: input.title,
        description: input.description || null,
        slug: buildEventSlug(input.title, randomBytes(4).toString('hex')),
        createdById: userId ?? null,
    },
    select: { id: true, slug: true, title: true, status: true },
});

export type CreateSessionResult =
    | { kind: 'created'; sessionId: number }
    | { kind: 'rejected'; reason: 'EVENT_NOT_FOUND' | 'SEAT_MAP_NOT_PUBLISHED' | 'INVALID_SALES_WINDOW' }
    | { kind: 'rejected'; reason: 'PRICE_MISMATCH'; missingCategoryIds: number[]; unknownCategoryIds: number[] };

const toDate = (value?: string) => (value ? new Date(value) : null);

const loadSessionParents = (prisma: PrismaClient, eventId: number, seatMapId: number) => Promise.all([
    prisma.ticketEvent.findUnique({ where: { id: eventId }, select: { id: true } }),
    prisma.ticketSeatMap.findUnique({
        where: { id: seatMapId },
        select: { status: true, categories: { select: { id: true } } },
    }),
]);

export const createSession = async (
    prisma: PrismaClient,
    eventId: number,
    input: CreateSessionInput,
): Promise<CreateSessionResult> => {
    const [event, seatMap] = await loadSessionParents(prisma, eventId, input.seatMapId);
    if (!event) return { kind: 'rejected', reason: 'EVENT_NOT_FOUND' };
    if (seatMap?.status !== TicketSeatMapStatus.PUBLISHED) return { kind: 'rejected', reason: 'SEAT_MAP_NOT_PUBLISHED' };

    const window = { startsAt: new Date(input.startsAt), salesStartAt: toDate(input.salesStartAt), salesEndAt: toDate(input.salesEndAt) };
    if (!isSalesWindowValid(window)) return { kind: 'rejected', reason: 'INVALID_SALES_WINDOW' };

    const coverage = checkPriceCoverage(seatMap.categories.map((category) => category.id), input.prices);
    if (coverage.kind === 'mismatch') {
        const { missingCategoryIds, unknownCategoryIds } = coverage;
        return { kind: 'rejected', reason: 'PRICE_MISMATCH', missingCategoryIds, unknownCategoryIds };
    }

    const session = await prisma.ticketSession.create({
        data: {
            eventId,
            seatMapId: input.seatMapId,
            ...window,
            maxSeatsPerOrder: input.maxSeatsPerOrder,
            holdTtlSeconds: input.holdTtlSeconds,
            prices: { create: input.prices },
        },
        select: { id: true },
    });
    return { kind: 'created', sessionId: session.id };
};

export type PublishSessionResult =
    | { kind: 'published'; seats: number }
    | { kind: 'rejected'; reason: string };

// Инвентарь создаётся идемпотентно, переход DRAFT -> ON_SALE условный: повторная или
// параллельная публикация не создаёт дублей и получает отказ NOT_A_DRAFT.
export const publishSession = async (prisma: PrismaClient, sessionId: number): Promise<PublishSessionResult> => {
    const draft = await prisma.ticketSession.findFirst({
        where: { id: sessionId, status: TicketSessionStatus.DRAFT },
        select: { eventId: true },
    });
    if (!draft) return { kind: 'rejected', reason: 'NOT_A_DRAFT' };

    const inventory = await generateSessionInventory(prisma, sessionId);
    if (inventory.kind === 'rejected') return { kind: 'rejected', reason: inventory.reason };

    const opened = await prisma.ticketSession.updateMany({
        where: { id: sessionId, status: TicketSessionStatus.DRAFT },
        data: { status: TicketSessionStatus.ON_SALE },
    });
    if (opened.count !== 1) return { kind: 'rejected', reason: 'NOT_A_DRAFT' };

    await prisma.ticketEvent.updateMany({
        where: { id: draft.eventId, status: TicketEventStatus.DRAFT },
        data: { status: TicketEventStatus.PUBLISHED },
    });
    return { kind: 'published', seats: inventory.total };
};

export const changeSessionStatus = async (
    prisma: PrismaClient,
    sessionId: number,
    target: ManualSessionStatus,
): Promise<boolean> => {
    const changed = await prisma.ticketSession.updateMany({
        where: { id: sessionId, status: { in: allowedSourceStatuses(target) } },
        data: { status: target },
    });
    return changed.count === 1;
};

export const getSessionDetail = (prisma: PrismaClient, sessionId: number) => prisma.ticketSession.findUnique({
    where: { id: sessionId },
    select: {
        id: true,
        startsAt: true,
        salesStartAt: true,
        salesEndAt: true,
        status: true,
        currency: true,
        maxSeatsPerOrder: true,
        holdTtlSeconds: true,
        event: { select: { id: true, title: true } },
        prices: { select: { categoryId: true, priceCents: true } },
        seats: { select: { seatId: true, status: true, priceCents: true }, orderBy: { seatId: 'asc' } },
        seatMap: {
            select: {
                id: true,
                name: true,
                version: true,
                canvas: true,
                categories: { select: { id: true, code: true, name: true, colorSlot: true }, orderBy: { sortOrder: 'asc' } },
                seats: { select: { id: true, categoryId: true, rowLabel: true, seatLabel: true, x: true, y: true }, orderBy: { id: 'asc' } },
            },
        },
    },
});
