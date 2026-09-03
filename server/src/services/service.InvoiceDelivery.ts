import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { InvoiceDeliveryStatus, InvoiceDeliveryType, InvoiceStatus } from '@prisma/client';
import prisma from '../../prisma/prisma-client';
import { createInvoicePdf } from './service.InvoicePdf';
import { ensureInvoicePaymentLink } from './service.InvoicePaymentLink';

const money = (cents: number, currency: string) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
}).format(cents / 100);

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const publicApiUrl = () => {
    if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL;
    if (process.env.SERVER_URL) return `${process.env.SERVER_URL}/api/v1`;
    if (process.env.MOLLIE_WEBHOOK_URL) return process.env.MOLLIE_WEBHOOK_URL.replace(/\/mollie\/webhook\/?$/, '');
    return 'http://localhost:8080/api/v1';
};

const createTransport = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
        throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD.');
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: { user, pass },
    });
};

const pdfBuffer = async (invoice: Parameters<typeof createInvoicePdf>[0]) => {
    const document = await createInvoicePdf(invoice);
    return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.end();
    });
};

const subjectFor = (invoiceNumber: string, type: InvoiceDeliveryType) => {
    if (type === InvoiceDeliveryType.REMINDER_BEFORE_DUE) return `Reminder: invoice ${invoiceNumber} is due soon`;
    if (type === InvoiceDeliveryType.REMINDER_OVERDUE) return `Payment overdue: invoice ${invoiceNumber}`;
    return `Invoice ${invoiceNumber} from Talent Center DDC`;
};

export const sendInvoiceEmail = async ({
    invoiceId,
    type,
    actorId,
}: {
    invoiceId: number;
    type: InvoiceDeliveryType;
    actorId?: number;
}) => {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            items: { orderBy: { id: 'asc' } },
        },
    });
    if (!invoice) throw new Error('Invoice not found');
    if (!invoice.billToEmail) throw new Error('Invoice recipient email is missing');
    if (invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error('Draft or cancelled invoice cannot be sent');
    }

    const resolvePaymentUrls = async () => {
        const paymentLink = invoice.balanceDueCents > 0 && (invoice.showPaymentButton || invoice.showPaymentQr)
            ? await ensureInvoicePaymentLink(invoice)
            : null;
        const paymentUrl = paymentLink?.paymentUrl ?? null;
        return { paymentUrl, emailPaymentUrl: invoice.showPaymentButton ? paymentUrl : null };
    };

    const bankTransferInstructions = () => {
        if (invoice.balanceDueCents <= 0 || !invoice.iban || !invoice.paymentReference) {
            return { text: '', html: '' };
        }
        return {
            text: `\n\nBank transfer:\nIBAN: ${invoice.iban}\nReference: ${invoice.paymentReference}\nAlways include this reference so we can match your payment to the invoice.`,
            html: `<div style="margin:20px 0;padding:16px;background:#f5f6f8;border-radius:8px">
                <strong>Pay by bank transfer</strong>
                <p style="margin:8px 0 4px">IBAN: ${escapeHtml(invoice.iban)}</p>
                <p style="margin:4px 0">Reference: <strong>${escapeHtml(invoice.paymentReference)}</strong></p>
                <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Always include this reference so we can match your payment to the invoice.</p>
            </div>`,
        };
    };

    const publicToken = crypto.randomBytes(32).toString('hex');
    const { paymentUrl, emailPaymentUrl } = await resolvePaymentUrls();
    const { text: bankTransferText, html: bankTransferHtml } = bankTransferInstructions();
    const subject = subjectFor(invoice.number, type);
    const delivery = await prisma.invoiceDelivery.create({
        data: {
            invoiceId,
            type,
            recipientEmail: invoice.billToEmail,
            subject,
            publicToken,
            paymentUrl: emailPaymentUrl,
            createdById: actorId,
        },
    });
    const viewUrl = `${publicApiUrl()}/invoices/public/${publicToken}`;

    try {
        const attachment = await pdfBuffer({ ...invoice, paymentUrl });
        const transporter = createTransport();
        await transporter.sendMail({
            from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
            to: invoice.billToEmail,
            subject,
            text: `Hello ${invoice.billToName},\n\nInvoice ${invoice.number}: ${money(invoice.balanceDueCents, invoice.currency)} due.\nView: ${viewUrl}${emailPaymentUrl ? `\nPay online: ${emailPaymentUrl}` : ''}${bankTransferText}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1d1d33">
                    <h2>${escapeHtml(subject)}</h2>
                    <p>Hello ${escapeHtml(invoice.billToName)},</p>
                    <p>Balance due: <strong>${money(invoice.balanceDueCents, invoice.currency)}</strong></p>
                    <p><a href="${escapeHtml(viewUrl)}" style="display:inline-block;padding:12px 18px;background:#1d1d33;color:#fff;text-decoration:none;border-radius:8px">View invoice</a></p>
                    ${emailPaymentUrl ? `<p><a href="${escapeHtml(emailPaymentUrl)}" style="display:inline-block;padding:12px 18px;background:#b5d63d;color:#1d1d33;text-decoration:none;border-radius:8px;font-weight:bold">Pay with Mollie</a></p>` : ''}
                    ${bankTransferHtml}
                    <p style="color:#6b7280;font-size:12px">The invoice PDF is attached to this email.</p>
                </div>
            `,
            attachments: [{ filename: `${invoice.number}.pdf`, content: attachment, contentType: 'application/pdf' }],
        });
        return prisma.invoiceDelivery.update({
            where: { id: delivery.id },
            data: { status: InvoiceDeliveryStatus.SENT, sentAt: new Date() },
        });
    } catch (error) {
        await prisma.invoiceDelivery.update({
            where: { id: delivery.id },
            data: {
                status: InvoiceDeliveryStatus.FAILED,
                errorMessage: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    }
};

export const sendDueInvoiceReminders = async () => {
    const now = new Date();
    const inThreeDays = new Date(now);
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    const invoices = await prisma.invoice.findMany({
        where: {
            billToEmail: { not: null },
            balanceDueCents: { gt: 0 },
            status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
            dueDate: { not: null },
        },
        select: { id: true, dueDate: true },
    });

    for (const invoice of invoices) {
        const type = invoice.dueDate! < now
            ? InvoiceDeliveryType.REMINDER_OVERDUE
            : invoice.dueDate! <= inThreeDays
                ? InvoiceDeliveryType.REMINDER_BEFORE_DUE
                : null;
        if (!type) continue;
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const alreadySent = await prisma.invoiceDelivery.findFirst({
            where: { invoiceId: invoice.id, type, status: InvoiceDeliveryStatus.SENT, createdAt: { gte: startOfDay } },
        });
        if (!alreadySent) {
            await sendInvoiceEmail({ invoiceId: invoice.id, type }).catch((error) => {
                console.error(`Invoice reminder failed for ${invoice.id}:`, error);
            });
        }
    }
};
