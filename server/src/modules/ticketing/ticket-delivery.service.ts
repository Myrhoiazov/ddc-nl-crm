import { TicketDeliveryStatus, TicketDeliveryType } from '@prisma/client';
import { ticketDeliveryEmail, ticketDeliveryRetry } from './ticket-delivery.policy';
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
}

const claimDueDeliveries = async (deps: TicketDeliveryDeps, now: Date): Promise<ClaimedDelivery[]> => {
    const due = await deps.prisma.ticketDelivery.findMany({
        where: {
            type: TicketDeliveryType.TICKETS,
            status: TicketDeliveryStatus.PENDING,
            nextAttemptAt: { lte: now },
        },
        orderBy: { nextAttemptAt: 'asc' },
        take: CLAIM_BATCH_SIZE,
        select: { id: true, orderId: true, attempts: true },
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
    const row = await deps.prisma.ticketDelivery.findUniqueOrThrow({
        where: { id: delivery.id },
        select: { recipientEmail: true },
    });
    const bundle = await getPaidTicketBundleByOrderId(deps, delivery.orderId);
    if (!bundle) throw new Error('Paid ticket bundle is not available');

    const content = ticketDeliveryEmail(bundle);
    const attachment = await ticketPdfBuffer(bundle);
    return {
        to: row.recipientEmail,
        subject: content.subject,
        text: content.text,
        html: content.html,
        attachments: [{
            filename: content.attachmentName,
            content: attachment,
            contentType: 'application/pdf',
        }],
    };
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
            const message = await buildTicketMail(deps, delivery);
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
