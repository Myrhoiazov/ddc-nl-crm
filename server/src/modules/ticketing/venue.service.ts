import { Prisma, PrismaClient, TicketSeatMapStatus } from '@prisma/client';
import { generateSeatMap, type GeneratedSeatMap } from './seat-map.generator';
import type { CreateSeatMapInput, CreateVenueInput } from './venue.schema';

// Площадки и версии схем зала. Опубликованная версия неизменяема
// (docs/ticketing/DATABASE_DESIGN.md §4.1) — правка означает новую версию.

const seatMapSummarySelect = {
    id: true,
    version: true,
    status: true,
    name: true,
    publishedAt: true,
    _count: { select: { seats: true } },
} as const;

export const listVenues = (prisma: PrismaClient) => prisma.ticketVenue.findMany({
    orderBy: { name: 'asc' },
    select: {
        id: true,
        name: true,
        address: true,
        city: true,
        isActive: true,
        seatMaps: { select: seatMapSummarySelect, orderBy: { version: 'desc' } },
    },
});

export const createVenue = (prisma: PrismaClient, input: CreateVenueInput) => prisma.ticketVenue.create({
    data: { name: input.name, address: input.address || null, city: input.city || null },
    select: { id: true, name: true, address: true, city: true, isActive: true },
});

const nextSeatMapVersion = async (tx: Prisma.TransactionClient, venueId: number) => {
    const latest = await tx.ticketSeatMap.aggregate({ where: { venueId }, _max: { version: true } });
    return (latest._max.version ?? 0) + 1;
};

// Содержимое версии схемы: результат генератора рядов или копия существующей версии.
export interface SeatMapContent {
    canvas: Prisma.InputJsonValue;
    categories: GeneratedSeatMap['categories'];
    seats: (GeneratedSeatMap['seats'][number] & Partial<Pick<Prisma.TicketSeatCreateManyInput, 'sectionLabel' | 'rotation' | 'isAccessible' | 'isDefaultBlocked'>>)[];
}

export const persistSeatMap = async (
    tx: Prisma.TransactionClient,
    target: { venueId: number; name: string },
    generated: SeatMapContent,
) => {
    const seatMap = await tx.ticketSeatMap.create({
        data: {
            venueId: target.venueId,
            name: target.name,
            version: await nextSeatMapVersion(tx, target.venueId),
            canvas: generated.canvas,
            categories: { create: generated.categories },
        },
        select: { id: true, categories: { select: { id: true, code: true } } },
    });
    const categoryIdByCode = new Map(seatMap.categories.map((category) => [category.code, category.id]));
    await tx.ticketSeat.createMany({
        data: generated.seats.map(({ categoryCode, ...seat }) => ({
            ...seat,
            seatMapId: seatMap.id,
            categoryId: categoryIdByCode.get(categoryCode),
        })),
    });
    return seatMap.id;
};

export type CreateSeatMapResult =
    | { kind: 'created'; seatMapId: number }
    | { kind: 'venue_not_found' };

// Два одновременных создания получат одинаковый номер версии; уникальный индекс
// (venue_id, version) отклонит второе, и клиент повторит запрос.
export const createSeatMap = async (
    prisma: PrismaClient,
    venueId: number,
    input: CreateSeatMapInput,
): Promise<CreateSeatMapResult> => {
    const venue = await prisma.ticketVenue.findUnique({ where: { id: venueId }, select: { id: true } });
    if (!venue) return { kind: 'venue_not_found' };

    const generated = generateSeatMap(input.blocks);
    const seatMapId = await prisma.$transaction((tx) => persistSeatMap(tx, { venueId, name: input.name }, generated));
    return { kind: 'created', seatMapId };
};

export const getSeatMap = (prisma: PrismaClient, seatMapId: number) => prisma.ticketSeatMap.findUnique({
    where: { id: seatMapId },
    select: {
        id: true,
        venueId: true,
        version: true,
        status: true,
        name: true,
        canvas: true,
        publishedAt: true,
        categories: {
            select: { id: true, code: true, name: true, colorSlot: true },
            orderBy: { sortOrder: 'asc' },
        },
        seats: {
            select: { id: true, categoryId: true, rowLabel: true, seatLabel: true, x: true, y: true, isDefaultBlocked: true },
            orderBy: { id: 'asc' },
        },
    },
});

// Условный переход DRAFT -> PUBLISHED: повторная публикация ничего не меняет и возвращает false.
export const publishSeatMap = async (prisma: PrismaClient, seatMapId: number, userId?: number): Promise<boolean> => {
    const published = await prisma.ticketSeatMap.updateMany({
        where: { id: seatMapId, status: TicketSeatMapStatus.DRAFT, seats: { some: {} } },
        data: { status: TicketSeatMapStatus.PUBLISHED, publishedAt: new Date(), publishedById: userId ?? null },
    });
    return published.count === 1;
};
