import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient, TicketDeliveryStatus, TicketDeliveryType, TicketOrderStatus } from '@prisma/client';
import { createEvent, createSession, publishSession } from './event.service';
import { createPrismaHoldRepository } from './hold.repository';
import { createHold } from './hold.service';
import { createOrder, getOrderByAccessToken } from './order.service';
import { startPayment, syncPayment } from './payment.service';
import type { PaymentConfig, RemotePayment, TicketPaymentGateway } from './payment.types';
import { deriveRecoveryToken, hashTicketingToken } from './hold-token';
import { requestResendDelivery, requestRecoveryDelivery } from './ticket-delivery.commands';
import { processTicketDeliveries } from './ticket-delivery.service';
import type { TicketDeliveryResult, TicketMailer, TicketMailMessage } from './ticket-delivery.types';
import { MAX_TICKET_DELIVERY_ATTEMPTS, ticketDeliveryRetryDelayMs } from './ticket-delivery.policy';
import { createSeatMap, createVenue, getSeatMap, publishSeatMap } from './venue.service';

// Настоящий HTTP не нужен: проверяем outbox, SMTP-адаптер и запись статусов на выделенной MySQL.
const databaseUrl = process.env.TICKETING_TEST_DATABASE_URL;
const skip = databaseUrl ? false : 'TICKETING_TEST_DATABASE_URL is not set';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? 'mysql://unused' } } });
const config: PaymentConfig = {
    mode: 'TEST',
    returnUrl: 'https://tickets.example.test/return',
    webhookUrl: 'https://tickets.example.test/webhook',
};
const orderDeps = { prisma, tokenSecret: 'o'.repeat(32) };
const holdDeps = { ...orderDeps, repository: createPrismaHoldRepository(prisma) };
const ticketTokens = { secret: 't'.repeat(32), version: 1 };
const BUYER_EMAIL = 'buyer@example.test';

interface OrderFixture {
    orderId: number;
    orderNumber: string;
    accessToken: string;
}

const createPendingOrder = async (): Promise<OrderFixture> => {
    const venue = await createVenue(prisma, { name: `Delivery venue ${randomUUID()}` });
    const created = await createSeatMap(prisma, venue.id, {
        name: 'Hall', blocks: [{ categoryName: 'Standard', rows: 1, seatsPerRow: 2 }],
    });
    assert.equal(created.kind, 'created');
    const seatMapId = created.kind === 'created' ? created.seatMapId : 0;
    await publishSeatMap(prisma, seatMapId);
    const seatMap = await getSeatMap(prisma, seatMapId);
    assert.ok(seatMap);
    const event = await createEvent(prisma, { title: 'Delivery concert' });
    const session = await createSession(prisma, event.id, {
        seatMapId,
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        prices: [{ categoryId: seatMap.categories[0].id, priceCents: 2500 }],
    });
    assert.equal(session.kind, 'created');
    const sessionId = session.kind === 'created' ? session.sessionId : 0;
    await publishSession(prisma, sessionId);

    const held = await createHold(holdDeps, { sessionId, seatIds: [seatMap.seats[0].id] });
    assert.equal(held.kind, 'held');
    const order = await createOrder(orderDeps, {
        holdToken: held.kind === 'held' ? held.holdToken : '',
        buyer: { name: 'Test buyer', email: BUYER_EMAIL, locale: 'nl' },
    });
    assert.equal(order.kind, 'created');
    return { orderId: order.order.id, orderNumber: order.order.number, accessToken: order.accessToken };
};

const createPaidOrder = async () => {
    const { orderId, orderNumber, accessToken } = await createPendingOrder();

    let remote: RemotePayment | null = null;
    const gateway: TicketPaymentGateway = {
        async createPayment(input) {
            remote = {
                id: `tr_delivery${input.orderId}`, status: 'open', mode: input.mode,
                amountCents: input.amountCents, currency: input.currency,
                checkoutUrl: 'https://checkout.example.test', expiresAt: null, paidAt: null,
                method: null, refundedCents: 0, chargedBackCents: 0,
                metadata: { source: 'ticketing', orderId: input.orderId },
            };
            return remote;
        },
        async getPayment() {
            assert.ok(remote);
            return { ...remote, status: 'paid', paidAt: new Date() };
        },
    };
    const deps = { prisma, gateway, config, ticketTokens };
    assert.ok(await startPayment(deps, orderId));
    assert.equal(await syncPayment(deps, remote!.id, 'WEBHOOK'), 'CONFIRMED');

    const delivery = await prisma.ticketDelivery.findFirstOrThrow({
        where: { orderId, type: TicketDeliveryType.TICKETS },
    });
    return { orderId, orderNumber, accessToken, deliveryId: delivery.id };
};

