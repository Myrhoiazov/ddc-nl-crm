import type { PrismaClient } from '@prisma/client';
import { buildPublicSession, isSessionPublic, type PublicSessionSource } from './public.policy';

const publicSessionSelect = {
    id: true,
    status: true,
    startsAt: true,
    doorsAt: true,
    salesStartAt: true,
    salesEndAt: true,
    holdTtlSeconds: true,
    maxSeatsPerOrder: true,
    currency: true,
    event: { select: { title: true, description: true } },
    prices: { select: { categoryId: true, priceCents: true } },
    seats: { select: { seatId: true, status: true } },
    seatMap: {
        select: {
            name: true,
            canvas: true,
            venue: { select: { name: true, address: true, city: true } },
            categories: { select: { id: true, name: true, colorSlot: true }, orderBy: { sortOrder: 'asc' } },
            seats: {
                select: { id: true, categoryId: true, sectionLabel: true, rowLabel: true, seatLabel: true, x: true, y: true },
                orderBy: { id: 'asc' },
            },
        },
    },
} as const;

// Карта сеанса для витрины: схема, цены и занятость мест. Скрытый сеанс неотличим от несуществующего.
export const getPublicSession = async (prisma: PrismaClient, sessionId: number, now: Date) => {
    const session = await prisma.ticketSession.findUnique({ where: { id: sessionId }, select: publicSessionSelect });
    if (!session || !isSessionPublic(session.status)) return null;
    return buildPublicSession(session as PublicSessionSource, now);
};
