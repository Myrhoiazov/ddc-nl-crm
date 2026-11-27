import { PrismaClient, TicketSeatMapStatus, TicketSeatStatus } from '@prisma/client';
import { withLockRetry } from './db-retry';

// Генерация инвентаря сеанса: по одной строке на каждое место опубликованной схемы зала.
// Повторный запуск безопасен — существующие строки не трогаются (skipDuplicates по PK).

export interface InventorySeat {
    id: number;
    categoryId: number;
    isDefaultBlocked: boolean;
}

export interface InventoryRow {
    sessionId: number;
    seatId: number;
    status: TicketSeatStatus;
    priceCents: number;
    blockReason: string | null;
}

export type GenerateInventoryResult =
    | { kind: 'generated'; created: number; total: number }
    | { kind: 'rejected'; reason: 'SESSION_NOT_FOUND' | 'SEAT_MAP_NOT_PUBLISHED' | 'NO_SEATS' }
    | { kind: 'rejected'; reason: 'MISSING_PRICES'; categoryIds: number[] };

const DEFAULT_BLOCK_REASON = 'seat-map-default';

export const findCategoriesWithoutPrice = (seats: InventorySeat[], priceByCategory: Map<number, number>): number[] => (
    Array.from(new Set(seats.map((seat) => seat.categoryId)))
        .filter((categoryId) => !priceByCategory.has(categoryId))
        .sort((a, b) => a - b)
);

export const buildInventoryRows = (
    sessionId: number,
    seats: InventorySeat[],
    priceByCategory: Map<number, number>,
): InventoryRow[] => seats.map((seat) => ({
    sessionId,
    seatId: seat.id,
    status: seat.isDefaultBlocked ? TicketSeatStatus.BLOCKED : TicketSeatStatus.AVAILABLE,
    priceCents: priceByCategory.get(seat.categoryId) ?? 0,
    blockReason: seat.isDefaultBlocked ? DEFAULT_BLOCK_REASON : null,
}));

const loadSessionForInventory = (prisma: PrismaClient, sessionId: number) => prisma.ticketSession.findUnique({
    where: { id: sessionId },
    select: {
        id: true,
        prices: { select: { categoryId: true, priceCents: true } },
        seatMap: {
            select: {
                status: true,
                seats: { select: { id: true, categoryId: true, isDefaultBlocked: true }, orderBy: { id: 'asc' } },
            },
        },
    },
});

const persistInventory = async (prisma: PrismaClient, sessionId: number, rows: InventoryRow[]) => {
    const [created] = await prisma.$transaction([
        prisma.ticketSessionSeat.createMany({ data: rows, skipDuplicates: true }),
        prisma.ticketSession.update({ where: { id: sessionId }, data: { inventoryGeneratedAt: new Date() } }),
    ]);
    return created.count;
};

export const generateSessionInventory = async (
    prisma: PrismaClient,
    sessionId: number,
): Promise<GenerateInventoryResult> => {
    const session = await loadSessionForInventory(prisma, sessionId);
    if (!session) return { kind: 'rejected', reason: 'SESSION_NOT_FOUND' };
    if (session.seatMap.status !== TicketSeatMapStatus.PUBLISHED) {
        return { kind: 'rejected', reason: 'SEAT_MAP_NOT_PUBLISHED' };
    }
    const { seats } = session.seatMap;
    if (seats.length === 0) return { kind: 'rejected', reason: 'NO_SEATS' };

    const priceByCategory = new Map(session.prices.map((price) => [price.categoryId, price.priceCents]));
    const categoryIds = findCategoriesWithoutPrice(seats, priceByCategory);
    if (categoryIds.length > 0) return { kind: 'rejected', reason: 'MISSING_PRICES', categoryIds };

    // Две одновременные публикации вставляют одни и те же строки и могут взаимно
    // заблокироваться; повтор безопасен, потому что вставка идемпотентна.
    const rows = buildInventoryRows(sessionId, seats, priceByCategory);
    const created = await withLockRetry(() => persistInventory(prisma, sessionId, rows));
    return { kind: 'generated', created, total: seats.length };
};
