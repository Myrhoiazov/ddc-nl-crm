import { z } from 'zod';

const holdToken = z.string().min(20).max(200);

export const createHoldSchema = z.object({
    seatIds: z.array(z.number().int().positive()).min(1).max(50),
    requestKey: z.string().min(22).max(128).optional(),
}).strict();

export const releaseHoldSchema = z.object({ holdToken }).strict();

// Тело checkout проверяется checkoutSchema; captchaToken снимается до неё.
export const captchaTokenSchema = z.string().min(1).max(4096);

// Типы объявлены явно: без strictNullChecks z.infer делает все поля необязательными.
export interface CreateHoldBody {
    seatIds: number[];
    requestKey?: string;
}

export interface ReleaseHoldBody {
    holdToken: string;
}
