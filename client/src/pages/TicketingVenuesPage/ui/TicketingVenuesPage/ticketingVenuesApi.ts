import type { SeatCanvasSize, SeatCategory, SeatPosition } from '@/entities/TicketSeatMap';
import { $apiPrivate } from '@/shared/api/api';

export type SeatMapStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface SeatMapSummary {
    id: number;
    version: number;
    status: SeatMapStatus;
    name: string;
    publishedAt: string | null;
    _count: { seats: number };
}

export interface Venue {
    id: number;
    name: string;
    address: string | null;
    city: string | null;
    isActive: boolean;
    seatMaps: SeatMapSummary[];
}

export interface SeatMapDetail {
    id: number;
    venueId: number;
    version: number;
    status: SeatMapStatus;
    name: string;
    canvas: SeatCanvasSize | null;
    publishedAt: string | null;
    categories: SeatCategory[];
    seats: SeatPosition[];
}

export interface SeatBlock {
    categoryName: string;
    rows: number;
    seatsPerRow: number;
}

export interface NewVenue {
    name: string;
    address?: string;
    city?: string;
}

export interface NewSeatMap {
    name: string;
    blocks: SeatBlock[];
}

const BASE = '/ticketing/admin';

export const fetchVenues = async () => {
    const { data } = await $apiPrivate.get<{ items: Venue[] }>(`${BASE}/venues`);
    return data.items;
};

export const postVenue = async (venue: NewVenue) => {
    await $apiPrivate.post(`${BASE}/venues`, venue);
};

export const postSeatMap = async (venueId: number, seatMap: NewSeatMap) => {
    const { data } = await $apiPrivate.post<SeatMapDetail>(`${BASE}/venues/${venueId}/seat-maps`, seatMap);
    return data;
};

export const fetchSeatMap = async (seatMapId: number) => {
    const { data } = await $apiPrivate.get<SeatMapDetail>(`${BASE}/seat-maps/${seatMapId}`);
    return data;
};

export const postPublishSeatMap = async (seatMapId: number) => {
    const { data } = await $apiPrivate.post<SeatMapDetail>(`${BASE}/seat-maps/${seatMapId}/publish`);
    return data;
};
