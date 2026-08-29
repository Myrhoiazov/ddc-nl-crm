import { Customer, Mandate, Payment, Subscription } from '@mollie/api-client';
import prisma from '../../prisma/prisma-client';
import * as mollieService from './service.Mollie';
import { normalizePaymentStatus } from './service.MollieUtils';
import { reconcileInvoiceMolliePayments } from './service.InvoiceMollie';

export interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

export interface FullSyncResult {
    customers: SyncResult;
    mandates: SyncResult;
    subscriptions: SyncResult;
    payments: SyncResult;
}

const createEmptySyncResult = (): SyncResult => ({
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
});

const splitCustomerName = (name?: string | null) => {
    const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

    return {
        givenName: parts[0] ?? null,
        familyName: parts.length > 1 ? parts.slice(1).join(' ') : null,
    };
};

const toDate = (value?: string | Date | null) => {
    if (!value) {
        return null;
    }

    return new Date(value);
};

const stringifyMetadata = (metadata?: unknown) => {
    if (!metadata) {
        return null;
    }

    return typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
};

const getInvoiceIdFromMetadata = (metadata?: unknown) => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
    const invoiceId = Number((metadata as Record<string, unknown>).invoiceId);
    return Number.isInteger(invoiceId) && invoiceId > 0 ? invoiceId : null;
};

const getPaymentAdjustmentData = async (payment: Payment) => {
    const status = normalizePaymentStatus(payment.status);
    let adjustmentAt: Date | null = null;

    if (payment.hasRefunds()) {
        for await (const refund of payment.getRefunds()) {
            const createdAt = toDate(refund.createdAt);

            if (createdAt && (!adjustmentAt || createdAt > adjustmentAt)) {
                adjustmentAt = createdAt;
            }
        }
    }

    if (payment.hasChargebacks()) {
        for await (const chargeback of payment.getChargebacks()) {
            if (!chargeback.reversedAt) {
                const createdAt = toDate(chargeback.createdAt);

                if (createdAt && (!adjustmentAt || createdAt > adjustmentAt)) {
                    adjustmentAt = createdAt;
                }

                return { status: 'charged_back', adjustmentAt };
            }
        }
    }

    return { status, adjustmentAt };
};

const findClientIdByEmail = async (email?: string | null) => {
    const normalizedEmail = email?.trim();

    if (!normalizedEmail) {
        return null;
    }

    const client = await prisma.client.findFirst({
        where: {
            email: normalizedEmail,
        },
        select: {
            id: true,
        },
    });

    return client?.id ?? null;
};

const upsertCustomerClientLink = async (
    customerId: number,
    clientId: number | null,
    linkSource: string,
    payerRelation = 'unknown',
) => {
    if (!clientId) {
        return;
    }

    await prisma.customerClientLink.upsert({
        where: {
            customerId_clientId: {
                customerId,
                clientId,
            },
        },
        update: {
            linkSource,
            payerRelation,
        },
        create: {
            customerId,
            clientId,
            linkSource,
            payerRelation,
            isPrimary: true,
        },
    });
};

export const syncMollieCustomer = async (mollieCustomer: Customer): Promise<'created' | 'updated' | 'skipped'> => {
    if (!mollieCustomer.id) {
        return 'skipped';
    }

    const { givenName, familyName } = splitCustomerName(mollieCustomer.name);
    const matchedClientId = await findClientIdByEmail(mollieCustomer.email);
    const existing = await prisma.customer.findFirst({
        where: {
            OR: [
                { mollieId: mollieCustomer.id },
                ...(mollieCustomer.email ? [{ email: mollieCustomer.email }] : []),
            ],
        },
    });

    if (existing) {
        const shouldApplyEmailMatch = !existing.clientId && matchedClientId;

        await prisma.customer.update({
            where: { id: existing.id },
            data: {
                mollieId: mollieCustomer.id,
                email: mollieCustomer.email ?? existing.email,
                givenName: givenName ?? existing.givenName,
                familyName: familyName ?? existing.familyName,
                payerName: mollieCustomer.name ?? existing.payerName,
                payerRelation: existing.payerRelation ?? 'unknown',
                linkSource: shouldApplyEmailMatch ? 'email_match' : existing.linkSource,
                clientId: existing.clientId ?? matchedClientId ?? undefined,
            },
        });
        await upsertCustomerClientLink(existing.id, matchedClientId, 'email_match');

        return 'updated';
    }

    const customer = await prisma.customer.create({
        data: {
            mollieId: mollieCustomer.id,
            email: mollieCustomer.email,
            givenName,
            familyName,
            payerName: mollieCustomer.name ?? null,
            payerRelation: 'unknown',
            linkSource: matchedClientId ? 'email_match' : 'unlinked',
            clientId: matchedClientId,
        },
    });
    await upsertCustomerClientLink(customer.id, matchedClientId, 'email_match');

    return 'created';
};

