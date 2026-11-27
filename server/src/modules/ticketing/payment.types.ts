import type { PrismaClient } from '@prisma/client';
import type { TicketTokenConfig } from './ticket.types';

// Контракт платежей Ticketing. Сервис зависит от шлюза, а не от SDK Mollie: проверки суммы,
// режима и переходы заказа тестируются без сети.

export type PaymentMode = 'TEST' | 'LIVE';

// Платёж в том виде, в каком его только что вернул платёжный провайдер.
export interface RemotePayment {
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    mode: PaymentMode;
    checkoutUrl: string | null;
    isCancelable?: boolean;
    expiresAt: Date | null;
    paidAt: Date | null;
    method: string | null;
    refundedCents: number;
    chargedBackCents: number;
    metadata: { source?: string; orderId?: number };
}

export interface CreateRemotePaymentParams {
    mode: PaymentMode;
    orderId: number;
    orderNumber: string;
    amountCents: number;
    currency: string;
    description: string;
    locale: string;
    redirectUrl: string;
    webhookUrl: string;
    idempotencyKey: string;
}

export interface TicketPaymentGateway {
    createPayment(params: CreateRemotePaymentParams): Promise<RemotePayment>;
    getPayment(molliePaymentId: string, mode: PaymentMode): Promise<RemotePayment>;
    cancelPayment?(molliePaymentId: string, mode: PaymentMode): Promise<RemotePayment>;
}

export interface PaymentConfig {
    // Страница витрины, на которую Mollie возвращает покупателя.
    returnUrl: string;
    webhookUrl: string;
    // Режим, в котором обязано работать это окружение; платёж другого режима не подтверждает заказ.
    mode: PaymentMode;
}

export interface PaymentServiceDeps {
    prisma: PrismaClient;
    gateway: TicketPaymentGateway;
    config: PaymentConfig;
    ticketTokens: TicketTokenConfig | null;
    now?: () => Date;
    sleep?: (ms: number) => Promise<void>;
}

export type PaymentSignalSource = 'WEBHOOK' | 'RECONCILE' | 'RETURN';

export type PaymentMismatch = 'METADATA_MISMATCH' | 'AMOUNT_MISMATCH' | 'CURRENCY_MISMATCH' | 'MODE_MISMATCH';

export type OrderAction =
    | { kind: 'NONE' }
    | { kind: 'CONFIRM' }
    | { kind: 'RECLAIM' }
    | { kind: 'REVIEW'; reason: PaymentMismatch | 'LATE_PAYMENT' | 'CHARGEBACK' | 'TICKET_CONFIG_MISSING' };

// Итог обработки сигнала о платеже — пишется в журнал ticket_payment_events.
export type PaymentSignalOutcome = 'CONFIRMED' | 'NEEDS_REVIEW' | 'NO_CHANGE' | 'UNKNOWN_PAYMENT';
