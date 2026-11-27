import type { SeatCanvasSize, SeatCategory, SeatPosition, SeatState } from '@/entities/TicketSeatMap';
import { $apiPrivate } from '@/shared/api/api';

export type SessionStatus = 'DRAFT' | 'ON_SALE' | 'PAUSED' | 'CLOSED' | 'CANCELLED';
export type ManualSessionStatus = 'ON_SALE' | 'PAUSED' | 'CLOSED';

export interface SessionSummary {
    id: number;
    startsAt: string;
    status: SessionStatus;
    currency: string;
    seatMap: { id: number; name: string; version: number; venue: { name: string } };
    seatCounts: Partial<Record<SeatState, number>>;
}

export interface TicketEvent {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    sessions: SessionSummary[];
}

export interface SessionDetail {
    id: number;
    startsAt: string;
    status: SessionStatus;
    currency: string;
    event: { id: number; title: string };
    prices: { categoryId: number; priceCents: number }[];
    seats: { seatId: number; status: SeatState; priceCents: number }[];
    seatMap: {
        id: number;
        name: string;
        version: number;
        canvas: SeatCanvasSize | null;
        categories: SeatCategory[];
        seats: SeatPosition[];
    };
}

export interface SeatMapOption {
    id: number;
    label: string;
}

export interface NewSession {
    seatMapId: number;
    startsAt: string;
    prices: { categoryId: number; priceCents: number }[];
}

interface VenueWithSeatMaps {
    name: string;
    seatMaps: { id: number; name: string; version: number; status: string }[];
}

const BASE = '/ticketing/admin';

export const fetchEvents = async () => {
    const { data } = await $apiPrivate.get<{ items: TicketEvent[] }>(`${BASE}/events`);
    return data.items;
};

// Сеанс можно создать только на опубликованной схеме, поэтому черновики в список не попадают.
export const fetchPublishedSeatMaps = async (): Promise<SeatMapOption[]> => {
    const { data } = await $apiPrivate.get<{ items: VenueWithSeatMaps[] }>(`${BASE}/venues`);
    return data.items.flatMap((venue) => venue.seatMaps
        .filter((seatMap) => seatMap.status === 'PUBLISHED')
        .map((seatMap) => ({ id: seatMap.id, label: `${venue.name} — ${seatMap.name} (v${seatMap.version})` })));
};

export const fetchSeatMapCategories = async (seatMapId: number) => {
    const { data } = await $apiPrivate.get<{ categories: SeatCategory[] }>(`${BASE}/seat-maps/${seatMapId}`);
    return data.categories;
};

export const postEvent = async (title: string) => {
    await $apiPrivate.post(`${BASE}/events`, { title });
};

export const postSession = async (eventId: number, session: NewSession) => {
    const { data } = await $apiPrivate.post<SessionDetail>(`${BASE}/events/${eventId}/sessions`, session);
    return data;
};

export const fetchSession = async (sessionId: number) => {
    const { data } = await $apiPrivate.get<SessionDetail>(`${BASE}/sessions/${sessionId}`);
    return data;
};

export const postPublishSession = async (sessionId: number) => {
    const { data } = await $apiPrivate.post<SessionDetail>(`${BASE}/sessions/${sessionId}/publish`);
    return data;
};

export const postSessionStatus = async (sessionId: number, status: ManualSessionStatus) => {
    const { data } = await $apiPrivate.post<SessionDetail>(`${BASE}/sessions/${sessionId}/status`, { status });
    return data;
};
