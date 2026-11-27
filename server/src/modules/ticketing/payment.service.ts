import { withLockRetry } from './db-retry';
import { buildPaymentDescription, buildReturnUrl, findPaymentMismatch } from './payment.policy';
import {
    applyRemotePayment,
    findPaymentForStart,
    findPaymentMode,
    finishPaymentEvent,
    recordPaymentEvent,
    saveCreatedPayment,
} from './payment.repository';
import type {
    PaymentMode,
    PaymentServiceDeps,
    PaymentSignalOutcome,
    PaymentSignalSource,
    RemotePayment,
} from './payment.types';

const currentTime = (deps: PaymentServiceDeps) => (deps.now ? deps.now() : new Date());

type PaymentToStart = NonNullable<Awaited<ReturnType<typeof findPaymentForStart>>>;

const createRemotePayment = (deps: PaymentServiceDeps, payment: PaymentToStart): Promise<RemotePayment> => {
    const { order } = payment;
    const { eventTitle } = order.eventSnapshot as { eventTitle: string };
    return deps.gateway.createPayment({
        mode: payment.mollieMode,
        orderId: order.id,
        orderNumber: order.number,
        amountCents: payment.amountCents,
        currency: payment.currency,
        description: buildPaymentDescription(order.number, eventTitle),
        locale: order.locale,
        redirectUrl: buildReturnUrl(deps.config.returnUrl, order.number),
        webhookUrl: deps.config.webhookUrl,
        idempotencyKey: payment.idempotencyKey,
    });
};

const isPaymentWindowOpen = (payment: PaymentToStart, now: Date): boolean => (
    payment.order.status === 'PENDING_PAYMENT' && payment.order.paymentDeadlineAt > now
);

const unverifiedPayment = (remote: RemotePayment): RemotePayment => ({
    ...remote,
    status: 'CREATED',
    checkoutUrl: null,
    paidAt: null,
    refundedCents: 0,
    chargedBackCents: 0,
});

// Создаёт платёж у провайдера для заказа, ожидающего оплаты. Ключ идемпотентности сохранён
// вместе с заказом, поэтому повтор после таймаута или сбоя не создаёт второй платёж.
// Сетевой вызов идёт вне транзакции БД.
export const startPayment = async (deps: PaymentServiceDeps, orderId: number): Promise<string | null> => {
    const payment = await findPaymentForStart(deps.prisma, orderId);
    const now = currentTime(deps);
    // Mollie хранит ключ идемпотентности один час. Окно checkout короче этого срока.
    if (!payment || !isPaymentWindowOpen(payment, now)) return null;
    if (payment.mollieMode !== deps.config.mode) throw new Error('Ticketing payment mode has changed');
    if (payment.molliePaymentId) return payment.checkoutUrl;

    const remote = await createRemotePayment(deps, payment);
    const mismatch = findPaymentMismatch({ ...payment, orderId, mode: deps.config.mode }, remote);
    await saveCreatedPayment(deps.prisma, payment.id, mismatch ? unverifiedPayment(remote) : remote, now);
    if (mismatch) throw new Error(`Ticketing payment creation verification failed: ${mismatch}`);

    const current = await findPaymentForStart(deps.prisma, orderId);
    return current && isPaymentWindowOpen(current, currentTime(deps)) ? current.checkoutUrl : null;
};

interface PaymentSignal {
    id: string;
    mode: PaymentMode;
    source: PaymentSignalSource;
}

const applyPaymentSignal = async (
    deps: PaymentServiceDeps,
    signal: PaymentSignal,
    load: () => Promise<RemotePayment>,
) => {
    const eventId = await recordPaymentEvent(deps.prisma, signal.id, signal.source);
    try {
        const now = currentTime(deps);
        const remote = await load();
        if (remote.id !== signal.id) throw new Error('Mollie returned a different payment ID');
        const context = { expectedMode: deps.config.mode, now };
        const outcome = await withLockRetry(() => applyRemotePayment(deps.prisma, remote, context), { sleep: deps.sleep });
        await finishPaymentEvent(deps.prisma, eventId, { observedStatus: remote.status, outcome }, currentTime(deps));
        return { remote, outcome };
    } catch (error) {
        const errorMessage = 'Failed to verify or apply the Mollie payment observation';
        await finishPaymentEvent(deps.prisma, eventId, { errorMessage }, currentTime(deps));
        throw error;
    }
};

export const readTicketPayment = (deps: PaymentServiceDeps, signal: PaymentSignal) => (
    applyPaymentSignal(deps, signal, () => deps.gateway.getPayment(signal.id, signal.mode))
);

export const cancelTicketPayment = (deps: PaymentServiceDeps, signal: PaymentSignal) => {
    if (!deps.gateway.cancelPayment) throw new Error('Ticketing payment cancellation is unavailable');
    const cancel = deps.gateway.cancelPayment.bind(deps.gateway);
    return applyPaymentSignal(deps, signal, () => cancel(signal.id, signal.mode));
};

// Webhook, возврат покупателя и сверка используют тот же путь подтверждения.
export const syncPayment = async (
    deps: PaymentServiceDeps,
    molliePaymentId: string,
    source: PaymentSignalSource,
): Promise<PaymentSignalOutcome> => {
    const mode = await findPaymentMode(deps.prisma, molliePaymentId);
    if (!mode) return 'UNKNOWN_PAYMENT';
    const { outcome } = await readTicketPayment(deps, { id: molliePaymentId, mode, source });
    return outcome;
};
