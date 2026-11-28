import { Prisma, TicketOrderStatus, TicketStatus } from '@prisma/client';
import { z } from 'zod';
import { hashTicketingToken } from './hold-token';
import { restoreTicketToken } from './ticket.policy';
import type { PublicTicket, PublicTicketSeat, TicketBundle, TicketEvent, TicketServiceDeps } from './ticket.types';

// Чтение билетов оплаченного заказа по токену покупателя. Токен билета выводится из
// сохранённых nonce/версии и сверяется с codeHash; при несовпадении заказ недоступен.

interface StoredTicket {
    codeHash: string;
    orderItemId: number;
    tokenNonce: string;
    tokenVersion: number;
    status: TicketStatus;
    issuedAt: Date;
    orderItem: PublicTicketSeat;
}

const storedTicketSelect = {
    codeHash: true,
    orderItemId: true,
    tokenNonce: true,
    tokenVersion: true,
    status: true,
    issuedAt: true,
    orderItem: {
        select: { sectionLabel: true, rowLabel: true, seatLabel: true, categoryName: true, priceCents: true },
    },
} as const;

const snapshotSchema = z.object({
    eventTitle: z.string(),
    startsAt: z.string(),
    doorsAt: z.string().nullish(),
    venueName: z.string(),
    venueAddress: z.string().nullish(),
    venueCity: z.string().nullish(),
    seatMapName: z.string(),
});

const toTicketEvent = (snapshot: Prisma.JsonValue): TicketEvent | null => {
    const parsed = snapshotSchema.safeParse(snapshot);
    if (!parsed.success) return null;
    return {
        title: parsed.data.eventTitle,
        startsAt: parsed.data.startsAt,
        doorsAt: parsed.data.doorsAt ?? null,
        venueName: parsed.data.venueName,
        venueAddress: parsed.data.venueAddress ?? null,
        venueCity: parsed.data.venueCity ?? null,
        seatMapName: parsed.data.seatMapName,
    };
};

const restorePublicTicket = (secret: string, stored: StoredTicket): PublicTicket | null => {
    const token = restoreTicketToken(secret, {
        id: stored.orderItemId,
        nonce: stored.tokenNonce,
        version: stored.tokenVersion,
        codeHash: stored.codeHash,
    });
    return token ? { token, status: stored.status, issuedAt: stored.issuedAt, seat: stored.orderItem } : null;
};

// Один испорченный билет делает недоступным весь комплект: покупатель не должен получить
// частично подписанные билеты после ротации секрета.
const restoreTickets = (secret: string, stored: StoredTicket[]): PublicTicket[] | null => {
    if (!stored.length) return null;
    const tickets: PublicTicket[] = [];
    for (const ticket of stored) {
        const restored = restorePublicTicket(secret, ticket);
        if (!restored) return null;
        tickets.push(restored);
    }
    return tickets;
};

interface PaidOrderForBundle {
    number: string;
    status: TicketOrderStatus;
    eventSnapshot: Prisma.JsonValue;
    items: { ticket: StoredTicket | null }[];
}

const toPaidTicketBundle = (order: PaidOrderForBundle | null, secret: string): TicketBundle | null => {
    if (!order || order.status !== TicketOrderStatus.PAID) return null;

    const event = toTicketEvent(order.eventSnapshot);
    if (!event) return null;

    const stored = order.items.flatMap((item) => (item.ticket ? [item.ticket] : []));
    const tickets = restoreTickets(secret, stored);
    return tickets ? { orderNumber: order.number, event, tickets } : null;
};

const loadPaidTicketBundle = async (
    deps: TicketServiceDeps,
    where: Prisma.TicketOrderWhereUniqueInput,
): Promise<TicketBundle | null> => {
    if (!deps.tokens) return null;
    const order = await deps.prisma.ticketOrder.findUnique({
        where,
        select: {
            number: true,
            status: true,
            eventSnapshot: true,
            items: {
                where: { ticket: { isNot: null } },
                orderBy: { seatId: 'asc' },
                select: { ticket: { select: storedTicketSelect } },
            },
        },
    });
    return toPaidTicketBundle(order as PaidOrderForBundle | null, deps.tokens.secret);
};

export const getPaidTicketBundle = (deps: TicketServiceDeps, accessToken: string): Promise<TicketBundle | null> => (
    loadPaidTicketBundle(deps, { accessTokenHash: hashTicketingToken(accessToken) })
);

// Внутренний путь для воркера доставки: заказ уже известен по id, токен покупателя не нужен.
export const getPaidTicketBundleByOrderId = (
    deps: TicketServiceDeps,
    orderId: number,
): Promise<TicketBundle | null> => loadPaidTicketBundle(deps, { id: orderId });
