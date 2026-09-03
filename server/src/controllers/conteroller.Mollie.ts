import { ClientLanguage, Prisma, User } from "@prisma/client";
import { generateSalt } from "../helpers";
import { oauthClient } from "../config/oauthClient";
import { Request, Response } from "express";
import dotenv from 'dotenv';
import axios from "axios";
import * as mollieService from '../services/service.Mollie';
import { getCostomerByMollieId, TCustomer } from "../services/service.Customer";
import { MandateFormData } from "types/mollie.types";
import prisma from "../../prisma/prisma-client";
import { MandateMethod } from "@mollie/api-client";
import * as mollieSyncService from "../services/service.MollieSync";
import * as mollieDashboardService from "../services/service.MollieDashboard";
import { getMollieTokenExpiresAt, saveMollieAccount } from "../services/service.MollieAuth";
import { buildMollieWebhookDedupeKey, createCsv, getWebhookAttentionLevel, mapClientLanguageToMollieLocale, parseIncidentKey, paymentIssueStatuses as molliePaymentIssueStatuses } from "../services/service.MollieUtils";
import { z } from "zod";
import { createMolliePaymentInvoicePdf } from "../services/service.MolliePaymentInvoicePdf";
import { isTelegramConfigured, notifyMolliePayment, sendTelegramMessage } from "../services/service.Telegram";

dotenv.config();

const customerClientSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phoneNumber: true,
    preferredLanguage: true,
};

const mollieCustomerSelect = {
    id: true,
    mollieId: true,
    email: true,
    givenName: true,
    familyName: true,
    payerName: true,
    payerRelation: true,
    linkSource: true,
    client: {
        select: customerClientSelect,
    },
    clientLinks: {
        select: {
            id: true,
            payerRelation: true,
            linkSource: true,
            isPrimary: true,
            client: {
                select: customerClientSelect,
            },
        },
    },
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
            isPrimary: true,
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

const getCustomerWithStudentLinks = async (customerId: number) => (
    prisma.customer.findUnique({
        where: { id: customerId },
        include: {
            client: {
                select: customerClientSelect,
            },
            clientLinks: {
                orderBy: [
                    { isPrimary: 'desc' },
                    { createdAt: 'asc' },
                ],
                select: {
                    id: true,
                    payerRelation: true,
                    linkSource: true,
                    isPrimary: true,
                    notes: true,
                    client: {
                        select: customerClientSelect,
                    },
                },
            },
        },
    })
);

const paymentLinkSchema = z.object({
    clientId: z.coerce.number().int().positive(),
    amountValue: z.coerce.number().positive().max(100000),
    description: z.string().trim().min(1).max(255),
});

const updateCustomerSchema = z.object({
    mollieId: z.string().trim().min(1).nullable().optional(),
    email: z.string().trim().email().nullable().optional(),
    givenName: z.string().trim().nullable().optional(),
    familyName: z.string().trim().nullable().optional(),
    city: z.string().trim().nullable().optional(),
    country: z.string().trim().nullable().optional(),
    postalCode: z.string().trim().nullable().optional(),
    streetAndNumber: z.string().trim().nullable().optional(),
    consumerAccount: z.string().trim().nullable().optional(),
    consumerName: z.string().trim().nullable().optional(),
    consumerBic: z.string().trim().nullable().optional(),
    payerName: z.string().trim().nullable().optional(),
    payerRelation: z.string().trim().nullable().optional(),
    linkSource: z.string().trim().optional(),
    locale: z.string().trim().nullable().optional(),
    preferredLanguage: z.nativeEnum(ClientLanguage).nullable().optional(),
}).strict();

const createMandateSchema = z.object({
    customerId: z.string().trim().min(1),
    consumerName: z.string().trim().min(2).max(255),
    consumerAccount: z.preprocess(
        (value) => typeof value === 'string' ? value.replace(/\s/g, '').toUpperCase() : value,
        z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/, 'Invalid IBAN'),
    ),
    consumerBic: z.string().trim().max(11).optional(),
    signatureDate: z.string().date(),
    method: z.literal('directdebit').default('directdebit'),
}).refine((data) => new Date(data.signatureDate) <= new Date(), {
    message: 'Signature date cannot be in the future',
    path: ['signatureDate'],
});

const createSubscriptionSchema = z.object({
    customerId: z.string().trim().min(1),
    mandateId: z.string().trim().min(1),
    amount: z.object({
        currency: z.literal('EUR').default('EUR'),
        value: z.string().regex(/^\d+(\.\d{2})$/, 'Amount must use format 25.00'),
    }),
    times: z.coerce.number().int().positive().optional(),
    interval: z.string().trim().min(1).max(100),
    startDate: z.string().date(),
    description: z.string().trim().min(1).max(255),
}).refine((data) => new Date(`${data.startDate}T23:59:59`) >= new Date(), {
    message: 'Start date cannot be in the past',
    path: ['startDate'],
});

const updateSubscriptionSchema = z.object({
    customerId: z.coerce.number().int().positive(),
    mandateId: z.string().trim().min(1),
    amountValue: z.coerce.number().positive().max(100000),
    times: z.coerce.number().int().positive().optional(),
    interval: z.string().trim().regex(/^\d+\s+(day|days|week|weeks|month|months)$/, 'Invalid interval'),
    startDate: z.string().date(),
    description: z.string().trim().min(1).max(255),
}).strict().refine((data) => new Date(`${data.startDate}T23:59:59`) >= new Date(), {
    message: 'Next payment date cannot be in the past',
    path: ['startDate'],
});

const restartSubscriptionSchema = z.object({
    customerId: z.coerce.number().int().positive(),
    mandateId: z.string().trim().min(1),
    startDate: z.string().date(),
}).strict().refine((data) => new Date(`${data.startDate}T23:59:59`) >= new Date(), {
    message: 'Start date cannot be in the past',
    path: ['startDate'],
});


interface AuthenticatedRequest extends Request {
    user: User;
}

// Теперь mollieClient позволяет обращаться к куче ресурсов:

// mollieClient.customers
// mollieClient.payments
// mollieClient.orders
// mollieClient.mandates
// mollieClient.profiles
// mollieClient.balance
// mollieClient.refunds

/**
 * Controller to fetch all users.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with users or error message
 */
export const connectMollieController = async (req: AuthenticatedRequest, res: Response) => {
    const salt = generateSalt();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.$transaction([
        prisma.mollieOAuthState.deleteMany({
            where: {
                OR: [
                    { userId: req.user.id },
                    { expiresAt: { lt: new Date() } },
                ],
            },
        }),
        prisma.mollieOAuthState.create({
            data: {
                state: salt,
                userId: req.user.id,
                expiresAt,
            },
        }),
    ]);

    const authorizationUri = oauthClient.authorizeURL({
        redirect_uri: process.env.MOLLIE_REDIRECT_URI,
        scope: 'organizations.read profiles.read payments.read payments.write customers.read customers.write',
        state: salt,
    });

    res.cookie('mollie_oauth_state', salt, {
        httpOnly: true,
        path: '/api/v1/mollie/callback',
        secure: process.env.MODE === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
    });

    return res.redirect(authorizationUri);
}

export const mollieCallbackController = async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const storedState = req.cookies?.mollie_oauth_state;

    if (typeof code !== 'string') {
        return res.status(400).json({ error: 'Invalid authorization code' });
    }

    if (!storedState || typeof state !== 'string' || storedState !== state) {
        return res.status(400).json({ error: 'Invalid Mollie state' });
    }

    try {
        const oauthState = await prisma.mollieOAuthState.findUnique({
            where: { state },
        });

        if (!oauthState || oauthState.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Expired or unknown Mollie state' });
        }

        const response = await axios.post(
            'https://api.mollie.com/oauth2/tokens',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.MOLLIE_REDIRECT_URI ?? '',
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${process.env.MOLLIE_CLIENT_ID}:${process.env.MOLLIE_CLIENT_SECRET}`).toString('base64')}`,
                },
            }
        );

        const tokenData = response.data;

        await saveMollieAccount(oauthState.userId, {
            ...tokenData,
            expires_at: getMollieTokenExpiresAt(tokenData).toISOString(),
        });
        await prisma.mollieOAuthState.delete({ where: { id: oauthState.id } });

        res.clearCookie('mollie_oauth_state', { path: '/api/v1/mollie/callback' });
        const fallbackClientUrl = process.env.MODE === 'development' ? 'http://localhost:3000' : undefined;
        res.redirect(process.env.CLIENT_URL ?? fallbackClientUrl ?? '/');
    } catch (error) {
        console.error('Access Token Error', error.message);
        res.status(500).send('Error retrieving access token');
    }
};

