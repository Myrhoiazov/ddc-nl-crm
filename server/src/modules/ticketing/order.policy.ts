import type { OrderSettings } from './order.types';

// Чистые правила заказа: без I/O.

export const DEFAULT_ORDER_SETTINGS: OrderSettings = {
    feeCents: 0,
    paymentWindowSeconds: 20 * 60,
    termsVersion: '1',
    paymentMode: 'TEST',
};

export const resolveOrderSettings = (overrides: Partial<OrderSettings> = {}): OrderSettings => (
    { ...DEFAULT_ORDER_SETTINGS, ...overrides }
);

// Crockford base32 без I, L, O, U: номер диктуют по телефону и вводят вручную.
const NUMBER_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const ORDER_NUMBER_RANDOM_BYTES = 8;

// Номер случайный, а не порядковый: по нему нельзя оценить объём продаж или угадать соседний заказ.
export const formatOrderNumber = (random: Uint8Array): string => {
    const symbols = Array.from(random.slice(0, ORDER_NUMBER_RANDOM_BYTES), (byte) => NUMBER_ALPHABET[byte % 32]);
    return `T-${symbols.join('')}`;
};

export interface OrderTotals {
    subtotalCents: number;
    feeCents: number;
    totalCents: number;
}

// Сумма считается только на сервере из цен инвентаря — клиентская сумма не принимается вовсе.
export const computeOrderTotals = (priceCents: number[], feeCents: number): OrderTotals => {
    const subtotalCents = priceCents.reduce((total, price) => total + price, 0);
    return { subtotalCents, feeCents, totalCents: subtotalCents + feeCents };
};

export const computePaymentDeadline = (now: Date, paymentWindowSeconds: number): Date => (
    new Date(now.getTime() + paymentWindowSeconds * 1000)
);

export interface EventSnapshotSource {
    startsAt: Date;
    doorsAt: Date | null;
    event: { title: string };
    seatMap: { name: string; venue: { name: string; address: string | null; city: string | null } };
}

// Снимок делает заказ и билет самодостаточными: правка события или зала их не меняет.
export const buildEventSnapshot = (session: EventSnapshotSource) => ({
    eventTitle: session.event.title,
    startsAt: session.startsAt.toISOString(),
    doorsAt: session.doorsAt ? session.doorsAt.toISOString() : null,
    venueName: session.seatMap.venue.name,
    venueAddress: session.seatMap.venue.address,
    venueCity: session.seatMap.venue.city,
    seatMapName: session.seatMap.name,
});
