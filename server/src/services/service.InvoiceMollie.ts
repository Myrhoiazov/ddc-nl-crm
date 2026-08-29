import { InvoiceStatus, Prisma } from '@prisma/client';
import prisma from '../../prisma/prisma-client';

const toCents = (value: Prisma.Decimal | number | string) => Math.round(Number(value) * 100);

export const calculateInvoiceStatus = (invoice: {
    status: InvoiceStatus;
    dueDate: Date | null;
    paidAmountCents: number;
    creditedAmountCents: number;
    balanceDueCents: number;
}) => {
    if (invoice.status === InvoiceStatus.CANCELLED && invoice.paidAmountCents === 0) return InvoiceStatus.CANCELLED;
    if (invoice.balanceDueCents === 0) return InvoiceStatus.PAID;
    if (invoice.status === InvoiceStatus.DRAFT) return InvoiceStatus.DRAFT;
    if (invoice.dueDate && invoice.dueDate.getTime() < Date.now()) return InvoiceStatus.OVERDUE;
    if (invoice.paidAmountCents > 0 || invoice.creditedAmountCents > 0) return InvoiceStatus.PARTIALLY_PAID;
    return InvoiceStatus.ISSUED;
};

export const getMolliePaymentNetCents = (payment: {
    amountValue: Prisma.Decimal | number | string;
    refundedAmount: Prisma.Decimal | number | string;
    chargedBackAmount: Prisma.Decimal | number | string;
    status: string;
    paidAt: Date | null;
}) => {
    if (!payment.paidAt) return 0;

    const amountCents = toCents(payment.amountValue);
    const refundedCents = toCents(payment.refundedAmount);
    const storedChargebackCents = toCents(payment.chargedBackAmount);
    const chargebackCents = payment.status === 'charged_back' && storedChargebackCents === 0
        ? amountCents
        : storedChargebackCents;

    return Math.max(0, amountCents - refundedCents - chargebackCents);
};

export const reconcileInvoiceMolliePayments = async (invoiceId: number) => {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            payments: { select: { amountCents: true, paidAt: true } },
            molliePayments: {
                select: {
                    id: true,
                    mollieId: true,
                    amountValue: true,
                    refundedAmount: true,
                    chargedBackAmount: true,
                    status: true,
                    paidAt: true,
                },
            },
        },
    });
    if (!invoice) return invoice;

    const manualPaidCents = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const molliePaidCents = invoice.molliePayments.reduce((sum, payment) => sum + getMolliePaymentNetCents(payment), 0);
    const paidAmountCents = manualPaidCents + molliePaidCents;
    if (invoice.status === InvoiceStatus.CANCELLED && paidAmountCents === 0) return invoice;

    const balanceDueCents = Math.max(0, invoice.totalCents - paidAmountCents - invoice.creditedAmountCents);
    const status = calculateInvoiceStatus({ ...invoice, paidAmountCents, balanceDueCents });
    const paidAt = balanceDueCents === 0
        ? invoice.molliePayments.map((payment) => payment.paidAt).filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0]
            ?? invoice.payments.map((payment) => payment.paidAt).sort((a, b) => b.getTime() - a.getTime())[0]
            ?? invoice.paidAt
        : null;

    if (
        invoice.paidAmountCents === paidAmountCents
        && invoice.balanceDueCents === balanceDueCents
        && invoice.status === status
        && invoice.paidAt?.getTime() === paidAt?.getTime()
    ) {
        return invoice;
    }

    return prisma.$transaction(async (transaction) => {
        const updated = await transaction.invoice.update({
            where: { id: invoiceId },
            data: { paidAmountCents, balanceDueCents, status, paidAt },
        });
        await transaction.invoiceAuditLog.create({
            data: {
                invoiceId,
                action: 'MOLLIE_RECONCILED',
                oldValues: {
                    paidAmountCents: invoice.paidAmountCents,
                    balanceDueCents: invoice.balanceDueCents,
                    status: invoice.status,
                    paidAt: invoice.paidAt?.toISOString() ?? null,
                },
                newValues: {
                    paidAmountCents,
                    balanceDueCents,
                    status,
                    paidAt: paidAt?.toISOString() ?? null,
                    molliePayments: invoice.molliePayments.map((payment) => ({
                        id: payment.id,
                        mollieId: payment.mollieId,
                        status: payment.status,
                        netAmountCents: getMolliePaymentNetCents(payment),
                    })),
                },
            },
        });
        return updated;
    });
};
