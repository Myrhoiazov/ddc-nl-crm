import { Prisma, PrismaClient, TicketOrderItemStatus, TicketOrderStatus, TicketSeatStatus } from '@prisma/client';
import { INVENTORY_TX_OPTIONS } from './hold.repository';
import { decideOrderAction, findPaymentMismatch, isTerminalPaymentFailure } from './payment.policy';
import type {
    OrderAction,
    PaymentMode,
    PaymentSignalOutcome,
    PaymentSignalSource,
    RemotePayment,
} from './payment.types';

// Хранение платежа и подтверждение заказа. Порядок блокировок: заказ -> места.

const paymentForStartSelect = {
    id: true,
    idempotencyKey: true,
    molliePaymentId: true,
    checkoutUrl: true,
    mollieMode: true,
    amountCents: true,
    currency: true,
    order: { select: { id: true, number: true, status: true, paymentDeadlineAt: true, locale: true, eventSnapshot: true } },
} as const;

// Последний платёж заказа — тот, что был создан вместе с заказом.
export const findPaymentForStart = (prisma: PrismaClient, orderId: number) => prisma.ticketPayment.findFirst({
    where: { orderId },
    orderBy: { id: 'desc' },
    select: paymentForStartSelect,
});

const remotePaymentFields = (remote: RemotePayment, now: Date) => ({
    status: remote.status,
    method: remote.method,
    paidAt: remote.paidAt,
    mollieExpiresAt: remote.expiresAt,
    refundedCents: remote.refundedCents,
    chargedBackCents: remote.chargedBackCents,
    lastSyncedAt: now,
});

// Идентификатор Mollie записывается один раз: повтор создания с тем же ключом идемпотентности
// возвращает тот же платёж и ничего не перезаписывает.
export const saveCreatedPayment = async (prisma: PrismaClient, paymentId: number, remote: RemotePayment, now: Date) => {
    await prisma.ticketPayment.updateMany({
        where: { id: paymentId, molliePaymentId: null },
        data: { ...remotePaymentFields(remote, now), molliePaymentId: remote.id, checkoutUrl: remote.checkoutUrl },
    });
};

interface LockedOrder {
    id: number;
    sessionId: number;
    status: TicketOrderStatus;
    holdId: number;
    paymentDeadlineAt: Date;
}

// Блокировка строки заказа сериализует webhook, сверку и истечение заказа.
const lockOrder = async (tx: Prisma.TransactionClient, orderId: number): Promise<LockedOrder | undefined> => {
    const rows = await tx.$queryRaw<LockedOrder[]>`
        SELECT id, session_id AS sessionId, status, hold_id AS holdId, payment_deadline_at AS paymentDeadlineAt
        FROM ticket_orders WHERE id = ${orderId} FOR UPDATE
    `;
    return rows[0];
};

interface OrderSeat {
    id: number;
    sessionId: number;
    seatId: number;
}

interface SeatClaim {
    status: TicketSeatStatus;
    holdId: number | null;
}

const sellSeat = async (tx: Prisma.TransactionClient, item: OrderSeat, claim: SeatClaim) => {
    const sold = await tx.ticketSessionSeat.updateMany({
        where: { sessionId: item.sessionId, seatId: item.seatId, ...claim },
        data: { status: TicketSeatStatus.SOLD, orderItemId: item.id, holdId: null, version: { increment: 1 } },
    });
    if (sold.count !== 1) throw new Error(`Ticketing order item ${item.id} no longer has an eligible seat`);
};

const findActiveOrderSeats = async (tx: Prisma.TransactionClient, orderId: number) => {
    const items = await tx.ticketOrderItem.findMany({
        where: { orderId, status: TicketOrderItemStatus.ACTIVE },
        orderBy: { seatId: 'asc' },
        select: { id: true, sessionId: true, seatId: true },
    });
    if (!items.length) throw new Error(`Ticketing order ${orderId} has no active seats`);
    return items;
};

const confirmOrder = async (tx: Prisma.TransactionClient, items: OrderSeat[], claim: SeatClaim, orderId: number, paidAt: Date) => {
    for (const item of items) await sellSeat(tx, item, claim);
    await tx.ticketOrder.update({ where: { id: orderId }, data: { status: TicketOrderStatus.PAID, paidAt } });
    return 'CONFIRMED' as const;
};

const markOrderForReview = async (
    tx: Prisma.TransactionClient,
    orderId: number,
    reason: Extract<OrderAction, { kind: 'REVIEW' }>['reason'],
) => {
    await tx.ticketOrder.update({
        where: { id: orderId }, data: { status: TicketOrderStatus.NEEDS_REVIEW, reviewReason: reason },
    });
    return 'NEEDS_REVIEW' as const;
};

// Проверка всех мест выполняется под блокировками до первой записи в инвентарь.
const canReclaimSeats = async (tx: Prisma.TransactionClient, order: LockedOrder, items: OrderSeat[]): Promise<boolean> => {
    const seats = await tx.$queryRaw<Array<{ status: TicketSeatStatus }>>`
        SELECT status FROM ticket_session_seats
        WHERE session_id = ${order.sessionId} AND seat_id IN (${Prisma.join(items.map(({ seatId }) => seatId))})
        ORDER BY seat_id FOR UPDATE
    `;
    return seats.length === items.length && seats.every(({ status }) => status === TicketSeatStatus.AVAILABLE);
};

