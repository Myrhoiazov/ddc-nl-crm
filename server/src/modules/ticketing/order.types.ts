import type { PrismaClient } from '@prisma/client';

// Публичный контракт заказов Ticketing: от удержанных мест до заказа, ожидающего оплаты.

export type OrderLocale = 'nl' | 'en' | 'ru';

export interface OrderBuyer {
    name: string;
    email: string;
    phone?: string;
    locale: OrderLocale;
}

export interface CreateOrderInput {
    holdToken: string;
    buyer: OrderBuyer;
}

export interface OrderSettings {
    // Сервисный сбор за заказ; 0, пока владелец не утвердил иное.
    feeCents: number;
    // Окно оплаты от создания заказа (BOOKING_AND_PAYMENT_FLOW.md §4).
    paymentWindowSeconds: number;
    termsVersion: string;
    paymentMode: 'TEST' | 'LIVE';
}

export interface OrderItemSummary {
    seatId: number;
    sectionLabel: string;
    rowLabel: string;
    seatLabel: string;
    categoryName: string;
    priceCents: number;
}

export interface OrderSummary {
    id: number;
    number: string;
    status: string;
    subtotalCents: number;
    feeCents: number;
    totalCents: number;
    currency: string;
    paymentDeadlineAt: Date;
    items: OrderItemSummary[];
    payment: { id: number; idempotencyKey: string; status: string; checkoutUrl: string | null } | null;
}

export type OrderRejectionReason = 'HOLD_NOT_FOUND' | 'HOLD_NOT_ACTIVE' | 'SALES_CLOSED';

export type CreateOrderResult =
    // existing — повтор checkout для того же hold: возвращается тот же заказ и тот же токен.
    | { kind: 'created' | 'existing'; order: OrderSummary; accessToken: string }
    | { kind: 'rejected'; reason: OrderRejectionReason };

export interface OrderServiceDeps {
    prisma: PrismaClient;
    tokenSecret: string;
    settings?: Partial<OrderSettings>;
    now?: () => Date;
    sleep?: (ms: number) => Promise<void>;
}
