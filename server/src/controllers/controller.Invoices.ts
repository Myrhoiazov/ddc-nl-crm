import { Request, Response } from 'express';
import { InvoiceDeliveryType, InvoiceDocumentType, InvoiceStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../prisma/prisma-client';
import { createInvoicePdf } from '../services/service.InvoicePdf';
import * as mollieService from '../services/service.Mollie';
import * as mollieSyncService from '../services/service.MollieSync';
import { sendInvoiceEmail } from '../services/service.InvoiceDelivery';
import { archiveInvoicePaymentLinks, ensureInvoicePaymentLink } from '../services/service.InvoicePaymentLink';

const editableStatuses = [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED] as const;
const getActorId = (req: Request) => {
    const value = (req as Request & { user?: { id?: number | string } }).user?.id;
    const actorId = Number(value);
    return Number.isInteger(actorId) && actorId > 0 ? actorId : undefined;
};

const invoiceItemSchema = z.object({
    groupId: z.coerce.number().int().positive().nullable().optional(),
    description: z.string().trim().min(1).max(191),
    period: z.string().trim().max(191).nullable().optional(),
    quantity: z.coerce.number().int().positive().max(1000).default(1),
    unitPriceCents: z.coerce.number().int().nonnegative(),
});

const createInvoiceSchema = z.object({
    clientId: z.coerce.number().int().positive().nullable().optional(),
    businessBrandId: z.coerce.number().int().positive().nullable().optional(),
    billToName: z.string().trim().min(1).max(191),
    billToEmail: z.string().trim().email().max(191).nullable().optional().or(z.literal('')),
    issueDate: z.coerce.date(),
    dueDate: z.coerce.date().nullable().optional(),
    status: z.enum(editableStatuses).default(InvoiceStatus.DRAFT),
    issuerName: z.string().trim().min(1).max(191).default('Talent Center DDC'),
    issuerAddress: z.string().trim().max(191).nullable().optional(),
    issuerEmail: z.string().trim().email().max(191).nullable().optional().or(z.literal('')),
    bankName: z.string().trim().max(191).nullable().optional(),
    iban: z.string().trim().max(191).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
    showPaymentButton: z.boolean().default(true),
    showPaymentQr: z.boolean().default(true),
    items: z.array(invoiceItemSchema).min(1).max(20),
});

type IssuerSnapshot = {
    businessBrandId?: number;
    issuerName?: string;
    issuerAddress?: string | null;
    issuerEmail?: string | null;
    issuerPhone?: string | null;
    issuerWebsite?: string | null;
    issuerLegalName?: string | null;
    issuerKvkNumber?: string | null;
    issuerVatNumber?: string | null;
    issuerLogoUrl?: string | null;
    issuerPrimaryColor?: string | null;
    bankName?: string | null;
    iban?: string | null;
};

const getIssuerSnapshot = async (businessBrandId?: number | null): Promise<IssuerSnapshot> => {
    if (!businessBrandId) return {
        issuerPhone: null,
        issuerWebsite: null,
        issuerLegalName: null,
        issuerKvkNumber: null,
        issuerVatNumber: null,
        issuerLogoUrl: null,
        issuerPrimaryColor: null,
    };
    const brand = await prisma.businessBrand.findUnique({
        where: { id: businessBrandId },
        include: { organization: true },
    });
    if (!brand || !brand.isActive) throw new Error('Выбранный бренд не найден или архивирован');
    const organizationAddress = [
        brand.organization.registrationAddress,
        brand.organization.postalCode,
        brand.organization.city,
    ].filter(Boolean).join(', ') || null;
    return {
        businessBrandId: brand.id,
        issuerName: brand.name,
        issuerAddress: brand.address ?? organizationAddress,
        issuerEmail: brand.email ?? brand.organization.email,
        issuerPhone: brand.phone ?? brand.organization.phone,
        issuerWebsite: brand.website ?? brand.organization.website,
        issuerLegalName: brand.organization.legalName,
        issuerKvkNumber: brand.organization.kvkNumber,
        issuerVatNumber: brand.organization.vatNumber,
        issuerLogoUrl: brand.logoUrl,
        issuerPrimaryColor: brand.primaryColor,
        bankName: brand.organization.bankName,
        iban: brand.organization.iban,
    };
};

const paymentSchema = z.object({
    amountCents: z.coerce.number().int().positive(),
    paidAt: z.coerce.date().optional(),
    method: z.enum(['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER']).default('OTHER'),
    reference: z.string().trim().max(191).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
});

const paidInvoiceSchema = createInvoiceSchema.omit({ status: true, showPaymentButton: true, showPaymentQr: true }).extend({
    payment: z.object({
        paidAt: z.coerce.date(),
        method: z.enum(['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER']),
        reference: z.string().trim().max(191).nullable().optional(),
        note: z.string().trim().max(2000).nullable().optional(),
    }),
});

const confirmPaidInvoiceSchema = z.object({
    paidAt: z.coerce.date(),
    method: z.enum(['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER']),
    reference: z.string().trim().max(191).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
});

const adjustmentSchema = z.object({
    kind: z.enum(['CREDIT', 'DEBIT']),
    amountCents: z.coerce.number().int().positive(),
    reason: z.string().trim().min(1).max(2000),
});

const invoiceInclude = {
    client: {
        select: { id: true, firstName: true, lastName: true, email: true },
    },
    businessBrand: {
        select: { id: true, name: true, logoUrl: true, primaryColor: true },
    },
    parentInvoice: {
        select: { id: true, number: true, documentType: true },
    },
    adjustments: {
        select: { id: true, number: true, documentType: true, totalCents: true, status: true },
        orderBy: { id: 'desc' as const },
    },
    items: {
        include: { group: { select: { id: true, name: true } } },
        orderBy: { id: 'asc' as const },
    },
    payments: {
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { paidAt: 'desc' as const },
    },
    molliePayments: {
        select: {
            id: true,
            mollieId: true,
            status: true,
            checkoutUrl: true,
            amountValue: true,
            refundedAmount: true,
            chargedBackAmount: true,
            paidAt: true,
        },
        orderBy: { createdAt: 'desc' as const },
    },
    molliePaymentLinks: {
        select: {
            id: true,
            mollieId: true,
            paymentUrl: true,
            amountCents: true,
            expiresAt: true,
            archived: true,
            paidAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' as const },
    },
    deliveries: {
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 20,
    },
    auditLogs: {
        select: {
            id: true,
            action: true,
            createdAt: true,
            actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 20,
    },
};

const snapshot = (value: unknown): Prisma.InputJsonValue => (
    JSON.parse(JSON.stringify(value, (key, nestedValue) => (
        key === 'auditLogs' ? undefined : nestedValue
    ))) as Prisma.InputJsonValue
);

const createAuditLog = (
    transaction: Prisma.TransactionClient,
    params: {
        invoiceId: number;
        action: string;
        actorId: number | undefined;
        oldValues?: unknown;
        newValues?: unknown;
    },
) => transaction.invoiceAuditLog.create({
    data: {
        invoiceId: params.invoiceId,
        action: params.action,
        actorId: params.actorId,
        ...(params.oldValues === undefined ? {} : { oldValues: snapshot(params.oldValues) }),
        ...(params.newValues === undefined ? {} : { newValues: snapshot(params.newValues) }),
    },
});

const nextDocumentNumber = async (
    transaction: Prisma.TransactionClient,
    issueDate: Date,
    prefix: 'INV' | 'CRN' | 'DBN' = 'INV',
) => {
    const year = issueDate.getFullYear();
    const numberPrefix = `${prefix}-${year}-`;
    const latest = await transaction.invoice.findFirst({
        where: { number: { startsWith: numberPrefix } },
        orderBy: { number: 'desc' },
        select: { number: true },
    });
    const sequence = latest ? Number(latest.number.slice(numberPrefix.length)) + 1 : 1;
    return `${numberPrefix}${String(sequence).padStart(3, '0')}`;
};

const calculateStatus = (invoice: {
    status: InvoiceStatus;
    dueDate: Date | null;
    paidAmountCents: number;
    creditedAmountCents: number;
    balanceDueCents: number;
}) => {
    if (invoice.status === InvoiceStatus.CANCELLED) return InvoiceStatus.CANCELLED;
    if (invoice.balanceDueCents === 0) return InvoiceStatus.PAID;
    if (invoice.status === InvoiceStatus.DRAFT) return InvoiceStatus.DRAFT;
    if (invoice.dueDate && invoice.dueDate.getTime() < Date.now()) return InvoiceStatus.OVERDUE;
    if (invoice.paidAmountCents > 0 || invoice.creditedAmountCents > 0) return InvoiceStatus.PARTIALLY_PAID;
    return InvoiceStatus.ISSUED;
};

const isFinanciallyLocked = (invoice: {
    documentType: InvoiceDocumentType;
    status: InvoiceStatus;
    paidAmountCents: number;
    creditedAmountCents: number;
}) => (
    invoice.documentType !== InvoiceDocumentType.INVOICE
    || invoice.status === InvoiceStatus.PAID
    || invoice.status === InvoiceStatus.CANCELLED
    || invoice.paidAmountCents > 0
    || invoice.creditedAmountCents > 0
);

const markOverdueInvoices = async () => {
    const overdueInvoices = await prisma.invoice.findMany({
        where: {
            status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
            dueDate: { lt: new Date() },
            balanceDueCents: { gt: 0 },
        },
        select: { id: true, status: true, dueDate: true, balanceDueCents: true },
    });
    if (!overdueInvoices.length) return 0;
    await prisma.$transaction(async (transaction) => {
        for (const invoice of overdueInvoices) {
            await transaction.invoice.update({
                where: { id: invoice.id },
                data: { status: InvoiceStatus.OVERDUE },
            });
            await createAuditLog(transaction, {
                invoiceId: invoice.id,
                action: 'MARKED_OVERDUE',
                actorId: undefined,
                oldValues: invoice,
                newValues: { ...invoice, status: InvoiceStatus.OVERDUE },
            });
        }
    });
    return overdueInvoices.length;
};

export const syncOverdueInvoices = async (_req: Request, res: Response) => {
    const count = await markOverdueInvoices();
    return res.json({ marked: count });
};

export const getInvoices = async (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const query = typeof req.query._q === 'string' ? req.query._q.trim() : '';
    const page = Math.max(Number(req.query._page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query._limit) || 15, 1), 100);
    const where: Prisma.InvoiceWhereInput = {
        ...(status && status !== 'ALL' && Object.values(InvoiceStatus).includes(status as InvoiceStatus)
            ? { status: status as InvoiceStatus }
            : {}),
        ...(query ? {
            OR: [
                { number: { contains: query } },
                { billToName: { contains: query } },
                { billToEmail: { contains: query } },
                { paymentReference: { contains: query } },
                { payments: { some: { reference: { contains: query } } } },
                { molliePayments: { some: { mollieId: { contains: query } } } },
            ],
        } : {}),
    };
    const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
            where,
            include: invoiceInclude,
            orderBy: [{ issueDate: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.invoice.count({ where }),
    ]);
    return res.json({
        items: invoices,
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
    });
};

export const createInvoice = async (req: Request, res: Response) => {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Проверьте данные инвойса', details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const actorId = getActorId(req);
    const issuerSnapshot = await getIssuerSnapshot(data.businessBrandId);
    const invoice = await prisma.$transaction(async (transaction) => {
        const number = await nextDocumentNumber(transaction, data.issueDate);
        const totalCents = data.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
        const created = await transaction.invoice.create({
            data: {
                number,
                status: data.status,
                clientId: data.clientId ?? null,
                businessBrandId: data.businessBrandId ?? null,
                billToName: data.billToName,
                billToEmail: data.billToEmail || null,
                issueDate: data.issueDate,
                dueDate: data.dueDate ?? null,
                totalCents,
                balanceDueCents: totalCents,
                issuerName: data.issuerName,
                issuerEmail: data.issuerEmail || null,
                bankName: data.bankName ?? null,
                iban: data.iban ?? null,
                paymentReference: number,
                note: data.note ?? null,
                showPaymentButton: data.showPaymentButton,
                showPaymentQr: data.showPaymentQr,
                ...issuerSnapshot,
                issuerAddress: data.issuerAddress ?? issuerSnapshot.issuerAddress ?? null,
                createdById: actorId,
                updatedById: actorId,
                items: {
                    create: data.items.map((item) => ({
                        groupId: item.groupId ?? null,
                        description: item.description,
                        period: item.period ?? null,
                        quantity: item.quantity,
                        unitPriceCents: item.unitPriceCents,
                        totalCents: item.quantity * item.unitPriceCents,
                    })),
                },
            },
            include: invoiceInclude,
        });
        await createAuditLog(transaction, {
            invoiceId: created.id,
            action: 'CREATED',
            actorId,
            oldValues: undefined,
            newValues: created,
        });
        return created;
    });
    return res.status(201).json(invoice);
};

export const createPaidInvoice = async (req: Request, res: Response) => {
    const parsed = paidInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Проверьте данные оплаченного инвойса', details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const actorId = getActorId(req);
    const issuerSnapshot = await getIssuerSnapshot(data.businessBrandId);
    const invoice = await prisma.$transaction(async (transaction) => {
        const number = await nextDocumentNumber(transaction, data.issueDate);
        const totalCents = data.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
        if (totalCents <= 0) throw new Error('Сумма оплаченного инвойса должна быть больше нуля');
        const created = await transaction.invoice.create({
            data: {
                number,
                status: InvoiceStatus.PAID,
                clientId: data.clientId ?? null,
                businessBrandId: data.businessBrandId ?? null,
                billToName: data.billToName,
                billToEmail: data.billToEmail || null,
                issueDate: data.issueDate,
                dueDate: data.dueDate ?? null,
                paidAt: data.payment.paidAt,
                totalCents,
                paidAmountCents: totalCents,
                balanceDueCents: 0,
                issuerName: data.issuerName,
                issuerEmail: data.issuerEmail || null,
                bankName: data.bankName ?? null,
                iban: data.iban ?? null,
                paymentReference: number,
                note: data.note ?? null,
                showPaymentButton: false,
                showPaymentQr: false,
                ...issuerSnapshot,
                issuerAddress: data.issuerAddress ?? issuerSnapshot.issuerAddress ?? null,
                createdById: actorId,
                updatedById: actorId,
                items: {
                    create: data.items.map((item) => ({
                        groupId: item.groupId ?? null,
                        description: item.description,
                        period: item.period ?? null,
                        quantity: item.quantity,
                        unitPriceCents: item.unitPriceCents,
                        totalCents: item.quantity * item.unitPriceCents,
                    })),
                },
                payments: {
                    create: {
                        amountCents: totalCents,
                        paidAt: data.payment.paidAt,
                        method: data.payment.method,
                        reference: data.payment.reference || null,
                        note: data.payment.note || null,
                        createdById: actorId,
                    },
                },
            },
            include: invoiceInclude,
        });
        await createAuditLog(transaction, {
            invoiceId: created.id,
            action: 'CREATED_PAID',
            actorId,
            oldValues: undefined,
            newValues: created,
        });
        return created;
    });
    return res.status(201).json(invoice);
};

export const confirmPaidInvoice = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = confirmPaidInvoiceSchema.safeParse(req.body);
    if (!id || !parsed.success) {
        return res.status(400).json({
            message: 'Проверьте данные оплаты',
            details: parsed.success ? undefined : parsed.error.flatten(),
        });
    }

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Инвойс не найден' });
    if (existing.documentType !== InvoiceDocumentType.INVOICE || existing.status !== InvoiceStatus.DRAFT) {
        return res.status(409).json({ message: 'Подтвердить оплату можно только для черновика инвойса' });
    }
    if (existing.totalCents <= 0) {
        return res.status(409).json({ message: 'Сумма инвойса должна быть больше нуля' });
    }

    const actorId = getActorId(req);
    const invoice = await prisma.$transaction(async (transaction) => {
        await transaction.invoicePayment.create({
            data: {
                invoiceId: id,
                amountCents: existing.totalCents,
                paidAt: parsed.data.paidAt,
                method: parsed.data.method,
                reference: parsed.data.reference || null,
                note: parsed.data.note ?? null,
                createdById: actorId,
            },
        });
        const updated = await transaction.invoice.update({
            where: { id },
            data: {
                status: InvoiceStatus.PAID,
                paidAt: parsed.data.paidAt,
                paidAmountCents: existing.totalCents,
                balanceDueCents: 0,
                showPaymentButton: false,
                showPaymentQr: false,
                updatedById: actorId,
            },
            include: invoiceInclude,
        });
        await createAuditLog(transaction, {
            invoiceId: id,
            action: 'DRAFT_CONFIRMED_PAID',
            actorId,
            oldValues: existing,
            newValues: updated,
        });
        return updated;
    });
    return res.json(invoice);
};

export const updateInvoice = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!id || !parsed.success) {
        return res.status(400).json({
            message: 'Проверьте данные инвойса',
            details: parsed.success ? undefined : parsed.error.flatten(),
        });
    }

    const existing = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return res.status(404).json({ message: 'Инвойс не найден' });
    if (isFinanciallyLocked(existing)) {
        return res.status(409).json({ message: 'Оплаченные, скорректированные и отменённые документы нельзя редактировать' });
    }

    const data = parsed.data;
    const actorId = getActorId(req);
    const issuerSnapshot = await getIssuerSnapshot(data.businessBrandId);
    const totalCents = data.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
    const paymentTermsChanged = totalCents !== existing.totalCents
        || data.status !== existing.status
        || (data.dueDate?.getTime() ?? null) !== (existing.dueDate?.getTime() ?? null);
    if (paymentTermsChanged) {
        try {
            await archiveInvoicePaymentLinks(id);
        } catch (error) {
            console.error(`Unable to archive Mollie payment links before editing invoice ${id}:`, error);
            return res.status(502).json({
                message: 'Не удалось обновить ссылку оплаты в Mollie. Инвойс не был изменён.',
            });
        }
    }
    const invoice = await prisma.$transaction(async (transaction) => {
        await transaction.invoiceItem.deleteMany({ where: { invoiceId: id } });
        const updated = await transaction.invoice.update({
            where: { id },
            data: {
                status: data.status,
                clientId: data.clientId ?? null,
                businessBrandId: data.businessBrandId ?? null,
                billToName: data.billToName,
                billToEmail: data.billToEmail || null,
                issueDate: data.issueDate,
                dueDate: data.dueDate ?? null,
                totalCents,
                balanceDueCents: Math.max(0, totalCents - existing.paidAmountCents - existing.creditedAmountCents),
                issuerName: data.issuerName,
                issuerEmail: data.issuerEmail || null,
                bankName: data.bankName ?? null,
                iban: data.iban ?? null,
                note: data.note ?? null,
                showPaymentButton: data.showPaymentButton,
                showPaymentQr: data.showPaymentQr,
                ...issuerSnapshot,
                issuerAddress: data.issuerAddress ?? issuerSnapshot.issuerAddress ?? null,
                updatedById: actorId,
                items: {
                    create: data.items.map((item) => ({
                        groupId: item.groupId ?? null,
                        description: item.description,
                        period: item.period ?? null,
                        quantity: item.quantity,
                        unitPriceCents: item.unitPriceCents,
                        totalCents: item.quantity * item.unitPriceCents,
                    })),
                },
            },
            include: invoiceInclude,
        });
        await createAuditLog(transaction, {
            invoiceId: id,
            action: 'UPDATED',
            actorId,
            oldValues: existing,
            newValues: updated,
        });
        return updated;
    });

    return res.json(invoice);
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = z.object({ status: z.enum([InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED]) }).safeParse(req.body);
    if (!id || !parsed.success) return res.status(400).json({ message: 'Некорректный статус' });

    let existing = await prisma.invoice.findUnique({
        where: { id },
        include: {
            molliePayments: {
                select: { mollieId: true },
            },
        },
    });
    if (!existing) return res.status(404).json({ message: 'Инвойс не найден' });

    if (parsed.data.status === InvoiceStatus.CANCELLED && existing.molliePayments.length > 0) {
        try {
            const remotePayments = await Promise.all(existing.molliePayments.map(async (payment) => {
                if (!payment.mollieId) {
                    throw new Error('Связанный платёж Mollie не содержит идентификатор');
                }
                const remotePayment = await mollieService.getPaymentById(payment.mollieId);
                await mollieSyncService.syncMolliePayment(remotePayment);
                return remotePayment;
            }));

            existing = await prisma.invoice.findUnique({
                where: { id },
                include: {
                    molliePayments: {
                        select: { mollieId: true },
                    },
                },
            });
            if (!existing) return res.status(404).json({ message: 'Инвойс не найден' });
            if (isFinanciallyLocked(existing)) {
                return res.status(409).json({ message: 'Инвойс с оплатой или корректировкой нельзя отменить' });
            }

            const finalStatuses = new Set(['paid', 'canceled', 'expired', 'failed']);
            const remotelyExpiredPayments = remotePayments.filter((payment) => (
                payment.status === 'open'
                && payment.expiresAt
                && new Date(payment.expiresAt).getTime() <= Date.now()
            ));
            if (remotelyExpiredPayments.length > 0) {
                await prisma.payment.updateMany({
                    where: {
                        mollieId: { in: remotelyExpiredPayments.map((payment) => payment.id) },
                    },
                    data: {
                        status: 'expired',
                        checkoutUrl: null,
                        isCancelable: false,
                    },
                });
            }

            const remotelyExpiredIds = new Set(remotelyExpiredPayments.map((payment) => payment.id));
            const activePayments = remotePayments.filter((payment) => (
                !finalStatuses.has(payment.status) && !remotelyExpiredIds.has(payment.id)
            ));
            const nonCancelablePayment = activePayments.find((payment) => !payment.isCancelable);
            if (nonCancelablePayment) {
                return res.status(409).json({
                    message: `Mollie не разрешает отменить активный платёж ${nonCancelablePayment.id}`,
                });
            }

            for (const payment of activePayments) {
                const cancelledPayment = await mollieService.cancelPaymentById(payment.id);
                await mollieSyncService.syncMolliePayment(cancelledPayment);
            }
        } catch (error) {
            console.error(`Unable to cancel Mollie payments for invoice ${id}:`, error);
            return res.status(502).json({
                message: 'Не удалось отменить связанные платежи в Mollie. Инвойс не был отменён.',
            });
        }
    }

    if (parsed.data.status === InvoiceStatus.CANCELLED) {
        try {
            await archiveInvoicePaymentLinks(id);
        } catch (error) {
            console.error(`Unable to archive Mollie payment links for invoice ${id}:`, error);
            return res.status(502).json({
                message: 'Не удалось отключить ссылку оплаты в Mollie. Инвойс не был отменён.',
            });
        }
    }

    if (isFinanciallyLocked(existing)) {
        return res.status(409).json({ message: 'Статус оплаченного, скорректированного или отменённого документа нельзя изменить' });
    }

    const actorId = getActorId(req);
    const status = parsed.data.status;
    const invoice = await prisma.$transaction(async (transaction) => {
        const updated = await transaction.invoice.update({
            where: { id },
            data: {
                status,
                balanceDueCents: status === InvoiceStatus.CANCELLED ? 0 : existing.totalCents,
                updatedById: actorId,
            },
            include: invoiceInclude,
        });
        await createAuditLog(transaction, {
            invoiceId: id,
            action: status === InvoiceStatus.CANCELLED ? 'CANCELLED' : 'STATUS_CHANGED',
            actorId,
            oldValues: existing,
            newValues: updated,
        });
        return updated;
    });
    return res.json(invoice);
};

