import { Prisma, PrismaClient, TicketHoldStatus, TicketSeatStatus } from '@prisma/client';
import { INVENTORY_TX_OPTIONS } from './hold.repository';
import { isSalesOpen } from './hold.policy';
import { buildEventSnapshot, computeOrderTotals, computePaymentDeadline } from './order.policy';
import type { OrderBuyer, OrderRejectionReason, OrderSettings, OrderSummary } from './order.types';

// Превращение hold в заказ — одна транзакция с условным переходом ACTIVE -> CONVERTED.
// Места остаются HELD за тем же hold; задача истечения их больше не трогает.

export interface ConvertHoldParams {
    tokenHash: string;
    accessTokenHash: string;
    number: string;
    idempotencyKey: string;
    buyer: OrderBuyer;
    settings: OrderSettings;
    now: Date;
}

export type ConvertHoldOutcome =
    | { kind: 'created' | 'existing'; order: OrderSummary }
    | { kind: 'rejected'; reason: OrderRejectionReason };

const orderSummarySelect = {
    id: true,
    number: true,
    status: true,
    subtotalCents: true,
    feeCents: true,
    totalCents: true,
    currency: true,
    paymentDeadlineAt: true,
    items: {
        select: { seatId: true, sectionLabel: true, rowLabel: true, seatLabel: true, categoryName: true, priceCents: true },
        orderBy: { seatId: 'asc' },
    },
    payments: {
        select: { id: true, idempotencyKey: true, status: true, checkoutUrl: true },
        orderBy: { id: 'desc' },
        take: 1,
    },
} as const;

type OrderRow = Prisma.TicketOrderGetPayload<{ select: typeof orderSummarySelect }>;

const toOrderSummary = ({ payments, ...order }: OrderRow): OrderSummary => ({ ...order, payment: payments[0] ?? null });

const holdSessionSelect = {
    id: true,
    status: true,
    salesStartAt: true,
    salesEndAt: true,
    holdTtlSeconds: true,
    maxSeatsPerOrder: true,
    currency: true,
    startsAt: true,
    doorsAt: true,
    event: { select: { title: true } },
    seatMap: { select: { name: true, venue: { select: { name: true, address: true, city: true } } } },
} as const;

const findHoldWithSession = (tx: Prisma.TransactionClient, tokenHash: string) => tx.ticketHold.findUnique({
    where: { tokenHash },
    select: { id: true, sessionId: true, seatCount: true, session: { select: holdSessionSelect } },
});

type HoldWithSession = NonNullable<Awaited<ReturnType<typeof findHoldWithSession>>>;

// Условный переход: истёкший, освобождённый или уже превращённый hold не захватывается.
const claimHold = async (tx: Prisma.TransactionClient, holdId: number, now: Date): Promise<boolean> => {
    const claimed = await tx.ticketHold.updateMany({
        where: { id: holdId, status: TicketHoldStatus.ACTIVE, expiresAt: { gt: now } },
        data: { status: TicketHoldStatus.CONVERTED },
    });
    return claimed.count === 1;
};

const findOrderByHoldId = async (tx: Prisma.TransactionClient, holdId: number): Promise<OrderSummary | null> => {
    const order = await tx.ticketOrder.findUnique({ where: { holdId }, select: orderSummarySelect });
    return order ? toOrderSummary(order) : null;
};

const loadHeldSeats = async (tx: Prisma.TransactionClient, hold: HoldWithSession) => {
    const seats = await tx.ticketSessionSeat.findMany({
        where: { holdId: hold.id, status: TicketSeatStatus.HELD },
        orderBy: { seatId: 'asc' },
        select: {
            seatId: true,
            priceCents: true,
            seat: { select: { sectionLabel: true, rowLabel: true, seatLabel: true, category: { select: { name: true } } } },
        },
    });
    // Захваченный hold обязан владеть всеми своими местами — иное означает повреждение инвентаря.
    if (seats.length !== hold.seatCount) throw new Error(`Ticketing hold ${hold.id} lost its seats`);
    return seats;
};

type HeldSeat = Awaited<ReturnType<typeof loadHeldSeats>>[number];

const toOrderItem = (sessionId: number, { seatId, priceCents, seat }: HeldSeat) => ({
    sessionId,
    seatId,
    priceCents,
    sectionLabel: seat.sectionLabel,
    rowLabel: seat.rowLabel,
    seatLabel: seat.seatLabel,
    categoryName: seat.category.name,
});

const insertOrder = async (tx: Prisma.TransactionClient, hold: HoldWithSession, params: ConvertHoldParams) => {
    const seats = await loadHeldSeats(tx, hold);
    const totals = computeOrderTotals(seats.map((seat) => seat.priceCents), params.settings.feeCents);
    const { currency } = hold.session;
    const order = await tx.ticketOrder.create({
        data: {
            ...totals,
            currency,
            number: params.number,
            accessTokenHash: params.accessTokenHash,
            sessionId: hold.sessionId,
            holdId: hold.id,
            buyerName: params.buyer.name,
            buyerEmail: params.buyer.email,
            buyerPhone: params.buyer.phone || null,
            locale: params.buyer.locale,
            paymentDeadlineAt: computePaymentDeadline(params.now, params.settings.paymentWindowSeconds),
            eventSnapshot: buildEventSnapshot(hold.session),
            termsAcceptedAt: params.now,
            termsVersion: params.settings.termsVersion,
            items: { create: seats.map((seat) => toOrderItem(hold.sessionId, seat)) },
            payments: {
                create: {
                    currency,
                    idempotencyKey: params.idempotencyKey,
                    amountCents: totals.totalCents,
                    mollieMode: params.settings.paymentMode,
                },
            },
        },
        select: orderSummarySelect,
    });
    return toOrderSummary(order);
};

const convertInTransaction = async (tx: Prisma.TransactionClient, params: ConvertHoldParams): Promise<ConvertHoldOutcome> => {
    const hold = await findHoldWithSession(tx, params.tokenHash);
    if (!hold) return { kind: 'rejected', reason: 'HOLD_NOT_FOUND' };

    // Повтор checkout раньше проверки продаж: уже созданный заказ отдаётся и после паузы сеанса.
    const existing = await findOrderByHoldId(tx, hold.id);
    if (existing) return { kind: 'existing', order: existing };
    if (!isSalesOpen(hold.session, params.now)) return { kind: 'rejected', reason: 'SALES_CLOSED' };

    if (!(await claimHold(tx, hold.id, params.now))) {
        // Параллельный checkout того же hold уже зафиксирован — его заказ теперь виден.
        const winner = await findOrderByHoldId(tx, hold.id);
        return winner ? { kind: 'existing', order: winner } : { kind: 'rejected', reason: 'HOLD_NOT_ACTIVE' };
    }
    return { kind: 'created', order: await insertOrder(tx, hold, params) };
};

export const convertHoldToOrder = (prisma: PrismaClient, params: ConvertHoldParams): Promise<ConvertHoldOutcome> => (
    prisma.$transaction((tx) => convertInTransaction(tx, params), INVENTORY_TX_OPTIONS)
);

export const findOrderByAccessTokenHash = async (prisma: PrismaClient, accessTokenHash: string): Promise<OrderSummary | null> => {
    const order = await prisma.ticketOrder.findUnique({ where: { accessTokenHash }, select: orderSummarySelect });
    return order ? toOrderSummary(order) : null;
};

// Совпал случайный номер заказа (уникальный индекс number) — вызывающий повторит с новым.
export const isOrderNumberCollision = (error: unknown): boolean => {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
    return JSON.stringify(error.meta?.target ?? '').includes('number');
};