export const mollieConnectionStatusController = async (req: AuthenticatedRequest, res: Response) => {
    const account = await prisma.mollieAccount.findFirst({
        where: {
            isActive: true,
        },
        orderBy: {
            updatedAt: 'desc',
        },
        select: {
            userId: true,
            expiresAt: true,
            scope: true,
            lastRefreshedAt: true,
            updatedAt: true,
        },
    });

    if (account) {
        return res.status(200).json({
            source: 'oauth',
            isConnected: true,
            connectedByCurrentUser: account.userId === req.user.id,
            expiresAt: account.expiresAt,
            scope: account.scope,
            lastRefreshedAt: account.lastRefreshedAt,
            updatedAt: account.updatedAt,
        });
    }

    const hasApiKey = Boolean(process.env.MOLLIE_API_KEY ?? process.env.MOLLIE_API_KEY_LIVE);

    return res.status(200).json({
        source: hasApiKey ? 'api_key' : 'none',
        isConnected: hasApiKey,
        connectedByCurrentUser: false,
    });
};

export const mollieDisconnectController = async (req: AuthenticatedRequest, res: Response) => {
    const result = await prisma.mollieAccount.updateMany({
        where: {
            userId: req.user.id,
            isActive: true,
        },
        data: {
            isActive: false,
        },
    });

    return res.status(200).json({
        disconnected: result.count > 0,
        fallback: process.env.MOLLIE_API_KEY ?? process.env.MOLLIE_API_KEY_LIVE ? 'api_key' : 'none',
    });
};

const findInvoicePaymentLinkByToken = async (req: Request) => {
    const token = typeof req.query.invoicePaymentLinkToken === 'string'
        ? req.query.invoicePaymentLinkToken
        : null;

    if (!token) return null;

    return prisma.invoiceMolliePaymentLink.findUnique({
        where: { webhookToken: token },
        select: { id: true, invoiceId: true },
    });
};

const markInvoicePaymentLinkPaid = async (
    invoicePaymentLink: { id: number } | null,
    payment: { status: string; paidAt?: string | null },
) => {
    if (!invoicePaymentLink || payment.status !== 'paid') return;

    await prisma.invoiceMolliePaymentLink.update({
        where: { id: invoicePaymentLink.id },
        data: {
            paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
            archived: true,
        },
    });
};

