import { logger } from '../../common/logger';
import { withLockRetry } from './db-retry';
import { findDuePaymentOrders, findReconciliationOrders, type PaymentJobOrder } from './payment-jobs.repository';
import { findPaymentMismatch } from './payment.policy';
import { expirePendingOrder } from './payment.repository';
import { cancelTicketPayment, readTicketPayment, startPayment } from './payment.service';
import type { PaymentServiceDeps, RemotePayment } from './payment.types';

const HARD_PAYMENT_LIMIT_MS = 60 * 60_000;

const currentTime = (deps: PaymentServiceDeps) => deps.now?.() ?? new Date();

const paymentSignal = (payment: PaymentJobOrder['payments'][number]) => (
    payment.molliePaymentId
        ? { id: payment.molliePaymentId, mode: payment.mollieMode, source: 'RECONCILE' as const }
        : null
);

const verifyCancelablePayment = (order: PaymentJobOrder, deps: PaymentServiceDeps, remote: RemotePayment): boolean => {
    const { amountCents, currency, mollieMode } = order.payments[0];
    if (!deps.gateway.cancelPayment || mollieMode !== deps.config.mode || !remote.isCancelable) return false;
    if (remote.status !== 'open' && remote.status !== 'pending') return false;
    return findPaymentMismatch({ orderId: order.id, amountCents, currency, mode: mollieMode }, remote) === null;
};

const settleDuePayment = async (deps: PaymentServiceDeps, order: PaymentJobOrder) => {
    const payment = order.payments[0];
    if (!payment) return;

    const signal = paymentSignal(payment);
    if (!signal) return;
    const { remote } = await readTicketPayment(deps, signal);
    if (!verifyCancelablePayment(order, deps, remote)) return;

    try {
        await cancelTicketPayment(deps, signal);
    } catch {
        // Mollie может отклонить отмену, если покупатель только что завершил оплату.
        logger.warn(`[Ticketing] Mollie cancellation failed for order ${order.id}; checking current state`);
        await readTicketPayment(deps, signal);
    }
};

const closeOrder = async (deps: PaymentServiceDeps, order: PaymentJobOrder) => {
    try {
        await settleDuePayment(deps, order);
    } catch {
        logger.warn(`[Ticketing] Could not verify payment before closing order ${order.id}`);
    }

    const hardDeadlineAt = new Date(order.createdAt.getTime() + HARD_PAYMENT_LIMIT_MS);
    const input = { orderId: order.id, now: currentTime(deps), hardDeadlineAt };
    await withLockRetry(() => expirePendingOrder(deps.prisma, input), { sleep: deps.sleep });
};

const reconcileOrder = async (deps: PaymentServiceDeps, order: PaymentJobOrder) => {
    const payment = order.payments[0];
    if (!payment) return;

    const signal = paymentSignal(payment);
    if (signal) await readTicketPayment(deps, signal);
    else await startPayment(deps, order.id);
};

type PaymentJob = (deps: PaymentServiceDeps, order: PaymentJobOrder) => Promise<void>;

const runBatch = async (
    deps: PaymentServiceDeps,
    batch: { orders: PaymentJobOrder[]; nextCursor: number },
    action: PaymentJob,
    jobName: string,
) => {
    for (const order of batch.orders) {
        try {
            await action(deps, order);
        } catch {
            logger.error(`[Ticketing] ${jobName} failed for order ${order.id}`);
        }
    }
    return { examined: batch.orders.length, nextCursor: batch.nextCursor };
};

export const expireDueOrders = async (deps: PaymentServiceDeps, afterOrderId = 0) => (
    runBatch(deps, await findDuePaymentOrders(deps.prisma, currentTime(deps), afterOrderId), closeOrder, 'Order closure')
);

export const reconcileTicketPayments = async (deps: PaymentServiceDeps, afterOrderId = 0) => (
    runBatch(deps, await findReconciliationOrders(deps.prisma, currentTime(deps), afterOrderId), reconcileOrder, 'Reconciliation')
);
