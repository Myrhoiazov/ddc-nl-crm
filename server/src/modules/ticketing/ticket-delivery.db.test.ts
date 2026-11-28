import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient, TicketDeliveryStatus, TicketDeliveryType, TicketOrderStatus } from '@prisma/client';
import { createEvent, createSession, publishSession } from './event.service';
import { createPrismaHoldRepository } from './hold.repository';
import { createHold } from './hold.service';
import { createOrder } from './order.service';
import { startPayment, syncPayment } from './payment.service';
import type { PaymentConfig, RemotePayment, TicketPaymentGateway } from './payment.types';
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

const createPaidOrder = async () => {
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
    assert.ok(await startPayment(deps, order.order.id));
    assert.equal(await syncPayment(deps, remote!.id, 'WEBHOOK'), 'CONFIRMED');

    const delivery = await prisma.ticketDelivery.findFirstOrThrow({
        where: { orderId: order.order.id, type: TicketDeliveryType.TICKETS },
    });
    return { orderId: order.order.id, deliveryId: delivery.id };
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

// В выделенной БД остаются строки из предыдущих запусков. Паркуем их, чтобы воркер
// захватывал только outbox этого файла.
test.before(async () => {
    if (skip) return;
    await prisma.ticketDelivery.updateMany({
        where: { type: TicketDeliveryType.TICKETS, status: TicketDeliveryStatus.PENDING },
        data: { nextAttemptAt: new Date(Date.now() + 365 * 86_400_000) },
    });
});

test.after(async () => { await prisma.$disconnect(); });

test('two worker runs send one email with the PDF attached', { skip }, async () => {
    const { orderId, deliveryId } = await createPaidOrder();
    const { sent, mailer } = recordingMailer();
    const deps = { prisma, tokens: ticketTokens, mailer, enabled: true };
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
    const deps = { prisma, tokens: ticketTokens, mailer, enabled: true };

    const results = await Promise.all([processTicketDeliveries(deps), processTicketDeliveries(deps)]);

    assert.equal(results.filter((result: TicketDeliveryResult) => result.sent === 1).length, 1);
    assert.equal(sent.length, 1);
    assert.equal((await deliveryById(deliveryId)).status, TicketDeliveryStatus.SENT);
});

test('SMTP failures are retried with growing delays until a later attempt succeeds', { skip }, async () => {
    const { deliveryId } = await createPaidOrder();
    const { sent, mailer } = recordingMailer(MAX_TICKET_DELIVERY_ATTEMPTS - 1);
    const deps = { prisma, tokens: ticketTokens, mailer, enabled: true };
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
    const deps = { prisma, tokens: ticketTokens, mailer, enabled: true };
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
        await processTicketDeliveries({ prisma, tokens: ticketTokens, mailer, enabled: false }),
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
        await processTicketDeliveries({ prisma, tokens: ticketTokens, mailer: null, enabled: true }),
        { claimed: 0, sent: 0, failed: 0 },
    );
    const pending = await deliveryById(deliveryId);
    assert.equal(pending.status, TicketDeliveryStatus.PENDING);
    assert.equal(pending.attempts, 0);

    assert.deepEqual(
        await processTicketDeliveries({ prisma, tokens: ticketTokens, mailer, enabled: true }),
        { claimed: 1, sent: 1, failed: 0 },
    );
    assert.equal(sent.length, 1);
    assert.equal((await deliveryById(deliveryId)).status, TicketDeliveryStatus.SENT);
    assert.equal(await prisma.ticketOrder.findUniqueOrThrow({ where: { id: orderId } })
        .then((order) => order.status), TicketOrderStatus.PAID);
});
