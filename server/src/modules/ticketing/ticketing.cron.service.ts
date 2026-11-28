import cron from 'node-cron';
import prisma from '../../../prisma/prisma-client';
import { logger } from '../../common/logger';
import { createPrismaHoldRepository } from './hold.repository';
import { expireDueHolds } from './hold.service';
import { expireDueOrders, reconcileTicketPayments } from './payment-jobs.service';
import { getTicketPaymentGateway } from './payment.mollie-gateway';
import type { PaymentServiceDeps } from './payment.types';
import { processTicketDeliveries } from './ticket-delivery.service';
import { createTicketSmtpMailer } from './ticket-smtp.mailer';
import { isTicketEmailEnabled, readPaymentConfig, readTicketSmtpConfig, readTicketTokenConfig } from './ticketing.config';

type Env = Record<string, string | undefined>;
type PaymentJob = (deps: PaymentServiceDeps, cursor: number) => Promise<{ nextCursor: number }>;

const EVERY_MINUTE = '* * * * *';
const EVERY_FIVE_MINUTES = '*/5 * * * *';

const scheduleJob = (name: string, expression: string, run: () => Promise<void>) => {
    cron.schedule(expression, async () => {
        try {
            await run();
        } catch (error) {
            logger.error(`[${name}] Job failed: ${error instanceof Error ? error.name : 'Unknown error'}`);
        }
    }, { name, noOverlap: true });
};

const startHoldExpiry = () => {
    const repository = createPrismaHoldRepository(prisma);
    scheduleJob('ticketing-hold-expiry', EVERY_MINUTE, async () => {
        await expireDueHolds({ repository });
    });
};

const schedulePaymentJob = (
    deps: PaymentServiceDeps, name: string, expression: string, run: PaymentJob,
) => {
    let cursor = 0;
    scheduleJob(name, expression, async () => {
        const result = await run(deps, cursor);
        cursor = result.nextCursor;
    });
};

const startPaymentJobs = (env: Env) => {
    const expiryEnabled = env.TICKETING_ORDER_EXPIRY_ENABLED === 'true';
    const reconciliationEnabled = env.TICKETING_PAYMENT_RECONCILIATION_ENABLED === 'true';
    if (!expiryEnabled && !reconciliationEnabled) return;

    const config = readPaymentConfig(env);
    if (!config) {
        logger.warn('[Ticketing] Payment jobs require Ticketing payment configuration');
        return;
    }

    const deps = { prisma, config, gateway: getTicketPaymentGateway(), ticketTokens: readTicketTokenConfig(env) };
    if (expiryEnabled) schedulePaymentJob(deps, 'ticketing-order-expiry', EVERY_MINUTE, expireDueOrders);
    if (reconciliationEnabled) {
        schedulePaymentJob(deps, 'ticketing-payment-reconciliation', EVERY_FIVE_MINUTES, reconcileTicketPayments);
    }
};

const startTicketDelivery = (env: Env) => {
    if (!isTicketEmailEnabled(env)) return;

    const smtp = readTicketSmtpConfig(env);
    const mailer = smtp ? createTicketSmtpMailer(smtp) : null;
    scheduleJob('ticketing-ticket-delivery', EVERY_MINUTE, async () => {
        await processTicketDeliveries({
            prisma, mailer, enabled: isTicketEmailEnabled(env), tokens: readTicketTokenConfig(env),
        });
    });
};

export const startTicketingCron = (env: Env = process.env) => {
    if (env.TICKETING_HOLD_EXPIRY_ENABLED === 'true') startHoldExpiry();
    startPaymentJobs(env);
    startTicketDelivery(env);
};
