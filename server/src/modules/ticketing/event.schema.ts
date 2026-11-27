import { z } from 'zod';

const trimmedText = (max: number) => z.string().trim().min(1).max(max);
const isoDate = z.string().datetime({ offset: true });

const MAX_PRICE_CENTS = 1_000_000;

export const createEventSchema = z.object({
    title: trimmedText(160),
    description: z.string().trim().max(5000).optional(),
}).strict();

const sessionPriceSchema = z.object({
    categoryId: z.number().int().positive(),
    priceCents: z.number().int().min(0).max(MAX_PRICE_CENTS),
}).strict();

export const createSessionSchema = z.object({
    seatMapId: z.number().int().positive(),
    startsAt: isoDate,
    salesStartAt: isoDate.optional(),
    salesEndAt: isoDate.optional(),
    maxSeatsPerOrder: z.number().int().min(1).max(20).optional(),
    holdTtlSeconds: z.number().int().min(60).max(3600).optional(),
    prices: z.array(sessionPriceSchema).min(1).max(8),
}).strict();

export const sessionStatusSchema = z.object({
    status: z.enum(['ON_SALE', 'PAUSED', 'CLOSED']),
}).strict();

// Типы объявлены явно: без strictNullChecks z.infer делает все поля необязательными.
export interface CreateEventInput {
    title: string;
    description?: string;
}

export interface SessionPriceInput {
    categoryId: number;
    priceCents: number;
}

export interface CreateSessionInput {
    seatMapId: number;
    startsAt: string;
    salesStartAt?: string;
    salesEndAt?: string;
    maxSeatsPerOrder?: number;
    holdTtlSeconds?: number;
    prices: SessionPriceInput[];
}

export type ManualSessionStatus = 'ON_SALE' | 'PAUSED' | 'CLOSED';
