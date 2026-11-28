import { TicketDeliveryStatus, TicketDeliveryType } from '@prisma/client';
import { deriveRecoveryToken } from './hold-token';
import {
    recoveryUrl,
    ticketDeliveryEmail,
    ticketDeliveryRetry,
    ticketRecoveryEmail,
} from './ticket-delivery.policy';
import type {
    TicketDeliveryDeps,
    TicketDeliveryResult,
    TicketMailMessage,
} from './ticket-delivery.types';
import { ticketPdfBuffer } from './ticket.pdf.service';
import { getPaidTicketBundleByOrderId } from './ticket.service';

// Воркер outbox. Строка захватывается условным updateMany PENDING → SENDING: два запуска
// подряд (в том числе параллельных) не отправят одно и то же письмо. Сетевой вызов всегда
// находится вне транзакции заказа, поэтому ошибка SMTP не влияет на подтверждение оплаты.

const CLAIM_BATCH_SIZE = 20;

interface ClaimedDelivery {
    id: number;
    orderId: number;
    attempts: number;
    type: TicketDeliveryType;
    recipientEmail: string;
}

// Письмо восстановления собирается из секрета и адреса витрины. Пока их нет, такие строки
// не захватываются и не расходуют попытки — как и весь outbox без SMTP.
const claimableTypes = (deps: TicketDeliveryDeps): TicketDeliveryType[] => {
    const types: TicketDeliveryType[] = [TicketDeliveryType.TICKETS, TicketDeliveryType.RESEND];
    if (deps.recoveryTokenSecret && deps.orderUrl) types.push(TicketDeliveryType.RECOVERY_LINK);
    return types;
};

const claimDueDeliveries = async (deps: TicketDeliveryDeps, now: Date): Promise<ClaimedDelivery[]> => {
    const due = await deps.prisma.ticketDelivery.findMany({
        where: {
            type: { in: claimableTypes(deps) },
            status: TicketDeliveryStatus.PENDING,
            nextAttemptAt: { lte: now },
        },
        orderBy: { nextAttemptAt: 'asc' },
        take: CLAIM_BATCH_SIZE,
        select: { id: true, orderId: true, attempts: true, type: true, recipientEmail: true },
    });

    const claims = await Promise.all(due.map((delivery) => deps.prisma.ticketDelivery.updateMany({
        where: {
            id: delivery.id,
            status: TicketDeliveryStatus.PENDING,
            nextAttemptAt: { lte: now },
        },
        data: { status: TicketDeliveryStatus.SENDING, attempts: { increment: 1 } },
    })));
    return due.filter((_, index) => claims[index].count === 1);
};

const buildTicketMail = async (
    deps: TicketDeliveryDeps,
    delivery: ClaimedDelivery,
): Promise<TicketMailMessage> => {
    const bundle = await getPaidTicketBundleByOrderId(deps, delivery.orderId);
    if (!bundle) throw new Error('Paid ticket bundle is not available');

    const content = ticketDeliveryEmail(bundle);
    const attachment = await ticketPdfBuffer(bundle);
    return {
        to: delivery.recipientEmail,
        subject: content.subject,
        text: content.text,
        html: content.html,
        attachments: [{
            filename: content.attachmentName ?? `tickets-${bundle.orderNumber}.pdf`,
            content: attachment,
            contentType: 'application/pdf',
        }],
    };
};

// Токен в outbox не хранится: он выводится из id заказа тем же секретом, которым команда
// восстановления записала его хеш в заказ.
const buildRecoveryMail = async (
    deps: TicketDeliveryDeps,
    delivery: ClaimedDelivery,
): Promise<TicketMailMessage> => {
    if (!deps.recoveryTokenSecret || !deps.orderUrl) throw new Error('Order recovery is not configured');
    const order = await deps.prisma.ticketOrder.findUniqueOrThrow({
        where: { id: delivery.orderId },
        select: { number: true },
    });
    const token = deriveRecoveryToken(deps.recoveryTokenSecret, delivery.orderId);
    const content = ticketRecoveryEmail({
        orderNumber: order.number,
        recoveryUrl: recoveryUrl(deps.orderUrl, token),
    });
    return { to: delivery.recipientEmail, subject: content.subject, text: content.text, html: content.html, attachments: [] };
};

type MailBuilder = (deps: TicketDeliveryDeps, delivery: ClaimedDelivery) => Promise<TicketMailMessage>;

const MAIL_BUILDERS: Partial<Record<TicketDeliveryType, MailBuilder>> = {
    [TicketDeliveryType.TICKETS]: buildTicketMail,
    [TicketDeliveryType.RESEND]: buildTicketMail,
    [TicketDeliveryType.RECOVERY_LINK]: buildRecoveryMail,
};

const buildMail = (deps: TicketDeliveryDeps, delivery: ClaimedDelivery): Promise<TicketMailMessage> => {
    const build = MAIL_BUILDERS[delivery.type];
    if (!build) throw new Error('Unsupported ticket delivery type');
    return build(deps, delivery);
};

export const processTicketDeliveries = async (
    deps: TicketDeliveryDeps,
    now: Date = new Date(),
): Promise<TicketDeliveryResult> => {
    // Без флага, SMTP или секрета билетов письма не отправляются, но outbox остаётся нетронутым.
    if (!deps.enabled || !deps.mailer || !deps.tokens) return { claimed: 0, sent: 0, failed: 0 };

    const claimed = await claimDueDeliveries(deps, now);
    const result: TicketDeliveryResult = { claimed: claimed.length, sent: 0, failed: 0 };

    for (const delivery of claimed) {
        try {
            const message = await buildMail(deps, delivery);
            await deps.mailer.send(message);
            await deps.prisma.ticketDelivery.update({
                where: { id: delivery.id },
                data: { status: TicketDeliveryStatus.SENT, sentAt: now, lastError: null },
            });
            result.sent += 1;
        } catch (error) {
            const attempts = delivery.attempts + 1;
            await deps.prisma.ticketDelivery.update({
                where: { id: delivery.id },
                data: ticketDeliveryRetry(attempts, now, error),
            });
            result.failed += 1;
        }
    }
    return result;
};
