import { Prisma, type PrismaClient } from '@prisma/client';

const BATCH_SIZE = 100;
const RECONCILE_INTERVAL_MS = 5 * 60_000;
const RECENT_PAID_MS = 7 * 24 * 60 * 60_000;

const orderSelect = {
    id: true,
    createdAt: true,
    payments: {
        orderBy: { id: 'desc' },
        take: 1,
        select: { molliePaymentId: true, mollieMode: true, amountCents: true, currency: true },
    },
} satisfies Prisma.TicketOrderSelect;

export type PaymentJobOrder = Prisma.TicketOrderGetPayload<{ select: typeof orderSelect }>;

const findOrderBatch = async (prisma: PrismaClient, where: Prisma.TicketOrderWhereInput, afterOrderId: number) => {
    const candidates = await prisma.ticketOrder.findMany({
        where: { ...where, id: { gt: afterOrderId } },
        select: orderSelect,
        orderBy: { id: 'asc' },
        take: BATCH_SIZE + 1,
    });
    const orders = candidates.slice(0, BATCH_SIZE);
    const nextCursor = candidates.length > BATCH_SIZE ? orders[orders.length - 1].id : 0;
    return { orders, nextCursor };
};

export const findDuePaymentOrders = (prisma: PrismaClient, now: Date, afterOrderId: number) => (
    findOrderBatch(prisma, { status: 'PENDING_PAYMENT', paymentDeadlineAt: { lte: now } }, afterOrderId)
);

const getReconciliationFilter = (now: Date): Prisma.TicketOrderWhereInput => {
    const staleBefore = new Date(now.getTime() - RECONCILE_INTERVAL_MS);
    const recentPaidAfter = new Date(now.getTime() - RECENT_PAID_MS);
    const knownAndStale: Prisma.TicketPaymentWhereInput = {
        molliePaymentId: { not: null },
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lte: staleBefore } }],
    };
    return {
        OR: [
            {
                status: 'PENDING_PAYMENT', payments: { some: knownAndStale },
            },
            {
                status: 'PENDING_PAYMENT', paymentDeadlineAt: { gt: now },
                payments: { some: { molliePaymentId: null } },
            },
            {
                status: { in: ['EXPIRED', 'CANCELLED'] },
                payments: { some: { ...knownAndStale, status: { notIn: ['expired', 'canceled', 'failed'] } } },
            },
            {
                status: 'PAID', paidAt: { gte: recentPaidAfter },
                payments: { some: knownAndStale },
            },
        ],
    };
};

export const findReconciliationOrders = (prisma: PrismaClient, now: Date, afterOrderId: number) => (
    findOrderBatch(prisma, getReconciliationFilter(now), afterOrderId)
);