const recordingMailer = (failures = 0) => {
    const sent: TicketMailMessage[] = [];
    const mailer: TicketMailer = {
        async send(message) {
            sent.push(message);
            if (sent.length <= failures) throw new Error('SMTP unavailable');
        },
    };
    return { sent, mailer };
};

const deliveryById = (id: number) => prisma.ticketDelivery.findUniqueOrThrow({ where: { id } });

const workerDeps = (mailer: TicketMailer | null, enabled = true) => ({
    prisma,
    tokens: ticketTokens,
    mailer,
    enabled,
    recoveryTokenSecret: orderDeps.tokenSecret,
    orderUrl: 'https://tickets.example.test/order',
});

const commandDeps = { prisma, tokenSecret: orderDeps.tokenSecret };

const parkDelivery = async (id: number) => prisma.ticketDelivery.update({
    where: { id },
    data: { nextAttemptAt: new Date(Date.now() + 365 * 86_400_000) },
});

const parkOrderDeliveries = async (orderId: number) => prisma.ticketDelivery.updateMany({
    where: { orderId, status: TicketDeliveryStatus.PENDING },
    data: { nextAttemptAt: new Date(Date.now() + 365 * 86_400_000) },
});

// В выделенной БД остаются строки из предыдущих запусков. Паркуем их, чтобы воркер
// захватывал только outbox этого файла.
test.before(async () => {
    if (skip) return;
    await prisma.ticketDelivery.updateMany({
        where: {
            type: { in: [TicketDeliveryType.TICKETS, TicketDeliveryType.RESEND, TicketDeliveryType.RECOVERY_LINK] },
            status: TicketDeliveryStatus.PENDING,
        },
        data: { nextAttemptAt: new Date(Date.now() + 365 * 86_400_000) },
    });
});

test.after(async () => { await prisma.$disconnect(); });

test('two worker runs send one email with the PDF attached', { skip }, async () => {
    const { orderId, deliveryId } = await createPaidOrder();
    const { sent, mailer } = recordingMailer();
    const deps = workerDeps(mailer);
    const now = new Date();

    assert.deepEqual(await processTicketDeliveries(deps, now), { claimed: 1, sent: 1, failed: 0 });
    assert.deepEqual(await processTicketDeliveries(deps, now), { claimed: 0, sent: 0, failed: 0 });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, BUYER_EMAIL);
    assert.match(sent[0].subject, /Delivery concert/);
    assert.equal(sent[0].attachments.length, 1);
    assert.equal(sent[0].attachments[0].content.subarray(0, 5).toString(), '%PDF-');
    assert.equal(sent[0].text.includes('v1.'), false);

    const delivery = await deliveryById(deliveryId);
    assert.equal(delivery.status, TicketDeliveryStatus.SENT);
    assert.equal(delivery.attempts, 1);
    assert.ok(delivery.sentAt);
    assert.equal(await prisma.ticketOrder.findUniqueOrThrow({ where: { id: orderId } })
        .then((order) => order.status), TicketOrderStatus.PAID);
});

test('concurrent worker runs never send the same outbox row twice', { skip }, async () => {
    const { deliveryId } = await createPaidOrder();
    const { sent, mailer } = recordingMailer();
    const deps = workerDeps(mailer);

    const results = await Promise.all([processTicketDeliveries(deps), processTicketDeliveries(deps)]);

    assert.equal(results.filter((result: TicketDeliveryResult) => result.sent === 1).length, 1);
    assert.equal(sent.length, 1);
    assert.equal((await deliveryById(deliveryId)).status, TicketDeliveryStatus.SENT);
});