export const recordInvoicePayment = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = paymentSchema.safeParse(req.body);
    if (!id || !parsed.success) {
        return res.status(400).json({ message: 'Проверьте сумму оплаты', details: parsed.success ? undefined : parsed.error.flatten() });
    }

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Инвойс не найден' });
    if (
        existing.documentType === InvoiceDocumentType.CREDIT_NOTE
        || existing.status === InvoiceStatus.DRAFT
        || existing.status === InvoiceStatus.CANCELLED
    ) {
        return res.status(409).json({ message: 'Для этого документа нельзя зарегистрировать оплату' });
    }
    if (parsed.data.amountCents > existing.balanceDueCents) {
        return res.status(409).json({ message: 'Сумма оплаты превышает остаток задолженности' });
    }

    try {
        await archiveInvoicePaymentLinks(id);
    } catch (error) {
        console.error(`Unable to archive Mollie payment links before recording payment for invoice ${id}:`, error);
        return res.status(502).json({
            message: 'Не удалось обновить ссылку оплаты в Mollie. Оплата не была зарегистрирована.',
        });
    }
    const actorId = getActorId(req);
    const invoice = await prisma.$transaction(async (transaction) => {
        const paidAmountCents = existing.paidAmountCents + parsed.data.amountCents;
        const balanceDueCents = existing.totalCents - paidAmountCents - existing.creditedAmountCents;
        const nextStatus = calculateStatus({ ...existing, paidAmountCents, balanceDueCents });
        await transaction.invoicePayment.create({
            data: {
                invoiceId: id,
                amountCents: parsed.data.amountCents,
                paidAt: parsed.data.paidAt ?? new Date(),
                method: parsed.data.method,
                reference: parsed.data.reference || null,
                note: parsed.data.note ?? null,
                createdById: actorId,
            },
        });
        const updated = await transaction.invoice.update({
            where: { id },
            data: {
                paidAmountCents,
                balanceDueCents,
                status: nextStatus,
                paidAt: balanceDueCents === 0 ? parsed.data.paidAt ?? new Date() : null,
                updatedById: actorId,
            },
            include: invoiceInclude,
        });
        await createAuditLog(transaction, {
            invoiceId: id,
            action: 'PAYMENT_RECORDED',
            actorId,
            oldValues: existing,
            newValues: {
                amountCents: parsed.data.amountCents,
                invoice: updated,
            },
        });
        return updated;
    });
    return res.status(201).json(invoice);
};