const applyOrderAction = async (
    tx: Prisma.TransactionClient,
    order: LockedOrder,
    action: OrderAction,
    paidAt: Date,
): Promise<PaymentSignalOutcome> => {
    if (action.kind === 'NONE') return 'NO_CHANGE';
    if (action.kind === 'REVIEW') return markOrderForReview(tx, order.id, action.reason);

    const items = await findActiveOrderSeats(tx, order.id);
    if (action.kind === 'RECLAIM') {
        if (!(await canReclaimSeats(tx, order, items))) return markOrderForReview(tx, order.id, 'LATE_PAYMENT');
        return confirmOrder(tx, items, { status: TicketSeatStatus.AVAILABLE, holdId: null }, order.id, paidAt);
    }
    return confirmOrder(tx, items, { status: TicketSeatStatus.HELD, holdId: order.holdId }, order.id, paidAt);
};

interface ExpirePendingOrderParams {
    orderId: number;
    now: Date;
    hardDeadlineAt: Date;
}

const isPaidObservation = (payment: { status: string; paidAt: Date | null; chargedBackCents: number }) => (
    payment.status === 'paid' || payment.status === 'charged_back' || payment.paidAt !== null || payment.chargedBackCents > 0
);

const canExpireOrderPayment = async (tx: Prisma.TransactionClient, params: ExpirePendingOrderParams): Promise<boolean> => {
    const payments = await tx.ticketPayment.findMany({
        where: { orderId: params.orderId },
        orderBy: { id: 'desc' },
        select: { status: true, paidAt: true, chargedBackCents: true },
    });
    if (payments.some(isPaidObservation)) return false;
    const latest = payments[0];
    return params.now >= params.hardDeadlineAt || Boolean(latest && isTerminalPaymentFailure(latest.status));
};

const expireOrderInTransaction = async (tx: Prisma.TransactionClient, params: ExpirePendingOrderParams): Promise<boolean> => {
    const order = await lockOrder(tx, params.orderId);
    if (!order || order.status !== TicketOrderStatus.PENDING_PAYMENT || order.paymentDeadlineAt > params.now) return false;
    if (!(await canExpireOrderPayment(tx, params))) return false;

    await tx.ticketSessionSeat.updateMany({
        where: { sessionId: order.sessionId, status: TicketSeatStatus.HELD, holdId: order.holdId },
        data: { status: TicketSeatStatus.AVAILABLE, holdId: null, version: { increment: 1 } },
    });
    await tx.ticketOrder.update({ where: { id: order.id }, data: { status: TicketOrderStatus.EXPIRED } });
    return true;
};

export const expirePendingOrder = (prisma: PrismaClient, params: ExpirePendingOrderParams): Promise<boolean> => (
    prisma.$transaction((tx) => expireOrderInTransaction(tx, params), INVENTORY_TX_OPTIONS)
);

export interface ApplyRemotePaymentContext {
    expectedMode: PaymentMode;
    now: Date;
}

const updateObservedPayment = async (
    tx: Prisma.TransactionClient, id: number, remote: RemotePayment, observedAt: Date,
) => {
    // Ответ на более ранний запрос может прийти уже после подтверждения оплаты.
    const finalStatuses = ['paid', 'charged_back'];
    const notFinal = { status: { notIn: finalStatuses } };
    const latest = { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lte: observedAt } }] };
    const isPaymentFinal = finalStatuses.includes(remote.status);
    await tx.ticketPayment.updateMany({
        where: { id, ...(isPaymentFinal ? { OR: [notFinal, latest] } : { ...notFinal, ...latest }) },
        data: remotePaymentFields(remote, observedAt),
    });
};

export const findPaymentMode = async (prisma: PrismaClient, molliePaymentId: string) => {
    const payment = await prisma.ticketPayment.findUnique({ where: { molliePaymentId }, select: { mollieMode: true } });
    return payment?.mollieMode;
};

const applyInTransaction = async (
    tx: Prisma.TransactionClient,
    remote: RemotePayment,
    context: ApplyRemotePaymentContext,
): Promise<PaymentSignalOutcome> => {
    const payment = await tx.ticketPayment.findUnique({
        where: { molliePaymentId: remote.id },
        select: { id: true, orderId: true, amountCents: true, currency: true, mollieMode: true },
    });
    // Платёж создан не нами (или ещё не сохранён) — заказ по нему не подтверждается никогда.
    if (!payment) return 'UNKNOWN_PAYMENT';

    const order = await lockOrder(tx, payment.orderId);
    if (!order) return 'UNKNOWN_PAYMENT';

    const mismatch = findPaymentMismatch({ ...payment, mode: payment.mollieMode }, remote)
        ?? (payment.mollieMode === context.expectedMode ? null : 'MODE_MISMATCH');
    if (!mismatch) await updateObservedPayment(tx, payment.id, remote, context.now);
    const action = decideOrderAction(order.status, remote, mismatch);
    return applyOrderAction(tx, order, action, remote.paidAt ?? context.now);
};

// Вся обработка сигнала — одна транзакция: либо заказ PAID и все места SOLD, либо ничего.
export const applyRemotePayment = (
    prisma: PrismaClient,
    remote: RemotePayment,
    context: ApplyRemotePaymentContext,
): Promise<PaymentSignalOutcome> => (
    prisma.$transaction((tx) => applyInTransaction(tx, remote, context), INVENTORY_TX_OPTIONS)
);

export const recordPaymentEvent = async (prisma: PrismaClient, molliePaymentId: string, source: PaymentSignalSource) => {
    const event = await prisma.ticketPaymentEvent.create({ data: { molliePaymentId, source }, select: { id: true } });
    return event.id;
};

export interface PaymentEventResult {
    observedStatus?: string;
    outcome?: PaymentSignalOutcome;
    errorMessage?: string;
}

export const finishPaymentEvent = async (prisma: PrismaClient, eventId: number, result: PaymentEventResult, now: Date) => {
    await prisma.ticketPaymentEvent.update({ where: { id: eventId }, data: { ...result, processedAt: now } });
};