test('SMTP failures are retried with growing delays until a later attempt succeeds', { skip }, async () => {
    const { deliveryId } = await createPaidOrder();
    const { sent, mailer } = recordingMailer(MAX_TICKET_DELIVERY_ATTEMPTS - 1);
    const deps = workerDeps(mailer);
    const start = new Date();

    let elapsed = 0;
    for (let attempt = 1; attempt <= MAX_TICKET_DELIVERY_ATTEMPTS; attempt += 1) {
        if (attempt > 1) elapsed += ticketDeliveryRetryDelayMs(attempt - 1);
        const at = new Date(start.getTime() + elapsed);
        const result = await processTicketDeliveries(deps, at);
        assert.equal(result.claimed, 1);
        const delivery = await deliveryById(deliveryId);
        assert.equal(delivery.attempts, attempt);
        if (attempt < MAX_TICKET_DELIVERY_ATTEMPTS) {
            assert.equal(delivery.status, TicketDeliveryStatus.PENDING);
            assert.equal(delivery.nextAttemptAt.getTime(), at.getTime() + ticketDeliveryRetryDelayMs(attempt));
            assert.equal(delivery.lastError, 'SMTP unavailable');
            // Повтор до истечения задержки ничего не отправляет.
            const early = new Date(at.getTime() + ticketDeliveryRetryDelayMs(attempt) - 1_000);
            assert.deepEqual(await processTicketDeliveries(deps, early), { claimed: 0, sent: 0, failed: 0 });
        }
    }

    assert.equal(sent.length, MAX_TICKET_DELIVERY_ATTEMPTS);
    const delivered = await deliveryById(deliveryId);
    assert.equal(delivered.status, TicketDeliveryStatus.SENT);
    assert.equal(delivered.attempts, MAX_TICKET_DELIVERY_ATTEMPTS);
    assert.ok(delivered.sentAt);
    assert.deepEqual(await processTicketDeliveries(deps, new Date(start.getTime() + 86_400_000)), {
        claimed: 0, sent: 0, failed: 0,
    });
});

test('a permanently failing SMTP gives up after three retries without losing the row', { skip }, async () => {
    const { orderId, deliveryId } = await createPaidOrder();
    const { sent, mailer } = recordingMailer(MAX_TICKET_DELIVERY_ATTEMPTS);
    const deps = workerDeps(mailer);
    const start = new Date();

    let elapsed = 0;
    for (let attempt = 1; attempt <= MAX_TICKET_DELIVERY_ATTEMPTS; attempt += 1) {
        if (attempt > 1) elapsed += ticketDeliveryRetryDelayMs(attempt - 1);
        const at = new Date(start.getTime() + elapsed);
        assert.equal((await processTicketDeliveries(deps, at)).claimed, 1, `attempt ${attempt} was not claimed`);
    }

    assert.equal(sent.length, MAX_TICKET_DELIVERY_ATTEMPTS);
    const failed = await deliveryById(deliveryId);
    assert.equal(failed.status, TicketDeliveryStatus.FAILED);
    assert.equal(failed.attempts, MAX_TICKET_DELIVERY_ATTEMPTS);
    assert.match(failed.lastError ?? '', /SMTP unavailable/);
    assert.deepEqual(await processTicketDeliveries(deps, new Date(start.getTime() + 86_400_000)), {
        claimed: 0, sent: 0, failed: 0,
    });
    assert.equal(await prisma.ticketOrder.findUniqueOrThrow({ where: { id: orderId } })
        .then((order) => order.status), TicketOrderStatus.PAID);
});

test('the opt-in flag blocks delivery even when a mailer is available', { skip }, async () => {
    const { deliveryId } = await createPaidOrder();
    const { sent, mailer } = recordingMailer();

    assert.deepEqual(
        await processTicketDeliveries(workerDeps(mailer, false)),
        { claimed: 0, sent: 0, failed: 0 },
    );
    assert.equal(sent.length, 0);
    assert.equal((await deliveryById(deliveryId)).status, TicketDeliveryStatus.PENDING);

    // Строка осталась доступной; убираем её из очереди, чтобы не мешать следующему тесту.
    await prisma.ticketDelivery.update({
        where: { id: deliveryId },
        data: { nextAttemptAt: new Date(Date.now() + 365 * 86_400_000) },
    });
});

test('without SMTP configuration the outbox stays pending and is sent once configured', { skip }, async () => {
    const { orderId, deliveryId } = await createPaidOrder();
    const { sent, mailer } = recordingMailer();

    assert.deepEqual(
        await processTicketDeliveries(workerDeps(null)),
        { claimed: 0, sent: 0, failed: 0 },
    );
    const pending = await deliveryById(deliveryId);
    assert.equal(pending.status, TicketDeliveryStatus.PENDING);
    assert.equal(pending.attempts, 0);

    assert.deepEqual(
        await processTicketDeliveries(workerDeps(mailer)),
        { claimed: 1, sent: 1, failed: 0 },
    );
    assert.equal(sent.length, 1);
    assert.equal((await deliveryById(deliveryId)).status, TicketDeliveryStatus.SENT);
    assert.equal(await prisma.ticketOrder.findUniqueOrThrow({ where: { id: orderId } })
        .then((order) => order.status), TicketOrderStatus.PAID);
});