export const createInvoiceAdjustment = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = adjustmentSchema.safeParse(req.body);
    if (!id || !parsed.success) {
        return res.status(400).json({ message: 'Проверьте данные корректировки', details: parsed.success ? undefined : parsed.error.flatten() });
    }

    const original = await prisma.invoice.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ message: 'Инвойс не найден' });
    if (
        original.documentType !== InvoiceDocumentType.INVOICE
        || original.status === InvoiceStatus.DRAFT
        || original.status === InvoiceStatus.CANCELLED
    ) {
        return res.status(409).json({ message: 'Этот документ нельзя корректировать' });
    }
    if (parsed.data.kind === 'CREDIT' && parsed.data.amountCents > original.totalCents - original.creditedAmountCents) {
        return res.status(409).json({ message: 'Общая сумма кредит-нот не может превышать сумму инвойса' });
    }

    if (parsed.data.kind === 'CREDIT') {
        try {
            await archiveInvoicePaymentLinks(id);
        } catch (error) {
            console.error(`Unable to archive Mollie payment links before crediting invoice ${id}:`, error);
            return res.status(502).json({
                message: 'Не удалось обновить ссылку оплаты в Mollie. Кредит-нота не была создана.',
            });
        }
    }
    const actorId = getActorId(req);
    const adjustment = await prisma.$transaction(async (transaction) => {
        const isCredit = parsed.data.kind === 'CREDIT';
        const issueDate = new Date();
        const number = await nextDocumentNumber(transaction, issueDate, isCredit ? 'CRN' : 'DBN');
        const created = await transaction.invoice.create({
            data: {
                number,
                documentType: isCredit ? InvoiceDocumentType.CREDIT_NOTE : InvoiceDocumentType.DEBIT_NOTE,
                parentInvoiceId: original.id,
                status: isCredit ? InvoiceStatus.PAID : InvoiceStatus.ISSUED,
                clientId: original.clientId,
                billToName: original.billToName,
                billToEmail: original.billToEmail,
                issueDate,
                dueDate: isCredit ? null : original.dueDate,
                paidAt: isCredit ? issueDate : null,
                currency: original.currency,
                totalCents: parsed.data.amountCents,
                balanceDueCents: isCredit ? 0 : parsed.data.amountCents,
                issuerName: original.issuerName,
                issuerAddress: original.issuerAddress,
                issuerEmail: original.issuerEmail,
                bankName: original.bankName,
                iban: original.iban,
                paymentReference: number,
                note: parsed.data.reason,
                showPaymentButton: isCredit ? false : original.showPaymentButton,
                showPaymentQr: isCredit ? false : original.showPaymentQr,
                createdById: actorId,
                updatedById: actorId,
                items: {
                    create: {
                        description: `${isCredit ? 'Кредит-нота' : 'Корректировка'} к ${original.number}: ${parsed.data.reason}`,
                        quantity: 1,
                        unitPriceCents: parsed.data.amountCents,
                        totalCents: parsed.data.amountCents,
                    },
                },
            },
            include: invoiceInclude,
        });

        if (isCredit) {
            const creditedAmountCents = original.creditedAmountCents + parsed.data.amountCents;
            const balanceDueCents = Math.max(0, original.totalCents - original.paidAmountCents - creditedAmountCents);
            const updatedOriginal = await transaction.invoice.update({
                where: { id: original.id },
                data: {
                    creditedAmountCents,
                    balanceDueCents,
                    status: calculateStatus({ ...original, creditedAmountCents, balanceDueCents }),
                    updatedById: actorId,
                },
            });
            await createAuditLog(transaction, {
                invoiceId: original.id,
                action: 'CREDIT_NOTE_APPLIED',
                actorId,
                oldValues: original,
                newValues: {
                    creditNoteId: created.id,
                    invoice: updatedOriginal,
                },
            });
        } else {
            await createAuditLog(transaction, {
                invoiceId: original.id,
                action: 'DEBIT_NOTE_CREATED',
                actorId,
                oldValues: original,
                newValues: { debitNoteId: created.id },
            });
        }
        await createAuditLog(transaction, {
            invoiceId: created.id,
            action: 'CREATED',
            actorId,
            oldValues: undefined,
            newValues: created,
        });
        return created;
    });

    return res.status(201).json(adjustment);
};