export const syncMollieCustomers = async (): Promise<SyncResult> => {
    const result = createEmptySyncResult();
    const mollieCustomers = await mollieService.getAllCustomers();

    for (const mollieCustomer of mollieCustomers) {
        try {
            const status = await syncMollieCustomer(mollieCustomer);
            result[status] += 1;
        } catch (error) {
            result.errors += 1;
            console.error('Mollie customer sync failed:', mollieCustomer.id, error);
        }
    }

    return result;
};

export const syncMolliePayment = async (
    payment: Payment,
    invoiceIdHint?: number | null,
): Promise<'created' | 'updated' | 'skipped'> => {
    if (!payment.id) {
        return 'skipped';
    }

    if (payment.customerId) {
        const existingCustomer = await prisma.customer.findUnique({
            where: { mollieId: payment.customerId },
        });

        if (!existingCustomer) {
            const mollieCustomer = await mollieService.getCustomerById(payment.customerId);
            await syncMollieCustomer(mollieCustomer);
        }
    }

    const subscription = payment.subscriptionId
        ? await prisma.subscription.findUnique({
            where: { mollieId: payment.subscriptionId },
            include: {
                customer: true,
            },
        })
        : null;
    const customer = payment.customerId
        ? await prisma.customer.findUnique({ where: { mollieId: payment.customerId } })
        : subscription?.customer ?? null;
    const existing = await prisma.payment.findUnique({ where: { mollieId: payment.id } });
    const { status, adjustmentAt } = await getPaymentAdjustmentData(payment);
    const metadataInvoiceId = getInvoiceIdFromMetadata(payment.metadata);
    const metadataInvoice = metadataInvoiceId
        ? await prisma.invoice.findUnique({ where: { id: metadataInvoiceId }, select: { id: true } })
        : null;
    const hintedInvoice = invoiceIdHint
        ? await prisma.invoice.findUnique({ where: { id: invoiceIdHint }, select: { id: true } })
        : null;
    const invoiceId = metadataInvoice?.id ?? existing?.invoiceId ?? hintedInvoice?.id ?? null;

    const syncedPayment = await prisma.payment.upsert({
        where: { mollieId: payment.id },
        update: {
            amountValue: payment.amount.value,
            amountCurrency: payment.amount.currency,
            refundedAmount: payment.amountRefunded?.value ?? '0',
            chargedBackAmount: payment.amountChargedBack?.value ?? '0',
            adjustmentAt,
            description: payment.description,
            method: payment.method ?? 'unknown',
            status,
            checkoutUrl: payment.getCheckoutUrl(),
            isCancelable: payment.isCancelable,
            paidAt: toDate(payment.paidAt),
            customerId: customer?.id ?? undefined,
            subscriptionId: subscription?.id ?? undefined,
            invoiceId,
        },
        create: {
            mollieId: payment.id,
            amountValue: payment.amount.value,
            amountCurrency: payment.amount.currency,
            refundedAmount: payment.amountRefunded?.value ?? '0',
            chargedBackAmount: payment.amountChargedBack?.value ?? '0',
            adjustmentAt,
            description: payment.description,
            method: payment.method ?? 'unknown',
            status,
            checkoutUrl: payment.getCheckoutUrl(),
            isCancelable: payment.isCancelable,
            paidAt: toDate(payment.paidAt),
            createdAt: toDate(payment.createdAt) ?? new Date(),
            customerId: customer?.id ?? null,
            subscriptionId: subscription?.id ?? null,
            invoiceId,
        },
    });

    if (syncedPayment.invoiceId) {
        await reconcileInvoiceMolliePayments(syncedPayment.invoiceId);
    }

    return existing ? 'updated' : 'created';
};

export const reconcileCustomerPayments = async (customerId: number): Promise<SyncResult> => {
    const result = createEmptySyncResult();
    const payments = await prisma.payment.findMany({
        where: {
            customerId,
            mollieId: { not: null },
        },
        select: { mollieId: true },
    });

    for (const localPayment of payments) {
        if (!localPayment.mollieId) continue;

        try {
            const payment = await mollieService.getPaymentById(localPayment.mollieId);
            const status = await syncMolliePayment(payment);
            result[status] += 1;
        } catch (error) {
            result.errors += 1;
            console.error('Mollie customer payment reconciliation failed:', localPayment.mollieId, error);
        }
    }

    return result;
};

