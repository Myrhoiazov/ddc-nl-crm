import type { PrismaClient, TicketStatus } from '@prisma/client';

// Конфигурация подписи билетов. Секрет приходит только из окружения; version позволяет
// хранить билеты, выданные разными ключами, без перевыпуска при ротации.

export interface TicketTokenConfig {
    secret: string;
    version: number;
}

// Публичный контракт билетов: только токен, статус и подписи мест. Никаких внутренних id,
// хешей и коротких кодов наружу не уходит.

export interface PublicTicketSeat {
    sectionLabel: string;
    rowLabel: string;
    seatLabel: string;
    categoryName: string;
    priceCents: number;
}

export interface PublicTicket {
    token: string;
    status: TicketStatus;
    issuedAt: Date;
    seat: PublicTicketSeat;
}

export interface TicketEvent {
    title: string;
    startsAt: string;
    doorsAt: string | null;
    venueName: string;
    venueAddress: string | null;
    venueCity: string | null;
    seatMapName: string;
}

export interface TicketBundle {
    orderNumber: string;
    event: TicketEvent;
    tickets: PublicTicket[];
}

export interface TicketServiceDeps {
    prisma: PrismaClient;
    tokens: TicketTokenConfig | null;
}
