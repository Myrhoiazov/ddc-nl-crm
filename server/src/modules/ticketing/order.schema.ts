import { z } from 'zod';
import type { OrderBuyer } from './order.types';

const buyerSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(190),
    phone: z.string().trim().min(5).max(32).optional(),
    locale: z.enum(['nl', 'en', 'ru']).default('nl'),
}).strict();

// Суммы, цены и места в запросе не принимаются: заказ собирается из hold на сервере.
export const checkoutSchema = z.object({
    holdToken: z.string().min(20).max(200),
    buyer: buyerSchema,
    // Согласие с условиями обязательно и должно быть явным.
    acceptTerms: z.literal(true),
}).strict();

// Тип объявлен явно: без strictNullChecks z.infer делает все поля необязательными.
export interface CheckoutInput {
    holdToken: string;
    buyer: OrderBuyer;
    acceptTerms: true;
}
