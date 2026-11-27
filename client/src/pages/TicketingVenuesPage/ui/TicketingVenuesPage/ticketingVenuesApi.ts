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

export interface SeatCategory {
    id: number;
    code: string;
    name: string;
    colorSlot: number;
}

export interface Seat {
    id: number;
    categoryId: number;
    rowLabel: string;
    seatLabel: string;
    x: number;
    y: number;
    isDefaultBlocked: boolean;
}

export interface SeatMapDetail {
    id: number;
    venueId: number;
    version: number;
    status: SeatMapStatus;
    name: string;
    canvas: { width: number; height: number; seatSize: number } | null;
    publishedAt: string | null;
    categories: SeatCategory[];
    seats: Seat[];
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
