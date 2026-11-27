import type { OrderAction, PaymentMismatch, PaymentMode, RemotePayment } from './payment.types';

// Чистые правила платежа: суммы, проверки подтверждения, решение о переходе заказа.

export const TICKETING_PAYMENT_SOURCE = 'ticketing';

// Mollie принимает сумму строкой с двумя знаками; деление с плавающей точкой здесь не используется.
export const toMollieAmount = (cents: number): string => (
    `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
);

const MOLLIE_AMOUNT_PATTERN = /^(\d+)\.(\d{2})$/;

// Нераспознанная сумма даёт NaN и потому никогда не совпадёт с ожидаемой.
export const fromMollieAmount = (value?: string | null): number => {
    const match = MOLLIE_AMOUNT_PATTERN.exec(value ?? '');
    return match ? Number(match[1]) * 100 + Number(match[2]) : Number.NaN;
};

// Платёж билетов помечен в metadata — по этой метке его пропускает общая синхронизация Mollie.
const parseMetadata = (metadata: unknown): unknown => {
    if (typeof metadata !== 'string') return metadata;
    try {
        return JSON.parse(metadata);
    } catch {
        return null;
    }
};

export const readPaymentMetadata = (metadata: unknown): RemotePayment['metadata'] => {
    const { source, orderId } = (parseMetadata(metadata) ?? {}) as { source?: unknown; orderId?: unknown };
    return {
        source: typeof source === 'string' ? source : undefined,
        orderId: typeof orderId === 'number' ? orderId : undefined,
    };
};

export const isTicketingPayment = (metadata: unknown): boolean => (
    readPaymentMetadata(metadata).source === TICKETING_PAYMENT_SOURCE
);

export interface ExpectedPayment {
    orderId: number;
    amountCents: number;
    currency: string;
    mode: PaymentMode;
}

// Все проверки обязательны (BOOKING_AND_PAYMENT_FLOW.md §5): платёж создан нами для этого заказа,
// на ту же сумму и валюту, в режиме этого окружения.
export const findPaymentMismatch = (expected: ExpectedPayment, remote: RemotePayment): PaymentMismatch | null => {
    const { source, orderId } = remote.metadata;
    if (source !== TICKETING_PAYMENT_SOURCE || orderId !== expected.orderId) return 'METADATA_MISMATCH';
    if (remote.amountCents !== expected.amountCents) return 'AMOUNT_MISMATCH';
    if (remote.currency !== expected.currency) return 'CURRENCY_MISMATCH';
    return remote.mode === expected.mode ? null : 'MODE_MISMATCH';
};

const TERMINAL_FAILURE_STATUSES = ['expired', 'canceled', 'failed'];

export const isTerminalPaymentFailure = (status: string): boolean => TERMINAL_FAILURE_STATUSES.includes(status);

// Оплата истёкшего заказа может вернуть его места, если они ещё свободны.
export const decideOrderAction = (orderStatus: string, remote: RemotePayment, mismatch: PaymentMismatch | null): OrderAction => {
    if (orderStatus === 'NEEDS_REVIEW') return { kind: 'NONE' };
    if (remote.status === 'charged_back' || remote.chargedBackCents > 0) {
        return { kind: 'REVIEW', reason: mismatch ?? 'CHARGEBACK' };
    }
    if (remote.status !== 'paid') return { kind: 'NONE' };
    if (mismatch) return { kind: 'REVIEW', reason: mismatch };
    if (orderStatus === 'PENDING_PAYMENT') return { kind: 'CONFIRM' };
    if (orderStatus === 'EXPIRED') return { kind: 'RECLAIM' };
    return orderStatus === 'CANCELLED' ? { kind: 'REVIEW', reason: 'LATE_PAYMENT' } : { kind: 'NONE' };
};

export const buildPaymentDescription = (orderNumber: string, eventTitle: string): string => (
    `${eventTitle} — ${orderNumber}`.slice(0, 255)
);

// В адресе возврата только номер заказа: токен доступа остаётся в браузере покупателя.
export const buildReturnUrl = (returnUrl: string, orderNumber: string): string => {
    const url = new URL(returnUrl);
    url.searchParams.set('order', orderNumber);
    return url.toString();
};

const MOLLIE_PAYMENT_ID_PATTERN = /^tr_[A-Za-z0-9]{4,60}$/;

export const isMolliePaymentId = (value: unknown): value is string => (
    typeof value === 'string' && MOLLIE_PAYMENT_ID_PATTERN.test(value)
);