test('recovery queues a link only for a matching order and rotates its access token', { skip }, async () => {
    const { orderId, orderNumber, accessToken } = await createPaidOrder();

    assert.equal(await requestRecoveryDelivery(commandDeps, { orderNumber, email: 'nobody@example.test' }), false);
    assert.equal(await requestRecoveryDelivery(commandDeps, { orderNumber: 'T-NOPE', email: BUYER_EMAIL }), false);
    assert.equal(await prisma.ticketDelivery.count({ where: { orderId, type: TicketDeliveryType.RECOVERY_LINK } }), 0);

    assert.equal(await requestRecoveryDelivery(commandDeps, { orderNumber, email: BUYER_EMAIL.toUpperCase() }), true);
    assert.equal(await requestRecoveryDelivery(commandDeps, { orderNumber, email: BUYER_EMAIL }), true);
    const rows = await prisma.ticketDelivery.findMany({ where: { orderId, type: TicketDeliveryType.RECOVERY_LINK } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].recipientEmail, BUYER_EMAIL);
    assert.equal(rows[0].createdById, null);

    const recoveryToken = deriveRecoveryToken(orderDeps.tokenSecret, orderId);
    const stored = await prisma.ticketOrder.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(stored.accessTokenHash, hashTicketingToken(recoveryToken));
    assert.ok(await getOrderByAccessToken(orderDeps, recoveryToken));
    assert.equal(await getOrderByAccessToken(orderDeps, accessToken), null);

    // Обе строки этого заказа остаются PENDING: паркуем их, чтобы их не захватил следующий тест.
    await parkOrderDeliveries(orderId);
});

test('the worker emails a recovery link with the token in the fragment and no attachment', { skip }, async () => {
    const { orderId, orderNumber } = await createPaidOrder();
    assert.equal(await requestRecoveryDelivery(commandDeps, { orderNumber, email: BUYER_EMAIL }), true);
    const ticketRow = await prisma.ticketDelivery.findFirstOrThrow({
        where: { orderId, type: TicketDeliveryType.TICKETS },
    });
    await parkDelivery(ticketRow.id);
    const recoveryRow = await prisma.ticketDelivery.findFirstOrThrow({
        where: { orderId, type: TicketDeliveryType.RECOVERY_LINK },
    });
    const { sent, mailer } = recordingMailer();

    assert.deepEqual(await processTicketDeliveries(workerDeps(mailer)), { claimed: 1, sent: 1, failed: 0 });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, BUYER_EMAIL);
    assert.equal(sent[0].attachments.length, 0);
    const link = sent[0].text.match(/https:\/\/\S+#\S+/);
    assert.ok(link);
    const url = new URL(link[0]);
    assert.equal(url.pathname, '/order');
    assert.equal(url.hash, `#order=${deriveRecoveryToken(orderDeps.tokenSecret, orderId)}`);
    assert.equal((await deliveryById(recoveryRow.id)).status, TicketDeliveryStatus.SENT);
});

test('staff resend enqueues the PDF and writes an audit log, but unpaid orders are untouched', { skip }, async () => {
    const pending = await createPendingOrder();
    assert.equal(await requestResendDelivery(commandDeps, { orderId: pending.orderId, actorId: 7 }), false);
    assert.equal(await prisma.ticketDelivery.count({ where: { orderId: pending.orderId, type: TicketDeliveryType.RESEND } }), 0);
    assert.equal(await prisma.ticketAuditLog.count({ where: { entityType: 'TICKET_ORDER', entityId: pending.orderId } }), 0);

    const paid = await createPaidOrder();
    assert.equal(await requestResendDelivery(commandDeps, { orderId: paid.orderId, actorId: 7 }), true);
    const row = await prisma.ticketDelivery.findFirstOrThrow({
        where: { orderId: paid.orderId, type: TicketDeliveryType.RESEND },
    });
    assert.equal(row.recipientEmail, BUYER_EMAIL);
    assert.equal(row.createdById, 7);
    const logs = await prisma.ticketAuditLog.findMany({
        where: { entityType: 'TICKET_ORDER', entityId: paid.orderId },
    });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'TICKETS_RESEND');
    assert.equal(logs[0].actorId, 7);

    const ticketRow = await prisma.ticketDelivery.findFirstOrThrow({
        where: { orderId: paid.orderId, type: TicketDeliveryType.TICKETS },
    });
    await parkDelivery(ticketRow.id);

    const { sent, mailer } = recordingMailer();
    assert.deepEqual(await processTicketDeliveries(workerDeps(mailer)), { claimed: 1, sent: 1, failed: 0 });
    assert.equal(sent[0].to, BUYER_EMAIL);
    assert.equal(sent[0].attachments[0].content.subarray(0, 5).toString(), '%PDF-');
    assert.equal((await deliveryById(row.id)).status, TicketDeliveryStatus.SENT);
});
