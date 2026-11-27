import type { OrderRejectionReason, OrderSummary } from './order.types';
import type { HoldRejectionReason, TicketingSessionStatus } from './ticketing.types';
import { isSalesOpen } from './hold.policy';

// Чистые правила публичного API: что видит покупатель и какими кодами отвечает сервер.

// Покупателю не нужно знать, удержано место, продано или закрыто организатором.
export type PublicSeatStatus = 'AVAILABLE' | 'TAKEN';

export const toPublicSeatStatus = (status?: string): PublicSeatStatus => (
    status === 'AVAILABLE' ? 'AVAILABLE' : 'TAKEN'
);

// Черновик и отменённый сеанс наружу не отдаются вовсе.
const HIDDEN_STATUSES: TicketingSessionStatus[] = ['DRAFT', 'CANCELLED'];

export const isSessionPublic = (status: TicketingSessionStatus): boolean => !HIDDEN_STATUSES.includes(status);

export interface PublicSessionSource {
    id: number;
    status: TicketingSessionStatus;
    startsAt: Date;
    doorsAt: Date | null;
    salesStartAt: Date | null;
    salesEndAt: Date | null;
    holdTtlSeconds: number;
    maxSeatsPerOrder: number;
    currency: string;
    event: { title: string; description: string | null };
    prices: { categoryId: number; priceCents: number }[];
    seats: { seatId: number; status: string }[];
    seatMap: {
        name: string;
        canvas: unknown;
        venue: { name: string; address: string | null; city: string | null };
        categories: { id: number; name: string; colorSlot: number }[];
        seats: { id: number; categoryId: number; sectionLabel: string; rowLabel: string; seatLabel: string; x: number; y: number }[];
    };
}

const buildCategories = (source: PublicSessionSource) => {
    const priceByCategory = new Map(source.prices.map((price) => [price.categoryId, price.priceCents]));
    return source.seatMap.categories.map((category) => ({ ...category, priceCents: priceByCategory.get(category.id) ?? null }));
};

// Место без строки инвентаря (сеанс ещё не опубликован) считается занятым.
const buildSeats = (source: PublicSessionSource) => {
    const statusBySeat = new Map(source.seats.map((seat) => [seat.seatId, seat.status]));
    return source.seatMap.seats.map((seat) => ({ ...seat, status: toPublicSeatStatus(statusBySeat.get(seat.id)) }));
};

export const buildPublicSession = (source: PublicSessionSource, now: Date) => ({
    id: source.id,
    eventTitle: source.event.title,
    eventDescription: source.event.description,
    startsAt: source.startsAt,
    doorsAt: source.doorsAt,
    venue: source.seatMap.venue,
    salesOpen: isSalesOpen(source, now),
    currency: source.currency,
    maxSeatsPerOrder: source.maxSeatsPerOrder,
    holdTtlSeconds: source.holdTtlSeconds,
    canvas: source.seatMap.canvas,
    categories: buildCategories(source),
    seats: buildSeats(source),
});

// Ссылку на оплату нельзя показывать после окна оплаты: Mollie не пустит
// покупателя по просроченной ссылке.
const visibleCheckoutUrl = (order: OrderSummary, now: Date): string | null => (
    order.status === 'PENDING_PAYMENT' && order.paymentDeadlineAt > now ? order.payment?.checkoutUrl ?? null : null
);

// Наружу не уходят внутренний id заказа и ключ идемпотентности платежа.
export const toPublicOrder = (order: OrderSummary, now: Date = new Date()) => ({
    number: order.number,
    status: order.status,
    subtotalCents: order.subtotalCents,
    feeCents: order.feeCents,
    totalCents: order.totalCents,
    currency: order.currency,
    paymentDeadlineAt: order.paymentDeadlineAt,
    checkoutUrl: visibleCheckoutUrl(order, now),
    items: order.items,
});

export const HOLD_REJECTION_STATUS: Record<HoldRejectionReason, number> = {
    SESSION_NOT_FOUND: 404,
    SALES_CLOSED: 409,
    INVALID_SEATS: 400,
    TOO_MANY_SEATS: 400,
    INVALID_REQUEST_KEY: 400,
    REQUEST_KEY_REUSED: 409,
};

export const ORDER_REJECTION_STATUS: Record<OrderRejectionReason, number> = {
    HOLD_NOT_FOUND: 404,
    // 410: удержание было, но истекло или отменено — места нужно выбрать заново.
    HOLD_NOT_ACTIVE: 410,
    SALES_CLOSED: 409,
};