export const syncMolliePayments = async (): Promise<SyncResult> => {
    const result = createEmptySyncResult();
    const payments = await mollieService.getAllPayments();

    for (const payment of payments) {
        try {
            const status = await syncMolliePayment(payment);
            result[status] += 1;
        } catch (error) {
            result.errors += 1;
            console.error('Mollie payment sync failed:', payment.id, error);
        }
    }

    return result;
};

export const syncMollieMandate = async (
    customerId: number,
    mandate: Mandate,
): Promise<'created' | 'updated' | 'skipped'> => {
    if (!mandate.id) {
        return 'skipped';
    }

    const existing = await prisma.mandate.findUnique({ where: { mollieId: mandate.id } });

    await prisma.mandate.upsert({
        where: { mollieId: mandate.id },
        update: {
            status: mandate.status,
            method: mandate.method,
            signatureDate: toDate(mandate.signatureDate),
            mandateReference: mandate.mandateReference ?? undefined,
            customerId,
        },
        create: {
            mollieId: mandate.id,
            status: mandate.status,
            method: mandate.method,
            signatureDate: toDate(mandate.signatureDate),
            mandateReference: mandate.mandateReference ?? null,
            customerId,
        },
    });

    return existing ? 'updated' : 'created';
};

export const syncMollieMandates = async (): Promise<SyncResult> => {
    const result = createEmptySyncResult();
    const customers = await prisma.customer.findMany({
        where: {
            mollieId: {
                not: null,
            },
        },
    });

    for (const customer of customers) {
        try {
            const mandates = await mollieService.getMandateByCustomerId(customer.mollieId);

            for (const mandate of mandates) {
                const status = await syncMollieMandate(customer.id, mandate);
                result[status] += 1;
            }
        } catch (error) {
            result.errors += 1;
            console.error('Mollie mandates sync failed:', customer.mollieId, error);
        }
    }

    return result;
};

export const syncMollieSubscription = async (
    customerId: number,
    subscription: Subscription,
): Promise<'created' | 'updated' | 'skipped'> => {
    if (!subscription.id) {
        return 'skipped';
    }

    const mandate = subscription.mandateId
        ? await prisma.mandate.findUnique({ where: { mollieId: subscription.mandateId } })
        : null;
    const existing = await prisma.subscription.findUnique({ where: { mollieId: subscription.id } });

    await prisma.subscription.upsert({
        where: { mollieId: subscription.id },
        update: {
            description: subscription.description,
            amountValue: subscription.amount.value,
            amountCurrency: subscription.amount.currency,
            interval: subscription.interval,
            metadata: stringifyMetadata(subscription.metadata),
            startDate: toDate(subscription.startDate),
            nextPaymentDate: toDate(subscription.nextPaymentDate),
            status: subscription.status,
            times: subscription.times ?? undefined,
            mandateId: mandate?.id ?? undefined,
            customerId,
        },
        create: {
            mollieId: subscription.id,
            description: subscription.description,
            amountValue: subscription.amount.value,
            amountCurrency: subscription.amount.currency,
            interval: subscription.interval,
            metadata: stringifyMetadata(subscription.metadata),
            startDate: toDate(subscription.startDate),
            nextPaymentDate: toDate(subscription.nextPaymentDate),
            status: subscription.status,
            times: subscription.times ?? null,
            customerId,
            mandateId: mandate?.id ?? null,
        },
    });

    return existing ? 'updated' : 'created';
};

export const syncMollieSubscriptions = async (): Promise<SyncResult> => {
    const result = createEmptySyncResult();
    const customers = await prisma.customer.findMany({
        where: {
            mollieId: {
                not: null,
            },
        },
    });

    for (const customer of customers) {
        try {
            const subscriptions = await mollieService.getSubscriptionsByCustomerId(customer.mollieId);

            for (const subscription of subscriptions) {
                const status = await syncMollieSubscription(customer.id, subscription);
                result[status] += 1;
            }
        } catch (error) {
            result.errors += 1;
            console.error('Mollie subscriptions sync failed:', customer.mollieId, error);
        }
    }

    return result;
};

export const syncAllMollieData = async (): Promise<FullSyncResult> => {
    const customers = await syncMollieCustomers();
    const mandates = await syncMollieMandates();
    const subscriptions = await syncMollieSubscriptions();
    const payments = await syncMolliePayments();

    return {
        customers,
        mandates,
        subscriptions,
        payments,
    };
};