export const getInvoiceHistory = async (req: Request, res: Response) => {
    const invoiceId = Number(req.params.id);
    if (!invoiceId) return res.status(400).json({ message: 'Некорректный инвойс' });
    const history = await prisma.invoiceAuditLog.findMany({
        where: { invoiceId },
        include: {
            actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return res.json(history);
};

export const createInvoicePaymentLink = async (req: Request, res: Response) => {
    const invoiceId = Number(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ message: 'Инвойс не найден' });
    if (
        invoice.documentType === InvoiceDocumentType.CREDIT_NOTE
        || invoice.status === InvoiceStatus.DRAFT
        || invoice.status === InvoiceStatus.CANCELLED
        || invoice.balanceDueCents <= 0
    ) {
        return res.status(409).json({ message: 'Для этого документа нельзя создать ссылку на оплату' });
    }

    const link = await ensureInvoicePaymentLink(invoice);
    if (!link) return res.status(409).json({ message: 'Для этого документа нельзя создать ссылку на оплату' });

    if (!link.reused) {
        await prisma.invoiceAuditLog.create({
            data: {
                invoiceId,
                action: 'MOLLIE_PAYMENT_LINK_CREATED',
                actorId: getActorId(req),
                newValues: {
                    molliePaymentLinkId: link.mollieId,
                    amountCents: invoice.balanceDueCents,
                    paymentUrl: link.paymentUrl,
                    expiresAt: link.expiresAt?.toISOString() ?? null,
                },
            },
        });
    }
    return res.status(link.reused ? 200 : 201).json({
        paymentId: link.mollieId,
        checkoutUrl: link.paymentUrl,
        status: link.archived ? 'archived' : 'open',
        expiresAt: link.expiresAt,
        reused: link.reused,
    });
};

const ensureInvoicePaymentUrl = async (invoice: {
    id: number;
    number: string;
    documentType: InvoiceDocumentType;
    status: InvoiceStatus;
    balanceDueCents: number;
    dueDate: Date | null;
    showPaymentButton: boolean;
    showPaymentQr: boolean;
}) => {
    const link = await ensureInvoicePaymentLink(invoice);
    return link?.paymentUrl ?? null;
};

const ensurePublicInvoicePaymentUrl = async (
    deliveryId: number,
    invoice: Parameters<typeof ensureInvoicePaymentUrl>[0],
) => {
    if (invoice.balanceDueCents <= 0 || (!invoice.showPaymentButton && !invoice.showPaymentQr)) {
        return null;
    }

    const paymentUrl = await ensureInvoicePaymentUrl(invoice);
    if (paymentUrl) {
        await prisma.invoiceDelivery.update({
            where: { id: deliveryId },
            data: { paymentUrl },
        });
    }
    return paymentUrl;
};

export const sendInvoice = async (req: Request, res: Response) => {
    const invoiceId = Number(req.params.id);
    const parsed = z.object({ resend: z.boolean().optional() }).safeParse(req.body ?? {});
    if (!invoiceId || !parsed.success) return res.status(400).json({ message: 'Некорректные данные отправки' });

    try {
        const delivery = await sendInvoiceEmail({
            invoiceId,
            type: parsed.data.resend ? InvoiceDeliveryType.RESEND : InvoiceDeliveryType.INITIAL,
            actorId: getActorId(req),
        });
        return res.status(201).json(delivery);
    } catch (error) {
        console.error('Invoice email failed:', error);
        return res.status(503).json({ message: error instanceof Error ? error.message : 'Не удалось отправить инвойс' });
    }
};

export const getInvoiceDeliveries = async (req: Request, res: Response) => {
    const invoiceId = Number(req.params.id);
    if (!invoiceId) return res.status(400).json({ message: 'Некорректный инвойс' });
    const deliveries = await prisma.invoiceDelivery.findMany({
        where: { invoiceId },
        include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return res.json(deliveries);
};

const getPublicInvoice = async (token: string) => prisma.invoiceDelivery.findUnique({
    where: { publicToken: token },
    include: {
        invoice: {
            include: {
                items: { orderBy: { id: 'asc' } },
                molliePayments: {
                    where: { checkoutUrl: { not: null }, status: { in: ['open', 'pending'] } },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        },
    },
});

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const viewPublicInvoice = async (req: Request, res: Response) => {
    const delivery = await getPublicInvoice(req.params.token);
    if (!delivery) return res.status(404).send('Invoice not found');
    await prisma.invoiceDelivery.update({
        where: { id: delivery.id },
        data: {
            firstViewedAt: delivery.firstViewedAt ?? new Date(),
            lastViewedAt: new Date(),
            viewCount: { increment: 1 },
        },
    });
    const invoice = delivery.invoice;
    let paymentUrl: string | null = null;
    try {
        paymentUrl = await ensurePublicInvoicePaymentUrl(delivery.id, invoice);
    } catch (error) {
        console.error(`Unable to create Mollie payment link for public invoice ${invoice.number}:`, error);
    }
    const items = invoice.items.map((item) => `
        <tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>€${(item.totalCents / 100).toFixed(2)}</td></tr>
    `).join('');
    return res.type('html').send(`<!doctype html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
        <title>${escapeHtml(invoice.number)}</title>
        <style>body{font-family:Arial,sans-serif;background:#f5f6f8;color:#1d1d33;margin:0;padding:32px}.card{max-width:760px;margin:auto;background:#fff;padding:32px;border-radius:16px}table{width:100%;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #eee}.bank{margin-top:24px;padding:18px;background:#f5f6f8;border-radius:10px}.bank p{margin:7px 0}.ref{font-size:18px;font-weight:bold}.hint{color:#6b7280;font-size:13px}.actions{display:flex;gap:12px;margin-top:24px}.btn{padding:12px 18px;border-radius:8px;background:#1d1d33;color:#fff;text-decoration:none}.pay{background:#b5d63d;color:#1d1d33}</style>
        </head><body><main class="card"><h1>${escapeHtml(invoice.number)}</h1><p>${escapeHtml(invoice.billToName)}</p>
        <table>${items}</table><h2>Balance due: €${(invoice.balanceDueCents / 100).toFixed(2)}</h2>
        ${invoice.balanceDueCents > 0 && invoice.iban && invoice.paymentReference ? `<section class="bank"><strong>Pay by bank transfer</strong><p>IBAN: ${escapeHtml(invoice.iban)}</p><p>Reference: <span class="ref">${escapeHtml(invoice.paymentReference)}</span></p><p class="hint">Always include this reference so we can match your payment to this invoice.</p></section>` : ''}
        <div class="actions"><a class="btn" href="/api/v1/invoices/public/${delivery.publicToken}/pdf">Download PDF</a>
        ${invoice.showPaymentButton && paymentUrl && invoice.balanceDueCents > 0 ? `<a class="btn pay" href="${escapeHtml(paymentUrl)}">Pay with Mollie</a>` : ''}</div></main></body></html>`);
};

export const downloadPublicInvoicePdf = async (req: Request, res: Response) => {
    const delivery = await getPublicInvoice(req.params.token);
    if (!delivery) return res.status(404).send('Invoice not found');
    const invoice = delivery.invoice;
    let paymentUrl: string | null = null;
    try {
        paymentUrl = await ensurePublicInvoicePaymentUrl(delivery.id, invoice);
    } catch (error) {
        console.error(`Unable to create Mollie payment link for public PDF ${invoice.number}:`, error);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
    const document = await createInvoicePdf({
        ...invoice,
        paymentUrl,
    });
    document.pipe(res);
    document.end();
};

export const downloadInvoicePdf = async (req: Request, res: Response) => {
    const invoice = await prisma.invoice.findUnique({
        where: { id: Number(req.params.id) },
        include: {
            items: { orderBy: { id: 'asc' } },
            molliePayments: {
                where: { checkoutUrl: { not: null }, status: { in: ['open', 'pending'] } },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
    });
    if (!invoice) return res.status(404).json({ message: 'Инвойс не найден' });
    let paymentUrl: string | null = null;
    if (!paymentUrl && invoice.balanceDueCents > 0 && (invoice.showPaymentButton || invoice.showPaymentQr)) {
        try {
            paymentUrl = await ensureInvoicePaymentUrl(invoice);
        } catch (error) {
            console.error(`Unable to create Mollie payment link for PDF ${invoice.number}:`, error);
        }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
    const document = await createInvoicePdf({
        ...invoice,
        paymentUrl,
    });
    document.pipe(res);
    document.end();
};