const findSyncedPaymentForWebhook = (mollieId: string) => prisma.payment.findUnique({
    where: { mollieId },
    select: {
        id: true,
        status: true,
        mollieId: true,
        amountValue: true,
        amountCurrency: true,
        refundedAmount: true,
        chargedBackAmount: true,
        description: true,
        method: true,
        paidAt: true,
        customer: {
            select: {
                payerName: true,
                givenName: true,
                familyName: true,
                email: true,
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                clientLinks: {
                    select: {
                        client: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        },
        invoice: {
            select: {
                number: true,
                billToName: true,
            },
        },
    },
});

const logWebhookOutcome = (effectiveStatus: string, mollieId: string) => {
    switch (getWebhookAttentionLevel(effectiveStatus)) {
        case 'success':
            console.log(`✅ Payment ${mollieId} marked as paid`);
            break;
        case 'attention':
            console.warn(`⚠️ Payment ${mollieId} needs attention: ${effectiveStatus}`);
            break;
        default:
            console.log(`ℹ️ Payment ${mollieId} synced with status: ${effectiveStatus}`);
    }
};

const notifyMolliePaymentIfLinked = async (
    syncedPayment: Awaited<ReturnType<typeof findSyncedPaymentForWebhook>>,
    payment: { id: string; details?: unknown },
) => {
    if (!syncedPayment?.mollieId) return;

    const paymentDetails = payment.details as { consumerName?: string } | null;
    await notifyMolliePayment({
        ...syncedPayment,
        consumerName: paymentDetails?.consumerName ?? null,
    }).catch((telegramError) => {
        console.error(`Telegram notification failed for ${payment.id}:`, telegramError);
    });
};

const markMollieEventFailed = async (eventId: number | null, err: unknown) => {
    if (!eventId) return;

    await prisma.mollieEvent.update({
        where: { id: eventId },
        data: {
            processingStatus: 'failed',
            dedupeKey: null,
            errorMessage: err instanceof Error ? err.message : String(err),
            processedAt: new Date(),
        },
    }).catch((eventError) => {
        console.error('Failed to mark Mollie event as failed:', eventError);
    });
};

export const webhookMollieController = async (req: Request, res: Response) => {
    const paymentId = req.body.id;

    if (!paymentId || typeof paymentId !== 'string') {
        return res.status(400).send('Missing payment id');
    }

    let eventId: number | null = null;

    try {
        const invoicePaymentLink = await findInvoicePaymentLinkByToken(req);
        const payment = await mollieService.getPaymentById(paymentId);
        const dedupeKey = buildMollieWebhookDedupeKey(payment);
        const event = await prisma.mollieEvent.create({
            data: {
                molliePaymentId: paymentId,
                payload: req.body,
                dedupeKey,
            },
        });
        eventId = event.id;

        console.log(`💡 Webhook received for payment ${payment.id} — status: ${payment.status}`);
        await mollieSyncService.syncMolliePayment(payment, invoicePaymentLink?.invoiceId);
        await markInvoicePaymentLinkPaid(invoicePaymentLink, payment);

        const syncedPayment = await findSyncedPaymentForWebhook(payment.id);
        const effectiveStatus = syncedPayment?.status ?? payment.status;

        await prisma.mollieEvent.update({
            where: { id: eventId },
            data: {
                paymentId: syncedPayment?.id ?? null,
                paymentStatus: effectiveStatus,
                processingStatus: 'processed',
                processedAt: new Date(),
            },
        });

        logWebhookOutcome(effectiveStatus, payment.id);
        await notifyMolliePaymentIfLinked(syncedPayment, payment);

        return res.status(200).send('OK');
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return res.status(200).send('Already processed');
        }
        console.error('Error handling webhook:', err);
        await markMollieEventFailed(eventId, err);

        return res.status(500).send('Webhook processing failed');
    }
}

export const mollieTelegramTestController = async (_req: Request, res: Response) => {
    if (!isTelegramConfigured()) {
        return res.status(503).json({
            error: 'Telegram is not configured',
            required: ['TELEGRAM_TOKEN', 'TELEGRAM_CHAT_ID'],
        });
    }

    await sendTelegramMessage('<b>Telegram подключён</b>\nТестовое уведомление из DDC CRM.');
    return res.status(200).json({ sent: true });
};

export const createCustomerController = async (req: Request<{}, {}, TCustomer>, res: Response) => {

    const { email, givenName, familyName, payerName, payerRelation, clientId } = req.body as TCustomer & {
        payerName?: string;
        payerRelation?: string;
        clientId?: number | string | null;
    }

    if (!email || !givenName) {
        return res.status(400).json({ error: 'Name && email is requered' });
    }

    try {

        const existing = await prisma.customer.findUnique({ where: { email } });

        const explicitClientId = clientId ? Number(clientId) : null;
        const matchedClientId = existing?.clientId ?? explicitClientId ?? await findClientIdByEmail(email);
        const linkSource = existing?.clientId ? existing.linkSource : explicitClientId ? 'manual' : matchedClientId ? 'email_match' : 'unlinked';

        const matchedClient = matchedClientId
            ? await prisma.client.findUnique({ where: { id: matchedClientId }, select: { preferredLanguage: true } })
            : null;
        const locale = mapClientLanguageToMollieLocale(matchedClient?.preferredLanguage);

        let mollieId = existing?.mollieId ?? null;

        if (!mollieId) {
            const mollieCustomer = await mollieService.createCustomer({
                name: `${givenName} ${familyName ?? ''}`.trim(),
                email,
                locale,
            });

            if (!mollieCustomer?.id) {
                return res.status(502).json({ error: 'Mollie did not return customer id' });
            }

            mollieId = mollieCustomer.id;
        }

        const prismaCustomer = await prisma.customer.upsert({
            where: { email },
            update: {
                givenName,
                familyName: familyName ?? null,
                mollieId: mollieId ?? undefined,
                payerName: payerName ?? `${givenName} ${familyName ?? ''}`.trim(),
                payerRelation: payerRelation ?? existing?.payerRelation ?? 'unknown',
                linkSource,
                clientId: matchedClientId ?? undefined,
                locale: locale ?? undefined,
                // Seed only if this customer never had its own language set — it's the
                // starting default, not something we silently overwrite on every save.
                preferredLanguage: existing?.preferredLanguage ?? matchedClient?.preferredLanguage ?? undefined,
            },
            create: {
                email,
                givenName,
                familyName: familyName ?? null,
                mollieId: mollieId ?? undefined,
                payerName: payerName ?? `${givenName} ${familyName ?? ''}`.trim(),
                payerRelation: payerRelation ?? 'unknown',
                linkSource,
                clientId: matchedClientId,
                locale: locale ?? undefined,
                preferredLanguage: matchedClient?.preferredLanguage ?? undefined,
            },
            include: {
                client: {
                    select: customerClientSelect,
                },
                clientLinks: {
                    select: {
                        id: true,
                        payerRelation: true,
                        linkSource: true,
                        isPrimary: true,
                        client: {
                            select: customerClientSelect,
                        },
                    },
                },
            },
        });
        await upsertCustomerClientLink(prismaCustomer.id, matchedClientId, linkSource, payerRelation ?? 'unknown');

        return res.status(200).json(prismaCustomer);
    } catch (error) {
        console.error('Create customer error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }

}

export const updateCustomerController = async (req: Request, res: Response) => {
    const customerId = Number(req.params.customerId);
    const parsedBody = updateCustomerSchema.safeParse(req.body);

    try {
        if (!customerId || !parsedBody.success) {
            return res.status(400).json({
                error: 'Invalid customer data',
                details: parsedBody.success ? undefined : parsedBody.error.flatten(),
            });
        }

        const customer = await prisma.customer.update({
            where: { id: customerId },
            data: parsedBody.data,
        })

        return res.status(200).json(customer);

    } catch (error) {
        console.error('Error updating Mollie customer:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }

}

export const createCustomerStudentLinkController = async (req: Request, res: Response) => {
    const customerId = Number(req.params.customerId);
    const clientId = Number(req.body.clientId);
    const payerRelation = typeof req.body.payerRelation === 'string' ? req.body.payerRelation : 'unknown';
    const notes = typeof req.body.notes === 'string' ? req.body.notes : undefined;
    const isPrimary = req.body.isPrimary !== false;

    if (!customerId || !clientId) {
        return res.status(400).json({ error: 'customerId and clientId are required' });
    }

    try {
        const [customer, client] = await Promise.all([
            prisma.customer.findUnique({ where: { id: customerId } }),
            prisma.client.findUnique({ where: { id: clientId } }),
        ]);

        if (!customer || !client) {
            return res.status(404).json({ error: 'Customer or student not found' });
        }

        if (isPrimary) {
            await prisma.customerClientLink.updateMany({
                where: { customerId },
                data: { isPrimary: false },
            });
        }

        await prisma.customerClientLink.upsert({
            where: {
                customerId_clientId: {
                    customerId,
                    clientId,
                },
            },
            update: {
                payerRelation,
                linkSource: 'manual',
                isPrimary,
                notes,
            },
            create: {
                customerId,
                clientId,
                payerRelation,
                linkSource: 'manual',
                isPrimary,
                notes,
            },
        });

        if (isPrimary || !customer.clientId) {
            await prisma.customer.update({
                where: { id: customerId },
                data: {
                    clientId,
                    payerRelation,
                    linkSource: 'manual',
                },
            });
        }

        const updatedCustomer = await getCustomerWithStudentLinks(customerId);
        return res.status(200).json(updatedCustomer);
    } catch (error) {
        console.error('Error linking Mollie customer to student:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteCustomerStudentLinkController = async (req: Request, res: Response) => {
    const customerId = Number(req.params.customerId);
    const linkId = Number(req.params.linkId);

    if (!customerId || !linkId) {
        return res.status(400).json({ error: 'customerId and linkId are required' });
    }

    try {
        const link = await prisma.customerClientLink.findFirst({
            where: {
                id: linkId,
                customerId,
            },
        });

        if (!link) {
            return res.status(404).json({ error: 'Student link not found' });
        }

        await prisma.customerClientLink.delete({
            where: { id: linkId },
        });

        const nextPrimaryLink = await prisma.customerClientLink.findFirst({
            where: { customerId },
            orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'asc' },
            ],
        });

        if (nextPrimaryLink) {
            await prisma.customerClientLink.update({
                where: { id: nextPrimaryLink.id },
                data: { isPrimary: true },
            });
        }

        await prisma.customer.update({
            where: { id: customerId },
            data: {
                clientId: nextPrimaryLink?.clientId ?? null,
                linkSource: nextPrimaryLink ? 'manual' : 'unlinked',
                payerRelation: nextPrimaryLink?.payerRelation ?? 'unknown',
            },
        });

        const updatedCustomer = await getCustomerWithStudentLinks(customerId);
        return res.status(200).json(updatedCustomer);
    } catch (error) {
        console.error('Error unlinking Mollie customer from student:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const resolveSubscriptionsFilter = (status: string | undefined, has: string | undefined) => {
    if (status === 'active') return { some: { status: 'active' } };
    if (status === 'not_active') return { none: { status: 'active' } };
    if (has === 'yes') return { some: {} };
    if (has === 'no') return { none: {} };
    return undefined;
};

const resolveMandatesFilter = (has: string | undefined) => {
    if (has === 'yes') return { some: {} };
    if (has === 'no') return { none: {} };
    return undefined;
};

const queryString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const paginatedResponse = (items: unknown[], total: number, page: number, limit: number) => ({
    items,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
});

const paymentDateRangeWhere = (dateFrom?: string, dateTo?: string) => {
    if (!dateFrom && !dateTo) return undefined;
    return {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
    };
};

const customerSearchWhere = (search?: string): Prisma.CustomerWhereInput['OR'] => {
    if (!search) return undefined;
    return [
        { mollieId: { contains: search } },
        { email: { contains: search } },
        { givenName: { contains: search } },
        { familyName: { contains: search } },
        { payerName: { contains: search } },
        { client: { firstName: { contains: search } } },
        { client: { lastName: { contains: search } } },
        { client: { email: { contains: search } } },
        { clientLinks: { some: { client: { firstName: { contains: search } } } } },
        { clientLinks: { some: { client: { lastName: { contains: search } } } } },
        { clientLinks: { some: { client: { email: { contains: search } } } } },
    ];
};

const paymentSearchWhere = (search?: string): Prisma.PaymentWhereInput['OR'] => {
    if (!search) return undefined;
    return [
        { mollieId: { contains: search } },
        { description: { contains: search } },
        { customer: { email: { contains: search } } },
        { customer: { givenName: { contains: search } } },
        { customer: { familyName: { contains: search } } },
        { customer: { payerName: { contains: search } } },
        { customer: { client: { firstName: { contains: search } } } },
        { customer: { client: { lastName: { contains: search } } } },
        { customer: { client: { email: { contains: search } } } },
        { customer: { clientLinks: { some: { client: { firstName: { contains: search } } } } } },
        { customer: { clientLinks: { some: { client: { lastName: { contains: search } } } } } },
        { customer: { clientLinks: { some: { client: { email: { contains: search } } } } } },
        { subscription: { mollieId: { contains: search } } },
    ];
};

type MatrixCell = {
    paid: boolean;
    paidCount: number;
    issueCount: number;
    amount: number;
    currency: string;
};

type MatrixMonth = {
    key: string;
    label: string;
    year: number;
    month: number;
};

type MatrixPayment = {
    id: number;
    status: string;
    amountValue: Prisma.Decimal;
    amountCurrency: string;
    paidAt: Date | null;
    createdAt: Date;
};

type MatrixRow = {
    key: string;
    clientId: number | null;
    customerId: number | null;
    name: string;
    payerNames: string[];
    branch: string | null;
    cells: Record<string, MatrixCell>;
    paidMonths: number;
};

const resolvePaymentMatrixYear = (requested: unknown, now: Date) => {
    const requestedStartYear = Number(requested);
    const defaultStartYear = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    return Number.isInteger(requestedStartYear)
        && requestedStartYear >= 2020
        && requestedStartYear <= now.getUTCFullYear() + 1
        ? requestedStartYear
        : defaultStartYear;
};

const buildPaymentMatrixMonths = (startYear: number): MatrixMonth[] => Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(startYear, 8 + index, 1));
    return {
        key: date.toISOString().slice(0, 7),
        label: date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
    };
});

const paymentMatrixSelector = (periodStart: Date, periodEnd: Date) => ({
    where: { createdAt: { gte: periodStart, lt: periodEnd } },
    select: {
        id: true,
        status: true,
        amountValue: true,
        amountCurrency: true,
        paidAt: true,
        createdAt: true,
    },
});

const createPaymentsMatrixCells = (
    months: MatrixMonth[],
) => (payments: MatrixPayment[]): Record<string, MatrixCell> => {
    const uniquePayments = Array.from(
        new Map(payments.map((payment) => [payment.id, payment])).values(),
    );

    return Object.fromEntries(months.map((month) => {
        const monthPayments = uniquePayments.filter((payment) => (
            (payment.paidAt ?? payment.createdAt).toISOString().slice(0, 7) === month.key
        ));
        const paidPayments = monthPayments.filter((payment) => payment.status === 'paid');

        return [month.key, {
            paid: paidPayments.length > 0,
            paidCount: paidPayments.length,
            issueCount: monthPayments.filter((payment) => molliePaymentIssueStatuses.includes(payment.status as never)).length,
            amount: paidPayments.reduce((total, payment) => total + Number(payment.amountValue), 0),
            currency: paidPayments[0]?.amountCurrency ?? 'EUR',
        }];
    }));
};

const matrixClientsQuery = (periodStart: Date, periodEnd: Date) => prisma.client.findMany({
    select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        branch: {
            select: { name: true },
        },
        mollieCustomers: {
            select: {
                id: true,
                payerName: true,
                givenName: true,
                familyName: true,
                email: true,
                payments: paymentMatrixSelector(periodStart, periodEnd),
            },
        },
        mollieLinks: {
            select: {
                customer: {
                    select: {
                        id: true,
                        payerName: true,
                        givenName: true,
                        familyName: true,
                        email: true,
                        payments: paymentMatrixSelector(periodStart, periodEnd),
                    },
                },
            },
        },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
});

const matrixUnlinkedCustomersQuery = (periodStart: Date, periodEnd: Date) => prisma.customer.findMany({
    where: {
        clientId: null,
        clientLinks: { none: {} },
        payments: {
            some: { createdAt: { gte: periodStart, lt: periodEnd } },
        },
    },
    select: {
        id: true,
        payerName: true,
        givenName: true,
        familyName: true,
        email: true,
        payments: paymentMatrixSelector(periodStart, periodEnd),
    },
});

type MatrixClient = Awaited<ReturnType<typeof matrixClientsQuery>>[number];
type MatrixUnlinkedCustomer = Awaited<ReturnType<typeof matrixUnlinkedCustomersQuery>>[number];

const buildMatrixClientRow = (
    client: MatrixClient,
    createCells: (payments: MatrixPayment[]) => Record<string, MatrixCell>,
): MatrixRow => {
    const customers = [
        ...client.mollieCustomers,
        ...client.mollieLinks.map((link) => link.customer),
    ];
    const uniqueCustomers = Array.from(
        new Map(customers.map((customer) => [customer.id, customer])).values(),
    );
    const cells = createCells(uniqueCustomers.flatMap((customer) => customer.payments));

    return {
        key: `client-${client.id}`,
        clientId: client.id,
        customerId: null as number | null,
        name: [client.firstName, client.lastName].filter(Boolean).join(' ') || client.email || `Student #${client.id}`,
        payerNames: uniqueCustomers.map((customer) => (
            customer.payerName
            || [customer.givenName, customer.familyName].filter(Boolean).join(' ')
            || customer.email
            || `Payer #${customer.id}`
        )),
        branch: client.branch?.name ?? null,
        cells,
        paidMonths: Object.values(cells).filter((cell) => cell.paid).length,
    };
};

const buildMatrixUnlinkedRow = (
    customer: MatrixUnlinkedCustomer,
    createCells: (payments: MatrixPayment[]) => Record<string, MatrixCell>,
): MatrixRow => {
    const cells = createCells(customer.payments);

    return {
        key: `customer-${customer.id}`,
        clientId: null as number | null,
        customerId: customer.id,
        name: customer.payerName
            || [customer.givenName, customer.familyName].filter(Boolean).join(' ')
            || customer.email
            || `Payer #${customer.id}`,
        payerNames: [] as string[],
        branch: null as string | null,
        cells,
        paidMonths: Object.values(cells).filter((cell) => cell.paid).length,
    };
};

export const mollieGetCustomersController = async (req: Request, res: Response) => {
    try {
        const search = queryString(req.query._q)?.trim();
        const hasSubscriptions = queryString(req.query.hasSubscriptions);
        const hasMandates = queryString(req.query.hasMandates);
        const subscriptionStatus = queryString(req.query.subscriptionStatus);
        const requestedPage = Number(queryString(req.query._page));
        const requestedLimit = Number(queryString(req.query._limit));
        const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 100)
            : 15;
        const shouldPaginate = Boolean(req.query._page || req.query._limit);

        const where: Prisma.CustomerWhereInput = {};

        const or = customerSearchWhere(search);
        if (or) where.OR = or;

        const subscriptionsFilter = resolveSubscriptionsFilter(subscriptionStatus, hasSubscriptions);
        if (subscriptionsFilter) where.subscriptions = subscriptionsFilter;

        const mandatesFilter = resolveMandatesFilter(hasMandates);
        if (mandatesFilter) where.mandates = mandatesFilter;

        const customersQuery = prisma.customer.findMany({
            where,
            include: {
                mandates: {
                    select: {
                        id: true,
                        mollieId: true,
                        status: true,
                        method: true,
                    },
                },
                subscriptions: {
                    select: {
                        id: true,
                        mollieId: true,
                        status: true,
                        description: true,
                        nextPaymentDate: true,
                    },
                },
                client: {
                    select: customerClientSelect,
                },
                clientLinks: {
                    select: {
                        id: true,
                        payerRelation: true,
                        linkSource: true,
                        isPrimary: true,
                        client: {
                            select: customerClientSelect,
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            ...(shouldPaginate ? {
                skip: (page - 1) * limit,
                take: limit,
            } : {}),
        });

        if (!shouldPaginate) {
            const customers = await customersQuery;
            return res.status(200).json(customers);
        }

        const [customers, total] = await Promise.all([
            customersQuery,
            prisma.customer.count({ where }),
        ]);

        return res.status(200).json(paginatedResponse(customers, total, page, limit));
    } catch (error) {
        console.error('Error fetching Mollie customers:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieGetCustomerFullInfo = async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const parsedCustomerId = Number(customerId);

    if (!Number.isInteger(parsedCustomerId) || parsedCustomerId <= 0) {
        return res.status(400).json({ error: 'Invalid customer id' });
    }

    try {
        await mollieSyncService.reconcileCustomerPayments(parsedCustomerId);

        const [customerFullInfo, events] = await Promise.all([
            prisma.customer.findUnique({
                where: { id: parsedCustomerId },
                include: {
                    mandates: true,
                    subscriptions: true,
                    payments: true,
                    client: {
                        select: customerClientSelect,
                    },
                    clientLinks: {
                        select: {
                            id: true,
                            payerRelation: true,
                            linkSource: true,
                            isPrimary: true,
                            client: {
                                select: customerClientSelect,
                            },
                        },
                    },
                },
            }),
            prisma.mollieEvent.findMany({
                where: {
                    payment: {
                        customerId: parsedCustomerId,
                    },
                },
                select: {
                    id: true,
                    molliePaymentId: true,
                    eventType: true,
                    paymentStatus: true,
                    processingStatus: true,
                    errorMessage: true,
                    receivedAt: true,
                    processedAt: true,
                },
                orderBy: {
                    receivedAt: 'desc',
                },
                take: 30,
            }),
        ]);

        if (!customerFullInfo) {
            return res.status(404).json({ error: 'Mollie customer not found' });
        }

        res.set('Cache-Control', 'no-store');
        return res.status(200).json({
            ...customerFullInfo,
            events,
        });
    } catch (error) {
        console.error('Error fetching Mollie customer details:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieExportActiveSubscriptionsController = async (req: Request, res: Response) => {
    try {
        const search = typeof req.query._q === 'string' ? req.query._q.trim() : '';
        const customerWhere: Prisma.CustomerWhereInput = search
            ? {
                OR: [
                    { mollieId: { contains: search } },
                    { email: { contains: search } },
                    { givenName: { contains: search } },
                    { familyName: { contains: search } },
                    { payerName: { contains: search } },
                    { client: { firstName: { contains: search } } },
                    { client: { lastName: { contains: search } } },
                    { clientLinks: { some: { client: { firstName: { contains: search } } } } },
                    { clientLinks: { some: { client: { lastName: { contains: search } } } } },
                ],
            }
            : {};
        const subscriptions = await prisma.subscription.findMany({
            where: {
                status: 'active',
                customer: customerWhere,
            },
            include: {
                mandate: {
                    select: {
                        mollieId: true,
                        status: true,
                        method: true,
                    },
                },
                customer: {
                    include: {
                        client: {
                            select: customerClientSelect,
                        },
                        clientLinks: {
                            select: {
                                payerRelation: true,
                                client: {
                                    select: customerClientSelect,
                                },
                            },
                        },
                    },
                },
            },
            orderBy: [
                { nextPaymentDate: 'asc' },
                { createdAt: 'asc' },
            ],
        });
        const csv = createCsv(
            [
                'Subscription ID',
                'Description',
                'Amount',
                'Currency',
                'Interval',
                'Start date',
                'Next payment date',
                'Payer',
                'Payer email',
                'Students',
                'Mandate ID',
                'Mandate status',
                'Mandate method',
            ],
            subscriptions.map((subscription) => {
                const linkedStudents = subscription.customer.clientLinks
                    .map((link) => [link.client.firstName, link.client.lastName].filter(Boolean).join(' ') || link.client.email)
                    .filter(Boolean);
                const legacyStudent = subscription.customer.client
                    ? [subscription.customer.client.firstName, subscription.customer.client.lastName].filter(Boolean).join(' ')
                        || subscription.customer.client.email
                    : '';
                const students = Array.from(
                    new Set([...linkedStudents, legacyStudent].filter(Boolean)),
                ).join('; ');

                return [
                    subscription.mollieId,
                    subscription.description,
                    subscription.amountValue,
                    subscription.amountCurrency,
                    subscription.interval,
                    subscription.startDate,
                    subscription.nextPaymentDate,
                    subscription.customer.payerName
                        || [subscription.customer.givenName, subscription.customer.familyName].filter(Boolean).join(' '),
                    subscription.customer.email,
                    students,
                    subscription.mandate?.mollieId,
                    subscription.mandate?.status,
                    subscription.mandate?.method,
                ];
            }),
        );

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="active-subscriptions-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.status(200).send(csv);
    } catch (error) {
        console.error('Error exporting active subscriptions:', error);
        return res.status(500).json({ error: 'Unable to export active subscriptions' });
    }
};

export const mollieGetOrganizationsController = async (req: Request, res: Response) => {
    try {
        // const mollieAccount = await prisma.mollieAccount.findFirst({
        //     where: { userId: 1 },
        // });

        // if (!mollieAccount) {
        //     return res.status(404).json({ error: 'Mollie account not found' });
        // }

        const organizations = await mollieService.getProfile();
        return res.status(200).json(organizations);
    } catch (error) {
        console.error('Error fetching Mollie organizations:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieGetPaymentsController = async (req: Request, res: Response) => {
    try {
        const search = queryString(req.query._q)?.trim();
        const status = queryString(req.query.status);
        const issueOnly = queryString(req.query.issueOnly) === 'true';
        const dateFrom = queryString(req.query.dateFrom);
        const dateTo = queryString(req.query.dateTo);
        const page = Math.max(Number(queryString(req.query._page) ?? 1), 1);
        const limit = Math.min(Math.max(Number(queryString(req.query._limit) ?? 25), 1), 100);
        const method = queryString(req.query.method);

        const where: Prisma.PaymentWhereInput = {};

        const or = paymentSearchWhere(search);
        if (or) where.OR = or;

        if (status && status !== 'all') {
            where.status = status;
        } else if (issueOnly) {
            where.status = { in: [...molliePaymentIssueStatuses] };
        }

        if (method && method !== 'all') {
            where.method = method;
        }

        const createdAt = paymentDateRangeWhere(dateFrom, dateTo);
        if (createdAt) where.createdAt = createdAt;

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    customer: {
                        select: mollieCustomerSelect,
                    },
                    subscription: {
                        select: {
                            id: true,
                            mollieId: true,
                            status: true,
                            description: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.payment.count({ where }),
        ]);

        return res.status(200).json(paginatedResponse(payments, total, page, limit));
    } catch (error) {
        console.error('Error fetching Mollie payments:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieExportPaymentsController = async (req: Request, res: Response) => {
    const search = queryString(req.query._q)?.trim();
    const issueOnly = queryString(req.query.issueOnly) === 'true';
    const status = queryString(req.query.status);
    const method = queryString(req.query.method);
    const dateFrom = queryString(req.query.dateFrom);
    const dateTo = queryString(req.query.dateTo);
    const where: Prisma.PaymentWhereInput = {};

    if (search) {
        where.OR = [
            { mollieId: { contains: search } },
            { description: { contains: search } },
            { customer: { email: { contains: search } } },
            { customer: { payerName: { contains: search } } },
            { subscription: { mollieId: { contains: search } } },
        ];
    }

    if (issueOnly) where.status = { in: [...molliePaymentIssueStatuses] };
    else if (status && status !== 'all') where.status = status;
    if (method && method !== 'all') where.method = method;
    const createdAt = paymentDateRangeWhere(dateFrom, dateTo);
    if (createdAt) where.createdAt = createdAt;

    const payments = await prisma.payment.findMany({
        where,
        include: {
            customer: true,
            subscription: true,
        },
        orderBy: { createdAt: 'desc' },
    });
    const csv = createCsv(
        ['Mollie ID', 'Status', 'Method', 'Amount', 'Currency', 'Description', 'Payer', 'Email', 'Subscription', 'Created at', 'Paid at'],
        payments.map((payment) => [
            payment.mollieId,
            payment.status,
            payment.method,
            payment.amountValue,
            payment.amountCurrency,
            payment.description,
            payment.customer?.payerName || [payment.customer?.givenName, payment.customer?.familyName].filter(Boolean).join(' '),
            payment.customer?.email,
            payment.subscription?.mollieId,
            payment.createdAt,
            payment.paidAt,
        ]),
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${issueOnly ? 'mollie-payment-issues' : 'mollie-payments'}-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csv);
};

export const mollieGetPaymentsMatrixController = async (req: Request, res: Response) => {
    const now = new Date();
    const startYear = resolvePaymentMatrixYear(req.query.startYear, now);
    const periodStart = new Date(Date.UTC(startYear, 8, 1));
    const periodEnd = new Date(Date.UTC(startYear + 1, 8, 1));
    const months = buildPaymentMatrixMonths(startYear);
    const createCells = createPaymentsMatrixCells(months);

    try {
        const [clients, unlinkedCustomers] = await Promise.all([
            matrixClientsQuery(periodStart, periodEnd),
            matrixUnlinkedCustomersQuery(periodStart, periodEnd),
        ]);

        const rows: MatrixRow[] = [
            ...clients.map((client) => buildMatrixClientRow(client, createCells)),
            ...unlinkedCustomers.map((customer) => buildMatrixUnlinkedRow(customer, createCells)),
        ];

        return res.status(200).json({
            startYear,
            endYear: startYear + 1,
            months,
            rows,
        });
    } catch (error) {
        console.error('Error fetching Mollie payments matrix:', error);
        return res.status(500).json({ error: 'Unable to load payments matrix' });
    }
};

export const mollieGetUpcomingSubscriptionsController = async (req: Request, res: Response) => {
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;

    if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }

    try {
        const subscriptions = await prisma.subscription.findMany({
            where: {
                status: 'active',
                nextPaymentDate: {
                    gte: new Date(`${dateFrom}T00:00:00.000Z`),
                    lte: new Date(`${dateTo}T23:59:59.999Z`),
                },
            },
            include: {
                mandate: {
                    select: {
                        mollieId: true,
                        status: true,
                        method: true,
                    },
                },
                customer: {
                    select: mollieCustomerSelect,
                },
            },
            orderBy: { nextPaymentDate: 'asc' },
        });

        return res.status(200).json({
            items: subscriptions,
            total: subscriptions.length,
            amount: subscriptions.reduce((total, subscription) => total + Number(subscription.amountValue), 0),
            currency: subscriptions[0]?.amountCurrency ?? 'EUR',
        });
    } catch (error) {
        console.error('Error fetching upcoming Mollie subscriptions:', error);
        return res.status(500).json({ error: 'Unable to load upcoming subscriptions' });
    }
};

export const mollieCreateCustomerPaymentLinkController = async (req: Request, res: Response) => {
    const customerId = Number(req.params.customerId);
    const parsedBody = paymentLinkSchema.safeParse(req.body);

    if (!customerId || !parsedBody.success) {
        return res.status(400).json({
            error: 'Invalid payment link data',
            details: parsedBody.success ? undefined : parsedBody.error.flatten(),
        });
    }

    try {
        const customer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                mollieId: { not: null },
                clientLinks: {
                    some: { clientId: parsedBody.data.clientId },
                },
            },
            select: {
                mollieId: true,
            },
        });

        if (!customer?.mollieId) {
            return res.status(404).json({ error: 'Linked Mollie customer not found' });
        }

        const payment = await mollieService.createCustomerPaymentLink({
            customerId: customer.mollieId,
            amountValue: parsedBody.data.amountValue.toFixed(2),
            description: parsedBody.data.description,
            redirectUrl: mollieService.getPaymentReturnUrl(),
        });
        await mollieSyncService.syncMolliePayment(payment);

        const checkoutUrl = payment.getCheckoutUrl();

        if (!checkoutUrl) {
            return res.status(502).json({ error: 'Mollie did not return a checkout URL' });
        }

        return res.status(201).json({
            paymentId: payment.id,
            checkoutUrl,
            status: payment.status,
        });
    } catch (error) {
        console.error('Error creating Mollie payment link:', error);
        return res.status(500).json({ error: 'Unable to create payment link' });
    }
}

export const mollieDownloadPaymentInvoiceController = async (req: Request, res: Response) => {
    const paymentId = Number(req.params.paymentId);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
        return res.status(400).json({ error: 'Invalid payment id' });
    }

    const result = await createMolliePaymentInvoicePdf(paymentId);
    if (!result) {
        return res.status(404).json({ error: 'Mollie payment not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    result.document.pipe(res);
    result.document.end();
};

export const mollieCancelPaymentController = async (req: Request, res: Response) => {
    const paymentId = Number(req.params.paymentId);
    const clientId = Number(req.body?.clientId);

    if (!paymentId || !clientId) {
        return res.status(400).json({ error: 'Payment ID and client ID are required' });
    }

    try {
        const payment = await prisma.payment.findFirst({
            where: {
                id: paymentId,
                checkoutUrl: { not: null },
                customer: {
                    clientLinks: {
                        some: { clientId },
                    },
                },
            },
            select: {
                mollieId: true,
                isCancelable: true,
            },
        });

        if (!payment?.mollieId) {
            return res.status(404).json({ error: 'Payment link not found' });
        }

        if (!payment.isCancelable) {
            return res.status(409).json({ error: 'Payment can no longer be canceled' });
        }

        const canceledPayment = await mollieService.cancelPaymentById(payment.mollieId);
        await mollieSyncService.syncMolliePayment(canceledPayment);

        return res.status(200).json({
            paymentId: canceledPayment.id,
            status: canceledPayment.status,
        });
    } catch (error) {
        console.error('Error canceling Mollie payment:', error);
        return res.status(500).json({ error: 'Unable to cancel payment' });
    }
}

const buildPaymentIncidentWhere = (
    search: string | undefined,
    resolvedPaymentIds: number[],
): Prisma.PaymentWhereInput => {
    const where: Prisma.PaymentWhereInput = {
        id: resolvedPaymentIds.length ? { notIn: resolvedPaymentIds } : undefined,
        status: {
            in: [...molliePaymentIssueStatuses],
        },
    };

    if (search) {
        where.OR = [
            { mollieId: { contains: search } },
            { description: { contains: search } },
            { customer: { email: { contains: search } } },
            { customer: { givenName: { contains: search } } },
            { customer: { familyName: { contains: search } } },
            { customer: { payerName: { contains: search } } },
            { customer: { client: { firstName: { contains: search } } } },
            { customer: { client: { lastName: { contains: search } } } },
            { customer: { client: { email: { contains: search } } } },
            { subscription: { mollieId: { contains: search } } },
        ];
    }

    return where;
};

const buildSubscriptionIncidentWhere = (
    search: string | undefined,
    resolvedSubscriptionIds: number[],
): Prisma.SubscriptionWhereInput => {
    const where: Prisma.SubscriptionWhereInput = {
        id: resolvedSubscriptionIds.length ? { notIn: resolvedSubscriptionIds } : undefined,
        OR: [
            { mandateId: null },
            { mandate: { status: { not: 'valid' } } },
        ],
        status: {
            in: ['active', 'pending', 'suspended'],
        },
    };

    if (search) {
        where.AND = [
            {
                OR: [
                    { mollieId: { contains: search } },
                    { description: { contains: search } },
                    { customer: { email: { contains: search } } },
                    { customer: { givenName: { contains: search } } },
                    { customer: { familyName: { contains: search } } },
                    { customer: { client: { firstName: { contains: search } } } },
                    { customer: { client: { lastName: { contains: search } } } },
                    { customer: { client: { email: { contains: search } } } },
                    { customer: { clientLinks: { some: { client: { firstName: { contains: search } } } } } },
                    { customer: { clientLinks: { some: { client: { lastName: { contains: search } } } } } },
                    { customer: { clientLinks: { some: { client: { email: { contains: search } } } } } },
                ],
            },
        ];
    }

    return where;
};

const buildCustomerIncidentWhere = (
    search: string | undefined,
    resolvedCustomerIds: number[],
): Prisma.CustomerWhereInput => {
    const where: Prisma.CustomerWhereInput = {
        id: resolvedCustomerIds.length ? { notIn: resolvedCustomerIds } : undefined,
        OR: [
            { email: null },
            { email: '' },
            { clientLinks: { none: {} } },
        ],
    };

    if (search) {
        where.AND = [
            {
                OR: [
                    { mollieId: { contains: search } },
                    { givenName: { contains: search } },
                    { familyName: { contains: search } },
                    { payerName: { contains: search } },
                    { client: { firstName: { contains: search } } },
                    { client: { lastName: { contains: search } } },
                    { client: { email: { contains: search } } },
                    { clientLinks: { some: { client: { firstName: { contains: search } } } } },
                    { clientLinks: { some: { client: { lastName: { contains: search } } } } },
                    { clientLinks: { some: { client: { email: { contains: search } } } } },
                ],
            },
        ];
    }

    return where;
};

const mapPaymentIncident = (payment: {
    id: number;
    status: string;
    amountValue: Prisma.Decimal;
    amountCurrency: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    customer: unknown;
    subscription: unknown;
}) => ({
    id: `payment-${payment.id}`,
    type: 'payment',
    severity: payment.status === 'charged_back' ? 'critical' : 'warning',
    title: `Платёж ${payment.status}`,
    status: payment.status,
    amountValue: payment.amountValue,
    amountCurrency: payment.amountCurrency,
    description: payment.description,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    customer: payment.customer,
    subscription: payment.subscription,
    payment,
});

const mapSubscriptionIncident = (subscription: {
    id: number;
    status: string;
    amountValue: Prisma.Decimal;
    amountCurrency: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    customer: unknown;
    mandate: unknown;
}) => ({
    id: `subscription-${subscription.id}`,
    type: 'subscription',
    severity: 'warning',
    title: 'Подписка без valid mandate',
    status: subscription.status,
    amountValue: subscription.amountValue,
    amountCurrency: subscription.amountCurrency,
    description: subscription.description,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    customer: subscription.customer,
    subscription,
    mandate: subscription.mandate,
});

const mapCustomerIncident = (customer: {
    id: number;
    mollieId: string;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
    clientLinks: unknown[];
}) => ({
    id: `customer-${customer.id}`,
    type: 'customer',
    severity: 'info',
    title: customer.email && !customer.clientLinks.length ? 'Платёжный профиль без ученика' : 'Платёжный профиль без email',
    status: customer.email && !customer.clientLinks.length ? 'missing_crm_client' : 'missing_email',
    description: customer.mollieId,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    customer,
});

const incidentCustomerSelect = {
    id: true,
    mollieId: true,
    email: true,
    givenName: true,
    familyName: true,
    payerName: true,
    payerRelation: true,
    linkSource: true,
    client: {
        select: customerClientSelect,
    },
    clientLinks: {
        select: {
            id: true,
            payerRelation: true,
            linkSource: true,
            isPrimary: true,
            client: {
                select: customerClientSelect,
            },
        },
    },
    createdAt: true,
    updatedAt: true,
} as const;

const includePaymentRelations = {
    customer: {
        select: mollieCustomerSelect,
    },
    subscription: {
        select: {
            id: true,
            mollieId: true,
            status: true,
            description: true,
        },
    },
} as const;

const includeSubscriptionRelations = {
    customer: {
        select: mollieCustomerSelect,
    },
    mandate: {
        select: {
            id: true,
            mollieId: true,
            status: true,
            method: true,
        },
    },
} as const;

const loadIncidentResolvedIds = async () => {
    const resolutions = await prisma.mollieIncidentResolution.findMany({
        select: {
            incidentType: true,
            sourceId: true,
        },
    });
    return {
        payment: resolutions.filter((item) => item.incidentType === 'payment').map((item) => item.sourceId),
        subscription: resolutions.filter((item) => item.incidentType === 'subscription').map((item) => item.sourceId),
        customer: resolutions.filter((item) => item.incidentType === 'customer').map((item) => item.sourceId),
    };
};

const incidentTotals = (counts: { payments: number; subscriptions: number; customers: number }) => ({
    payments: counts.payments,
    subscriptions: counts.subscriptions,
    customers: counts.customers,
    total: counts.payments + counts.subscriptions + counts.customers,
});

const incidentPaginatedResponse = (
    items: unknown[],
    totals: { payments: number; subscriptions: number; customers: number; total: number },
    total: number,
    page: number,
    limit: number,
) => ({
    ...paginatedResponse(items, total, page, limit),
    totals,
});

const loadPaymentIncidents = async (
    where: Prisma.PaymentWhereInput,
    page: number,
    limit: number,
) => {
    const [items, total] = await Promise.all([
        prisma.payment.findMany({
            where,
            include: includePaymentRelations,
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.payment.count({ where }),
    ]);
    return { items, total };
};

const loadSubscriptionIncidents = async (
    where: Prisma.SubscriptionWhereInput,
    page: number,
    limit: number,
) => {
    const [items, total] = await Promise.all([
        prisma.subscription.findMany({
            where,
            include: includeSubscriptionRelations,
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.subscription.count({ where }),
    ]);
    return { items, total };
};

const loadCustomerIncidents = async (
    where: Prisma.CustomerWhereInput,
    page: number,
    limit: number,
) => {
    const [items, total] = await Promise.all([
        prisma.customer.findMany({
            where,
            select: incidentCustomerSelect,
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.customer.count({ where }),
    ]);
    return { items, total };
};

const loadCombinedIncidents = async (
    paymentWhere: Prisma.PaymentWhereInput,
    subscriptionWhere: Prisma.SubscriptionWhereInput,
    customerWhere: Prisma.CustomerWhereInput,
) => {
    const [payments, subscriptions, customers] = await Promise.all([
        prisma.payment.findMany({
            where: paymentWhere,
            include: includePaymentRelations,
            orderBy: { updatedAt: 'desc' },
            take: 10,
        }),
        prisma.subscription.findMany({
            where: subscriptionWhere,
            include: includeSubscriptionRelations,
            orderBy: { updatedAt: 'desc' },
            take: 10,
        }),
        prisma.customer.findMany({
            where: customerWhere,
            select: incidentCustomerSelect,
            orderBy: { updatedAt: 'desc' },
            take: 10,
        }),
    ]);
    return { payments, subscriptions, customers };
};

export const mollieGetPaymentIncidentsController = async (req: Request, res: Response) => {
    try {
        const search = queryString(req.query._q)?.trim();
        const type = queryString(req.query.type) ?? 'all';
        const page = Math.max(Number(queryString(req.query._page) ?? 1), 1);
        const limit = Math.min(Math.max(Number(queryString(req.query._limit) ?? 25), 1), 100);
        const resolvedIds = await loadIncidentResolvedIds();

        const paymentWhere = buildPaymentIncidentWhere(search, resolvedIds.payment);
        const subscriptionWhere = buildSubscriptionIncidentWhere(search, resolvedIds.subscription);
        const customerWhere = buildCustomerIncidentWhere(search, resolvedIds.customer);

        const counts = await Promise.all([
            prisma.payment.count({ where: paymentWhere }),
            prisma.subscription.count({ where: subscriptionWhere }),
            prisma.customer.count({ where: customerWhere }),
        ]);
        const totals = incidentTotals({
            payments: counts[0],
            subscriptions: counts[1],
            customers: counts[2],
        });

        if (type === 'payments') {
            const { items, total } = await loadPaymentIncidents(paymentWhere, page, limit);
            return res.status(200).json(
                incidentPaginatedResponse(items.map(mapPaymentIncident), totals, total, page, limit),
            );
        }

        if (type === 'subscriptions') {
            const { items, total } = await loadSubscriptionIncidents(subscriptionWhere, page, limit);
            return res.status(200).json(
                incidentPaginatedResponse(items.map(mapSubscriptionIncident), totals, total, page, limit),
            );
        }

        if (type === 'customers') {
            const { items, total } = await loadCustomerIncidents(customerWhere, page, limit);
            return res.status(200).json(
                incidentPaginatedResponse(items.map(mapCustomerIncident), totals, total, page, limit),
            );
        }

        const { payments, subscriptions, customers } = await loadCombinedIncidents(
            paymentWhere,
            subscriptionWhere,
            customerWhere,
        );

        const items = [
            ...payments.map(mapPaymentIncident),
            ...subscriptions.map(mapSubscriptionIncident),
            ...customers.map(mapCustomerIncident),
        ].sort((first, second) => (
            new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
        )).slice((page - 1) * limit, page * limit);

        return res.status(200).json(
            incidentPaginatedResponse(items, totals, totals.total, page, limit),
        );
    } catch (error) {
        console.error('Error fetching Mollie payment incidents:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieResolveIncidentController = async (req: AuthenticatedRequest, res: Response) => {
    const incidentKey = req.params.incidentKey;
    const parsedIncident = parseIncidentKey(incidentKey);

    if (!parsedIncident) {
        return res.status(400).json({ error: 'Invalid incident key' });
    }

    const { incidentType, sourceId } = parsedIncident;

    const resolution = await prisma.mollieIncidentResolution.upsert({
        where: { incidentKey },
        update: {
            resolvedById: req.user.id,
            note: typeof req.body?.note === 'string' ? req.body.note.trim() || null : null,
            resolvedAt: new Date(),
        },
        create: {
            incidentKey,
            incidentType,
            sourceId,
            resolvedById: req.user.id,
            note: typeof req.body?.note === 'string' ? req.body.note.trim() || null : null,
        },
    });

    return res.status(200).json(resolution);
};

export const mollieDashboardSummaryController = async (req: Request, res: Response) => {
    try {
        const summary = await mollieDashboardService.getMollieDashboardSummary();
        return res.status(200).json(summary);
    } catch (error) {
        console.error('Error fetching Mollie dashboard summary:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieSyncCustomersController = async (req: Request, res: Response) => {
    try {
        const result = await mollieSyncService.syncMollieCustomers();
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error syncing Mollie customers:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieSyncPaymentsController = async (req: Request, res: Response) => {
    try {
        const result = await mollieSyncService.syncMolliePayments();
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error syncing Mollie payments:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieSyncMandatesController = async (req: Request, res: Response) => {
    try {
        const result = await mollieSyncService.syncMollieMandates();
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error syncing Mollie mandates:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieSyncSubscriptionsController = async (req: Request, res: Response) => {
    try {
        const result = await mollieSyncService.syncMollieSubscriptions();
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error syncing Mollie subscriptions:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieSyncAllController = async (req: Request, res: Response) => {
    try {
        const result = await mollieSyncService.syncAllMollieData();
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error syncing Mollie data:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// MANDATES
export const mollieCreateMandateController = async (req: Request<{}, {}, MandateFormData>, res: Response) => {
    const parsedBody = createMandateSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json({
            error: 'Invalid mandate data',
            details: parsedBody.error.flatten(),
        });
    }

    try {
        const { customerId, signatureDate, method, consumerName, consumerAccount, consumerBic } = parsedBody.data;
        const client = await getCostomerByMollieId(customerId);

        if (!client) {
            return res.status(400).json({ message: 'Client ID is required' });
        }

        const mandate = await mollieService.createMandate({
            customerId,
            method: method as MandateMethod,
            consumerName,
            consumerAccount,
            consumerBic,
            signatureDate,
            mandateReference: `MANDATE-${customerId}-${Date.now()}`
        });

        await mollieSyncService.syncMollieMandate(client.id, mandate);
        const savedMandate = await prisma.mandate.findUnique({ where: { mollieId: mandate.id } });

        return res.status(201).json(savedMandate);

    } catch (error) {
        console.error('Error creating Mollie mandate:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const mollieGetMandateByIdController = async (req: Request, res: Response) => {
    const { mandateId, customerId } = req.params;

    try {
        const mandate = await mollieService.getMandateById(mandateId, customerId);
        return res.status(200).json(mandate);
    } catch (error) {
        console.error('Error fetching Mollie mandate by ID:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const mollieGetMandatesController = async (req: Request, res: Response) => {
    const { customerId } = req.params;

    try {
        const customer = await prisma.customer.findUnique({
            where: { id: Number(customerId) },
            include: {
                mandates: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!customer?.mollieId) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        return res.status(200).json(customer.mandates.map((mandate) => ({
            id: mandate.mollieId,
            customerId: customer.mollieId,
            status: mandate.status,
            method: mandate.method,
            signatureDate: mandate.signatureDate,
            mandateReference: mandate.mandateReference,
            createdAt: mandate.createdAt,
            updatedAt: mandate.updatedAt,
        })));
    } catch (error) {
        console.error('Error fetching Mollie mandates:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const mollieCreateMandateSubscriptionController = async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const parsedBody = createSubscriptionSchema.safeParse({
        ...req.body,
        customerId: req.body?.customerId ?? customerId,
    });

    if (!parsedBody.success) {
        return res.status(400).json({
            error: 'Invalid subscription data',
            details: parsedBody.error.flatten(),
        });
    }

    try {
        const data = parsedBody.data;
        const customer = await prisma.customer.findUnique({
            where: { mollieId: data.customerId },
            include: {
                mandates: {
                    where: {
                        mollieId: data.mandateId,
                        status: 'valid',
                    },
                },
            },
        });

        if (!customer?.mollieId) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const mandate = customer.mandates[0];

        if (!mandate) {
            return res.status(409).json({ error: 'Selected valid mandate not found for customer' });
        }

        const subscription = await mollieService.createMandateSubscription(customer.mollieId, {
            customerId: data.customerId!,
            mandateId: data.mandateId!,
            amount: {
                currency: 'EUR',
                value: data.amount!.value!,
            },
            times: data.times,
            interval: data.interval!,
            startDate: data.startDate!,
            description: data.description!,
        });

        await mollieSyncService.syncMollieSubscription(customer.id, subscription);
        return res.status(201).json(subscription);
    } catch (error) {
        console.error('Error creating Mollie mandate subscription:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieGetAllSubscriptionByCustomerIdController = async (req: Request, res: Response) => {
    const { customerId } = req.params;

    try {
        const customer = await prisma.customer.findUnique({
            where: { id: Number(customerId) },
            include: {
                subscriptions: {
                    include: { mandate: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!customer?.mollieId) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        return res.status(200).json(customer.subscriptions.map((subscription) => ({
            id: subscription.mollieId,
            customerId: customer.mollieId,
            mandateId: subscription.mandate?.mollieId,
            amount: {
                currency: subscription.amountCurrency,
                value: String(subscription.amountValue),
            },
            times: subscription.times,
            interval: subscription.interval,
            startDate: subscription.startDate,
            nextPaymentDate: subscription.nextPaymentDate,
            description: subscription.description,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
            status: subscription.status,
        })));
    } catch (error) {
        console.error('Error creating Mollie mandate subscription:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieDeleteSubscriptionByIdController = async (req: Request, res: Response) => {
    const { subscriptionId } = req.params;
    const { customerId } = req.body;

    try {

        if (!customerId) {
            return res.status(400).json({ error: "customerId is required" });
        }

        const subscriptionToCancel = await prisma.subscription.findFirst({
            where: {
                mollieId: subscriptionId,
                customerId: Number(customerId),
                status: 'active',
            },
            include: {
                customer: true,
            },
        });

        if (!subscriptionToCancel?.customer?.mollieId) {
            return res.status(409).json({ error: "Only active subscriptions can be canceled" });
        }

        const deletedSubscription = await mollieService.deleteSubscriptionById(
            subscriptionToCancel.customer.mollieId,
            subscriptionId,
        );

        const subscription = await prisma.subscription.update({
            where: { mollieId: subscriptionId },
            data: {
                status: deletedSubscription?.status ?? 'canceled',
            },
        });

        return res.status(200).json({ message: "Subscription cancelled", deletedSubscription, subscription });
    } catch (error) {
        console.error('Error deleting Mollie subscription:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const mollieUpdateSubscriptionController = async (req: Request, res: Response) => {
    const subscriptionId = req.params.subscriptionId;
    const parsedBody = updateSubscriptionSchema.safeParse(req.body);

    if (!subscriptionId || !parsedBody.success) {
        return res.status(400).json({
            error: 'Invalid subscription data',
            details: parsedBody.success ? undefined : parsedBody.error.flatten(),
        });
    }

    try {
        const current = await prisma.subscription.findFirst({
            where: {
                mollieId: subscriptionId,
                customerId: parsedBody.data.customerId,
                status: 'active',
            },
            include: {
                customer: true,
            },
        });
        const mandate = await prisma.mandate.findFirst({
            where: {
                mollieId: parsedBody.data.mandateId,
                customerId: parsedBody.data.customerId,
                status: 'valid',
            },
        });

        if (!current?.customer.mollieId) {
            return res.status(409).json({ error: 'Only active subscriptions can be updated' });
        }

        if (!mandate) {
            return res.status(409).json({ error: 'Selected valid mandate not found for customer' });
        }

        const requestedPaymentDate = parsedBody.data.startDate;
        const currentPaymentDate = current.nextPaymentDate?.toISOString().slice(0, 10);

        if (currentPaymentDate && requestedPaymentDate !== currentPaymentDate) {
            const canceled = await mollieService.deleteSubscriptionById(
                current.customer.mollieId,
                subscriptionId,
            );
            await prisma.subscription.update({
                where: { id: current.id },
                data: {
                    status: canceled?.status ?? 'canceled',
                    nextPaymentDate: null,
                },
            });

            const replacement = await mollieService.createMandateSubscription(
                current.customer.mollieId,
                {
                    customerId: current.customer.mollieId,
                    mandateId: parsedBody.data.mandateId,
                    amount: {
                        currency: current.amountCurrency,
                        value: parsedBody.data.amountValue.toFixed(2),
                    },
                    times: parsedBody.data.times,
                    interval: parsedBody.data.interval,
                    startDate: requestedPaymentDate,
                    description: parsedBody.data.description,
                },
            );
            await mollieSyncService.syncMollieSubscription(current.customerId, replacement);

            return res.status(201).json({
                replaced: true,
                canceledSubscriptionId: subscriptionId,
                subscription: replacement,
            });
        }

        const updated = await mollieService.updateSubscriptionById(
            current.customer.mollieId,
            subscriptionId,
            {
                mandateId: parsedBody.data.mandateId,
                amountValue: parsedBody.data.amountValue.toFixed(2),
                interval: parsedBody.data.interval,
                times: parsedBody.data.times,
                description: parsedBody.data.description,
            },
        );
        await mollieSyncService.syncMollieSubscription(current.customerId, updated);

        return res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating Mollie subscription:', error);
        const mollieError = axios.isAxiosError(error)
            ? error.response?.data
            : undefined;
        const detail = typeof mollieError?.detail === 'string'
            ? mollieError.detail
            : error instanceof Error ? error.message : 'Unable to update subscription';

        return res.status(502).json({
            error: 'Unable to update subscription',
            detail,
        });
    }
};

export const mollieRestartSubscriptionController = async (req: Request, res: Response) => {
    const subscriptionId = req.params.subscriptionId;
    const parsedBody = restartSubscriptionSchema.safeParse(req.body);

    if (!subscriptionId || !parsedBody.success) {
        return res.status(400).json({
            error: 'Invalid restart data',
            details: parsedBody.success ? undefined : parsedBody.error.flatten(),
        });
    }

    try {
        const previous = await prisma.subscription.findFirst({
            where: {
                mollieId: subscriptionId,
                customerId: parsedBody.data.customerId,
                status: { in: ['canceled', 'cancelled', 'completed'] },
            },
            include: { customer: true },
        });
        const mandate = await prisma.mandate.findFirst({
            where: {
                mollieId: parsedBody.data.mandateId,
                customerId: parsedBody.data.customerId,
                status: 'valid',
            },
        });

        if (!previous?.customer.mollieId) {
            return res.status(409).json({ error: 'Only canceled or completed subscriptions can be restarted' });
        }

        if (!mandate) {
            return res.status(409).json({ error: 'Selected valid mandate not found for customer' });
        }

        const restarted = await mollieService.createMandateSubscription(previous.customer.mollieId, {
            customerId: previous.customer.mollieId,
            mandateId: parsedBody.data.mandateId,
            amount: {
                currency: previous.amountCurrency,
                value: Number(previous.amountValue).toFixed(2),
            },
            interval: previous.interval,
            startDate: parsedBody.data.startDate,
            description: previous.description,
        });
        await mollieSyncService.syncMollieSubscription(previous.customerId, restarted);

        return res.status(201).json(restarted);
    } catch (error) {
        console.error('Error restarting Mollie subscription:', error);
        const mollieError = axios.isAxiosError(error)
            ? error.response?.data
            : undefined;
        const detail = typeof mollieError?.detail === 'string'
            ? mollieError.detail
            : error instanceof Error ? error.message : 'Unable to restart subscription';

        return res.status(502).json({
            error: 'Unable to restart subscription',
            detail,
        });
    }
};

export const mollieRevokeMandateController = async (req: Request, res: Response) => {
    const customerId = Number(req.params.customerId);
    const mandateId = req.params.mandateId;

    if (!customerId || !mandateId) {
        return res.status(400).json({ error: 'Customer ID and mandate ID are required' });
    }

    const reconcileRevokedMandate = async (mandate: {
        id: number;
    }) => {
        const [, subscriptions] = await prisma.$transaction([
            prisma.mandate.update({
                where: { id: mandate.id },
                data: { status: 'revoked' },
            }),
            prisma.subscription.updateMany({
                where: {
                    mandateId: mandate.id,
                    status: 'active',
                },
                data: {
                    status: 'canceled',
                    nextPaymentDate: null,
                },
            }),
        ]);

        return res.status(200).json({
            mandateId,
            status: 'revoked',
            canceledSubscriptions: subscriptions.count,
            reconciled: true,
        });
    };
    const mandate = await prisma.mandate.findFirst({
        where: {
            mollieId: mandateId,
            customerId,
        },
        include: { customer: true },
    });

    if (!mandate?.customer.mollieId) {
        return res.status(404).json({ error: 'Mandate not found for customer' });
    }

    try {
        const mollieMandate = await mollieService.getMandateById(
            mandateId,
            mandate.customer.mollieId,
        );

        if (mollieMandate.status !== 'valid') {
            await prisma.mandate.update({
                where: { id: mandate.id },
                data: { status: mollieMandate.status },
            });

            return res.status(200).json({
                mandateId,
                status: mollieMandate.status,
                canceledSubscriptions: 0,
                reconciled: true,
            });
        }

        await mollieService.revokeMandateById(mandate.customer.mollieId, mandateId);
        return reconcileRevokedMandate(mandate);
    } catch (error) {
        const statusCode = error && typeof error === 'object' && 'statusCode' in error
            ? Number(error.statusCode)
            : undefined;

        if (statusCode === 410) {
            return reconcileRevokedMandate(mandate);
        }

        console.error('Error revoking Mollie mandate:', error);
        const mollieError = axios.isAxiosError(error)
            ? error.response?.data
            : undefined;
        const apiErrorMessage = error && typeof error === 'object' && 'message' in error
            && typeof error.message === 'string'
            ? error.message
            : undefined;
        const detail = typeof mollieError?.detail === 'string'
            ? mollieError.detail
            : apiErrorMessage ?? 'Unable to revoke mandate';

        return res.status(502).json({
            error: 'Unable to revoke mandate',
            detail,
        });
    }
};
