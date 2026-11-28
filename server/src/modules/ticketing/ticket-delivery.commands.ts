import { Prisma, TicketDeliveryStatus, TicketDeliveryType, TicketOrderStatus } from '@prisma/client';
import { deriveRecoveryToken, hashTicketingToken } from './hold-token';
import type {
    RecoveryDeliveryInput,
    ResendDeliveryInput,
    TicketDeliveryCommandDeps,
    TicketResendDeps,
} from './ticket-delivery.types';

// Команды outbox: они только ставят письмо в очередь. Отправляет его воркер, поэтому ответ
// вызывающему не зависит от SMTP и не раскрывает, существует ли заказ.

export const TICKET_ORDER_AUDIT_ENTITY = 'TICKET_ORDER';
export const TICKETS_RESEND_AUDIT_ACTION = 'TICKETS_RESEND';

const sameEmail = (left: string, right: string): boolean => (
    left.trim().toLowerCase() === right.trim().toLowerCase()
);

const hasPendingDelivery = async (
    tx: Prisma.TransactionClient,
    orderId: number,
    type: TicketDeliveryType,
): Promise<boolean> => {
    const pending = await tx.ticketDelivery.findFirst({
        where: { orderId, type, status: TicketDeliveryStatus.PENDING },
        select: { id: true },
    });
    return pending !== null;
};

// Смена хеша идёт первой и блокирует строку заказа: параллельные запросы восстановления
// выстраиваются в очередь, и второй уже видит ожидающее письмо первого.
const rotateTokenAndEnqueueLink = async (
    tx: Prisma.TransactionClient,
    order: { id: number; buyerEmail: string },
    accessTokenHash: string,
): Promise<void> => {
    await tx.ticketOrder.update({ where: { id: order.id }, data: { accessTokenHash } });
    if (await hasPendingDelivery(tx, order.id, TicketDeliveryType.RECOVERY_LINK)) return;
    await tx.ticketDelivery.create({
        data: { orderId: order.id, type: TicketDeliveryType.RECOVERY_LINK, recipientEmail: order.buyerEmail },
    });
};

// Восстановление доступа: письмо уходит только на email из заказа, а прежний токен
// покупателя перестаёт действовать. false означает «заказ не найден» и наружу не выдаётся.
export const requestRecoveryDelivery = async (
    deps: TicketDeliveryCommandDeps,
    input: RecoveryDeliveryInput,
): Promise<boolean> => {
    const order = await deps.prisma.ticketOrder.findUnique({
        where: { number: input.orderNumber.trim().toUpperCase() },
        select: { id: true, buyerEmail: true },
    });
    if (!order || !sameEmail(order.buyerEmail, input.email)) return false;

    const accessTokenHash = hashTicketingToken(deriveRecoveryToken(deps.tokenSecret, order.id));
    await deps.prisma.$transaction((tx) => rotateTokenAndEnqueueLink(tx, order, accessTokenHash));
    return true;
};

const enqueueResendWithAudit = async (
    tx: Prisma.TransactionClient,
    order: { id: number; buyerEmail: string },
    actorId: number,
): Promise<void> => {
    const delivery = await tx.ticketDelivery.create({
        data: {
            orderId: order.id,
            type: TicketDeliveryType.RESEND,
            recipientEmail: order.buyerEmail,
            createdById: actorId,
        },
    });
    await tx.ticketAuditLog.create({
        data: {
            entityType: TICKET_ORDER_AUDIT_ENTITY,
            entityId: order.id,
            action: TICKETS_RESEND_AUDIT_ACTION,
            newValues: { deliveryId: delivery.id },
            actorId,
        },
    });
};

// Повторная отправка билетов персоналом. Билеты есть только у оплаченного заказа; очередь и
// запись аудита создаются одной транзакцией, чтобы отправка без следа была невозможна.
export const requestResendDelivery = async (
    deps: TicketResendDeps,
    input: ResendDeliveryInput,
): Promise<boolean> => {
    const order = await deps.prisma.ticketOrder.findUnique({
        where: { id: input.orderId },
        select: { id: true, buyerEmail: true, status: true },
    });
    if (!order || order.status !== TicketOrderStatus.PAID) return false;

    await deps.prisma.$transaction((tx) => enqueueResendWithAudit(tx, order, input.actorId));
    return true;
};
