import { Prisma, PrismaClient, TicketSeatMapStatus } from '@prisma/client';
import { persistSeatMap } from './venue.service';
import type { UpdateSeatsInput } from './venue.schema';

// Точечная правка черновика схемы и клонирование версии. Опубликованная версия неизменяема
// (docs/ticketing/DATABASE_DESIGN.md §4.1): её правят через клон в новый черновик.

export type UpdateSeatsResult =
    | { kind: 'updated'; seats: number }
    | { kind: 'rejected'; reason: 'SEAT_MAP_NOT_FOUND' | 'NOT_A_DRAFT' | 'UNKNOWN_CATEGORY' | 'UNKNOWN_SEATS' };

type Rejection = Extract<UpdateSeatsResult, { kind: 'rejected' }>;

const reject = (reason: Rejection['reason']): Rejection => ({ kind: 'rejected', reason });

// Блокировка строки схемы на время правки: публикация (условный UPDATE той же строки) ждёт
// конца транзакции, поэтому опубликованная схема не может получить позднюю правку мест.
const lockSeatMap = async (tx: Prisma.TransactionClient, seatMapId: number) => {
    const rows = await tx.$queryRaw<{ status: TicketSeatMapStatus }[]>`
        SELECT status FROM ticket_seat_maps WHERE id = ${seatMapId} FOR UPDATE
    `;
    return rows[0]?.status ?? null;
};

const isForeignCategory = async (tx: Prisma.TransactionClient, seatMapId: number, categoryId?: number) => {
    if (categoryId === undefined) return false;
    return (await tx.ticketSeatCategory.count({ where: { id: categoryId, seatMapId } })) === 0;
};

const applySeatPatch = async (
    tx: Prisma.TransactionClient,
    seatMapId: number,
    input: UpdateSeatsInput,
): Promise<UpdateSeatsResult> => {
    const status = await lockSeatMap(tx, seatMapId);
    if (!status) return reject('SEAT_MAP_NOT_FOUND');
    if (status !== TicketSeatMapStatus.DRAFT) return reject('NOT_A_DRAFT');
    if (await isForeignCategory(tx, seatMapId, input.categoryId)) return reject('UNKNOWN_CATEGORY');

    const seatIds = Array.from(new Set(input.seatIds));
    const where = { id: { in: seatIds }, seatMapId };
    if ((await tx.ticketSeat.count({ where })) !== seatIds.length) return reject('UNKNOWN_SEATS');

    await tx.ticketSeat.updateMany({
        where,
        data: { categoryId: input.categoryId, isDefaultBlocked: input.isDefaultBlocked },
    });
    return { kind: 'updated', seats: seatIds.length };
};

// Всё или ничего: чужое место или категория отклоняют правку целиком.
export const updateSeats = (prisma: PrismaClient, seatMapId: number, input: UpdateSeatsInput) => (
    prisma.$transaction((tx) => applySeatPatch(tx, seatMapId, input))
);

const loadCloneSource = (prisma: PrismaClient, seatMapId: number) => prisma.ticketSeatMap.findUnique({
    where: { id: seatMapId },
    select: {
        venueId: true,
        name: true,
        canvas: true,
        categories: { select: { id: true, code: true, name: true, colorSlot: true, sortOrder: true } },
        seats: {
            select: {
                categoryId: true,
                sectionLabel: true,
                rowLabel: true,
                seatLabel: true,
                x: true,
                y: true,
                rotation: true,
                isAccessible: true,
                isDefaultBlocked: true,
            },
            orderBy: { id: 'asc' },
        },
    },
});

type CloneSource = NonNullable<Awaited<ReturnType<typeof loadCloneSource>>>;

// Копия получает собственные категории, поэтому места переносятся по коду категории, а не по id.
const toSeatMapContent = (source: CloneSource) => {
    const codeById = new Map(source.categories.map((category) => [category.id, category.code]));
    return {
        canvas: source.canvas as Prisma.InputJsonValue,
        categories: source.categories.map(({ id, ...category }) => category),
        seats: source.seats.map(({ categoryId, ...seat }) => ({ ...seat, categoryCode: codeById.get(categoryId) })),
    };
};

// Клонировать можно версию в любом статусе; результат — всегда новый черновик той же площадки.
export const cloneSeatMap = async (prisma: PrismaClient, seatMapId: number): Promise<number | null> => {
    const source = await loadCloneSource(prisma, seatMapId);
    if (!source) return null;

    const target = { venueId: source.venueId, name: source.name };
    return prisma.$transaction((tx) => persistSeatMap(tx, target, toSeatMapContent(source)));
};
