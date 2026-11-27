import { Locale, type Payment } from '@mollie/api-client';
import { getMollieClientContext } from '../payments/payments.auth.service';
import { normalizePaymentStatus } from '../payments/payments.utils.service';
import { fromMollieAmount, readPaymentMetadata, TICKETING_PAYMENT_SOURCE, toMollieAmount } from './payment.policy';
import type { CreateRemotePaymentParams, PaymentMode, RemotePayment, TicketPaymentGateway } from './payment.types';

// Адаптер Mollie: общий клиент CRM, но собственные webhook и metadata.source='ticketing'.

const MOLLIE_LOCALES: Record<string, Locale | undefined> = { nl: Locale.nl_NL, en: Locale.en_US };

const toDate = (value?: string | null): Date | null => (value ? new Date(value) : null);

const toRemotePayment = (payment: Payment): RemotePayment => ({
    id: payment.id,
    status: normalizePaymentStatus(payment.status),
    amountCents: fromMollieAmount(payment.amount.value),
    currency: payment.amount.currency,
    mode: payment.mode === 'live' ? 'LIVE' : 'TEST',
    checkoutUrl: payment.getCheckoutUrl() ?? null,
    isCancelable: payment.isCancelable === true,
    expiresAt: toDate(payment.expiresAt),
    paidAt: toDate(payment.paidAt),
    method: payment.method ?? null,
    refundedCents: fromMollieAmount(payment.amountRefunded?.value) || 0,
    chargedBackCents: fromMollieAmount(payment.amountChargedBack?.value) || 0,
    metadata: readPaymentMetadata(payment.metadata),
});

const createPayment = async (params: CreateRemotePaymentParams): Promise<RemotePayment> => {
    const { client, usesOAuth } = await getMollieClientContext(params.mode);
    const profileId = usesOAuth ? process.env.TICKETING_MOLLIE_PROFILE_ID?.trim() : undefined;
    if (usesOAuth && !profileId) throw new Error('TICKETING_MOLLIE_PROFILE_ID is required with Mollie OAuth');

    const payment = await client.payments.create({
        ...(usesOAuth ? { profileId, testmode: params.mode === 'TEST' } : {}),
        amount: { currency: params.currency, value: toMollieAmount(params.amountCents) },
        description: params.description,
        redirectUrl: params.redirectUrl,
        webhookUrl: params.webhookUrl,
        locale: MOLLIE_LOCALES[params.locale],
        metadata: { source: TICKETING_PAYMENT_SOURCE, orderId: params.orderId, orderNumber: params.orderNumber },
        idempotencyKey: params.idempotencyKey,
    });
    return toRemotePayment(payment);
};

const getPayment = async (molliePaymentId: string, mode: PaymentMode): Promise<RemotePayment> => {
    const { client, usesOAuth } = await getMollieClientContext(mode);
    const options = usesOAuth ? { testmode: mode === 'TEST' } : undefined;
    return toRemotePayment(await client.payments.get(molliePaymentId, options));
};

const cancelPayment = async (molliePaymentId: string, mode: PaymentMode): Promise<RemotePayment> => {
    const { client, usesOAuth } = await getMollieClientContext(mode);
    const options = usesOAuth ? { testmode: mode === 'TEST' } : undefined;
    return toRemotePayment(await client.payments.cancel(molliePaymentId, options));
};

const mollieGateway: TicketPaymentGateway = { createPayment, getPayment, cancelPayment };

let override: TicketPaymentGateway | null = null;

export const getTicketPaymentGateway = (): TicketPaymentGateway => override ?? mollieGateway;

// Шов для тестов HTTP-маршрутов: настоящая Mollie в них не вызывается.
export const overrideTicketPaymentGateway = (gateway: TicketPaymentGateway | null) => {
    override = gateway;
};
