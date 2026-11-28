import type { Request, Response } from 'express';
import prisma from '../../../prisma/prisma-client';
import { isCaptchaConfigured, verifyCaptchaToken } from '../auth/auth.captcha.service';
import { createPrismaHoldRepository } from './hold.repository';
import { createHold, releaseHold } from './hold.service';
import { checkoutSchema, type CheckoutInput } from './order.schema';
import { createOrder, getOrderByAccessToken } from './order.service';
import type { OrderServiceDeps } from './order.types';
import { getTicketPaymentGateway } from './payment.mollie-gateway';
import { startPayment } from './payment.service';
import { HOLD_REJECTION_STATUS, ORDER_REJECTION_STATUS, toPublicOrder } from './public.policy';
import {
    captchaTokenSchema,
    createHoldSchema,
    releaseHoldSchema,
    type CreateHoldBody,
    type ReleaseHoldBody,
} from './public.schema';
import { getPublicSession } from './public.service';
import { createTicketPdf } from './ticket.pdf.service';
import { getPaidTicketBundle } from './ticket.service';
import { readPaymentConfig, readTicketTokenConfig, readTicketingConfig } from './ticketing.config';
import type { HoldServiceDeps } from './ticketing.types';
import { parsePositiveId } from './venue.schema';

// Публичный API витрины. Учётной записи и cookie нет: доступ дают opaque-токены hold и заказа,
// которые передаются в теле или заголовке, но не в URL (URL попадает в журналы).

export const ORDER_TOKEN_HEADER = 'x-ticketing-order-token';

// requirePublicSales уже проверил, что секрет задан.
const tokenSecret = () => readTicketingConfig().tokenSecret ?? '';

const holdDeps = (): HoldServiceDeps => ({ repository: createPrismaHoldRepository(prisma), tokenSecret: tokenSecret() });

const orderDeps = (): OrderServiceDeps => ({
    prisma,
    tokenSecret: tokenSecret(),
    settings: readTicketingConfig().orderSettings,
});

const invalidBody = (res: Response, details?: unknown) => res.status(400).json({ message: 'Invalid request', details });

export const getPublicSessionController = async (req: Request, res: Response) => {
    const sessionId = parsePositiveId(req.params.sessionId);
    const session = sessionId ? await getPublicSession(prisma, sessionId, new Date()) : null;
    return session ? res.json(session) : res.status(404).json({ message: 'Session not found' });
};

export const createHoldController = async (req: Request, res: Response) => {
    const sessionId = parsePositiveId(req.params.sessionId);
    const parsed = createHoldSchema.safeParse(req.body);
    if (!sessionId || !parsed.success) return invalidBody(res, parsed.success ? undefined : parsed.error.flatten());

    const result = await createHold(holdDeps(), { ...(parsed.data as CreateHoldBody), sessionId, clientIp: req.ip });
    if (result.kind === 'rejected') {
        return res.status(HOLD_REJECTION_STATUS[result.reason]).json({ message: 'Hold rejected', reason: result.reason });
    }
    if (result.kind === 'unavailable') {
        return res.status(409).json({ message: 'Seats are not available', unavailableSeatIds: result.unavailableSeatIds });
    }
    return res.status(201).json({ holdToken: result.holdToken, expiresAt: result.expiresAt, seatIds: result.seatIds });
};

// Повторный отказ безвреден: ответ одинаков, существовал hold или нет.
export const releaseHoldController = async (req: Request, res: Response) => {
    const parsed = releaseHoldSchema.safeParse(req.body);
    if (!parsed.success) return invalidBody(res);

    await releaseHold(holdDeps(), (parsed.data as ReleaseHoldBody).holdToken);
    return res.status(204).end();
};

// Captcha обязательна, когда Turnstile настроен; без настройки (разработка) шаг пропускается.
const passesCaptcha = async (req: Request, captchaToken: unknown): Promise<boolean> => {
    if (!isCaptchaConfigured()) return true;
    const parsed = captchaTokenSchema.safeParse(captchaToken);
    return parsed.success && verifyCaptchaToken(parsed.data, req.ip);
};

export const checkoutController = async (req: Request, res: Response) => {
    const { captchaToken, ...body } = (req.body ?? {}) as Record<string, unknown>;
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return invalidBody(res, parsed.error.flatten());
    if (!(await passesCaptcha(req, captchaToken))) return res.status(403).json({ message: 'Captcha check failed' });

    const config = readPaymentConfig();
    if (!config) return res.status(503).json({ message: 'Ticket payments are not available' });

    const { holdToken, buyer } = parsed.data as CheckoutInput;
    const deps = orderDeps();
    const settings = { ...deps.settings, paymentMode: config.mode };
    const result = await createOrder({ ...deps, settings }, { holdToken, buyer });
    if (result.kind === 'rejected') {
        return res.status(ORDER_REJECTION_STATUS[result.reason]).json({ message: 'Checkout rejected', reason: result.reason });
    }
    const status = result.kind === 'created' ? 201 : 200;
    const checkoutUrl = await startPayment({
        prisma, gateway: getTicketPaymentGateway(), config, ticketTokens: readTicketTokenConfig(),
    }, result.order.id);
    return res.status(status).json({ order: { ...toPublicOrder(result.order), checkoutUrl }, orderToken: result.accessToken });
};

export const getOrderController = async (req: Request, res: Response) => {
    const token = req.header(ORDER_TOKEN_HEADER)?.trim();
    const order = token ? await getOrderByAccessToken(orderDeps(), token) : null;
    return order ? res.json({ order: toPublicOrder(order) }) : res.status(404).json({ message: 'Order not found' });
};

const ticketBundleForRequest = (req: Request) => {
    const token = req.header(ORDER_TOKEN_HEADER)?.trim();
    return token ? getPaidTicketBundle({ prisma, tokens: readTicketTokenConfig() }, token) : null;
};

// Один ответ на все случаи отсутствия билетов: неизвестный токен, другой заказ, статус не PAID
// и несовпадение секрета не различаются для наружного наблюдателя.
export const getOrderTicketsController = async (req: Request, res: Response) => {
    const bundle = await ticketBundleForRequest(req);
    return bundle ? res.json(bundle) : res.status(404).json({ message: 'Order not found' });
};

export const getOrderTicketsPdfController = async (req: Request, res: Response) => {
    const bundle = await ticketBundleForRequest(req);
    if (!bundle) return res.status(404).json({ message: 'Order not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="tickets-${bundle.orderNumber}.pdf"`);
    const document = await createTicketPdf(bundle);
    document.pipe(res);
    document.end();
};
