import { InvoiceDocumentType, InvoiceStatus } from '@prisma/client';
import prisma from '../../prisma/prisma-client';
import { createInvoicePdf } from './service.InvoicePdf';
import { getMolliePaymentNetCents } from './service.InvoiceMollie';

const customerName = (customer: {
    payerName: string | null;
    givenName: string | null;
    familyName: string | null;
    email: string | null;
} | null) => (
    customer?.payerName
    || [customer?.givenName, customer?.familyName].filter(Boolean).join(' ')
    || customer?.email
    || 'Mollie customer'
);

export const createMolliePaymentInvoicePdf = async (paymentId: number) => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
            invoice: {
                include: {
                    items: { orderBy: { id: 'asc' } },
                },
            },
            customer: {
                select: {
                    payerName: true,
                    givenName: true,
                    familyName: true,
                    email: true,
                },
            },
        },
    });
    if (!payment) return null;

    if (payment.invoice) {
        return {
            filename: `${payment.invoice.number}.pdf`,
            document: await createInvoicePdf(payment.invoice),
        };
    }

    const totalCents = Math.round(Number(payment.amountValue) * 100);
    const paidAmountCents = getMolliePaymentNetCents(payment);
    const balanceDueCents = Math.max(0, totalCents - paidAmountCents);
    const number = `MOLLIE-${payment.mollieId ?? payment.id}`;
    const status = paidAmountCents > 0
        ? balanceDueCents === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID
        : payment.status === 'canceled' || payment.status === 'cancelled'
            ? InvoiceStatus.CANCELLED
            : InvoiceStatus.ISSUED;

    const document = await createInvoicePdf({
        id: -payment.id,
        number,
        documentType: InvoiceDocumentType.INVOICE,
        status,
        clientId: null,
        businessBrandId: null,
        parentInvoiceId: null,
        billToName: customerName(payment.customer),
        billToEmail: payment.customer?.email ?? null,
        issueDate: payment.createdAt,
        dueDate: null,
        paidAt: payment.paidAt,
        currency: payment.amountCurrency,
        totalCents,
        issuerName: process.env.INVOICE_ISSUER_NAME ?? 'Talent Center DDC',
        issuerAddress: process.env.INVOICE_ISSUER_ADDRESS ?? '',
        issuerEmail: process.env.INVOICE_ISSUER_EMAIL ?? '',
        issuerPhone: null,
        issuerWebsite: null,
        issuerLegalName: null,
        issuerKvkNumber: null,
        issuerVatNumber: null,
        issuerLogoUrl: null,
        issuerPrimaryColor: null,
        bankName: 'Mollie',
        iban: null,
        paymentReference: payment.mollieId ?? String(payment.id),
        note: [
            `Mollie status: ${payment.status}`,
            `Payment method: ${payment.method || 'unknown'}`,
            Number(payment.refundedAmount) > 0 ? `Refunded: ${payment.refundedAmount} ${payment.amountCurrency}` : null,
            Number(payment.chargedBackAmount) > 0 ? `Charged back: ${payment.chargedBackAmount} ${payment.amountCurrency}` : null,
        ].filter(Boolean).join('\n'),
        showPaymentButton: false,
        showPaymentQr: false,
        paidAmountCents,
        creditedAmountCents: 0,
        balanceDueCents,
        createdById: null,
        updatedById: null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        items: [{
            id: -payment.id,
            invoiceId: -payment.id,
            groupId: null,
            description: payment.description || `Mollie payment ${payment.mollieId ?? payment.id}`,
            period: payment.paidAt?.toLocaleDateString('nl-NL') ?? null,
            quantity: 1,
            unitPriceCents: totalCents,
            totalCents,
        }],
    });

    return { filename: `${number}.pdf`, document };
};
