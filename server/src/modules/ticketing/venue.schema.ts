import { z } from 'zod';
import { countSeats, MAX_SEATS_PER_MAP, type SeatBlockInput } from './seat-map.generator';

const trimmedText = (max: number) => z.string().trim().min(1).max(max);

export const createVenueSchema = z.object({
    name: trimmedText(120),
    address: z.string().trim().max(250).optional(),
    city: z.string().trim().max(120).optional(),
}).strict();

const seatBlockSchema = z.object({
    categoryName: trimmedText(60),
    rows: z.number().int().min(1).max(100),
    seatsPerRow: z.number().int().min(1).max(100),
}).strict();

export const createSeatMapSchema = z.object({
    name: trimmedText(120),
    blocks: z.array(seatBlockSchema).min(1).max(8),
}).strict().refine((value) => countSeats(value.blocks as SeatBlockInput[]) <= MAX_SEATS_PER_MAP, {
    message: `A seat map cannot have more than ${MAX_SEATS_PER_MAP} seats`,
    path: ['blocks'],
});

// Типы объявлены явно: серверный tsconfig без strictNullChecks, и z.infer делает все поля
// необязательными. Схемы выше гарантируют эти формы после safeParse.
export interface CreateVenueInput {
    name: string;
    address?: string;
    city?: string;
}

export interface CreateSeatMapInput {
    name: string;
    blocks: SeatBlockInput[];
}

export const parsePositiveId = (raw: unknown): number | null => {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
};
