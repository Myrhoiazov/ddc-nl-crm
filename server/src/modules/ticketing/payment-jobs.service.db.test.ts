import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createEvent, createSession, publishSession } from './event.service';
import { createPrismaHoldRepository } from './hold.repository';
import { createHold } from './hold.service';
import { createOrder, getOrderByAccessToken } from './order.service';
import { expireDueOrders, reconcileTicketPayments } from './payment-jobs.service';
import { startPayment } from './payment.service';
import type { CreateRemotePaymentParams, PaymentConfig, RemotePayment, TicketPaymentGateway } from './payment.types';
import { createSeatMap, createVenue, getSeatMap, publishSeatMap } from './venue.service';

const databaseUrl = process.env.TICKETING_TEST_DATABASE_URL;
const skip = databaseUrl ? false : 'TICKETING_TEST_DATABASE_URL is not set';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? 'mysql://unused' } } });
const config: PaymentConfig = {
    mode: 'TEST',
    returnUrl: 'https://tickets.example.test/return',
    webhookUrl: 'https://tickets.example.test/webhook',
};
const orderDeps = { prisma, tokenSecret: 'payment-job-tests' };
const holdDeps = { ...orderDeps, repository: createPrismaHoldRepository(prisma) };

const createSessionForOrder = async () => {
    const venue = await createVenue(prisma, { name: `Test venue ${randomUUID()}` });
    const map = await createSeatMap(prisma, venue.id, {
        name: 'Hall',
        blocks: [{ categoryName: 'Standard', rows: 1, seatsPerRow: 2 }],
    });
    assert.ok(map.kind === 'created');
    await publishSeatMap(prisma, map.seatMapId);
    const details = await getSeatMap(prisma, map.seatMapId);
    assert.ok(details);
    const event = await createEvent(prisma, { title: 'Payment jobs concert' });
    const session = await createSession(prisma, event.id, {
        seatMapId: map.seatMapId,
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        prices: [{ categoryId: details.categories[0].id, priceCents: 2500 }],
    });
    assert.ok(session.kind === 'created');
    await publishSession(prisma, session.sessionId);
    return { sessionId: session.sessionId, seatId: details.seats[0].id };
};

const createPendingOrder = async () => {
    const { sessionId, seatId } = await createSessionForOrder();
    const held = await createHold(holdDeps, { sessionId, seatIds: [seatId] });
    assert.ok(held.kind === 'held');
    const result = await createOrder(orderDeps, {
        holdToken: held.holdToken,
        buyer: { name: 'Test buyer', email: 'buyer@example.test', locale: 'nl' },
    });
    assert.ok(result.kind === 'created');
    return { ...result, sessionId, seatId };
};

const openPayment = (input: CreateRemotePaymentParams): RemotePayment => ({
    id: `tr_jobs${input.orderId}`, status: 'open', mode: input.mode,
    amountCents: input.amountCents, currency: input.currency, checkoutUrl: 'https://checkout.example.test',
    expiresAt: null, paidAt: null, method: null, refundedCents: 0, chargedBackCents: 0,
    metadata: { source: 'ticketing', orderId: input.orderId },
});

test.after(async () => { await prisma.$disconnect(); });

test('a due order is released after Mollie confirms cancellation', { skip }, async () => {
    const { order, accessToken, sessionId, seatId } = await createPendingOrder();
    let payment: RemotePayment;
    const gateway: TicketPaymentGateway = {
        async createPayment(input) { payment = { ...openPayment(input), isCancelable: true }; return payment; },
        async getPayment() { return payment; },
        async cancelPayment(id, mode) {
            assert.deepEqual([id, mode], [payment.id, 'TEST']);
            return { ...payment, status: 'canceled' };
        },
    };
    const deps = { prisma, gateway, config };
    await startPayment(deps, order.id);

    const now = new Date(order.paymentDeadlineAt.getTime() + 1_000);
    await expireDueOrders({ ...deps, now: () => now }, order.id - 1);

    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'EXPIRED');
    const replacement = await createHold(holdDeps, { sessionId, seatIds: [seatId] });
    assert.equal(replacement.kind, 'held');
});

test('a provider outage keeps seats until the hard deadline and later reconciliation can recover payment', { skip }, async () => {
    const { order, accessToken } = await createPendingOrder();
    let payment: RemotePayment;
    let unavailable = true;
    const gateway: TicketPaymentGateway = {
        async createPayment(input) { payment = openPayment(input); return payment; },
        async getPayment() {
            if (unavailable) throw new Error('Mollie unavailable');
            return { ...payment, status: 'paid' };
        },
    };
    const deps = { prisma, gateway, config };
    await startPayment(deps, order.id);

    const early = new Date(order.paymentDeadlineAt.getTime() + 1_000);
    await expireDueOrders({ ...deps, now: () => early }, order.id - 1);
    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'PENDING_PAYMENT');

    const late = new Date(order.paymentDeadlineAt.getTime() + 41 * 60_000);
    await expireDueOrders({ ...deps, now: () => late }, order.id - 1);
    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'EXPIRED');

    unavailable = false;
    await reconcileTicketPayments({ ...deps, now: () => late }, order.id - 1);
    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'PAID');
});

test('reconciliation recovers a created payment after the checkout response is lost', { skip }, async () => {
    const { order } = await createPendingOrder();
    let key: string | undefined;
    let payment: RemotePayment;
    const gateway: TicketPaymentGateway = {
        async createPayment(input) {
            if (key) {
                assert.equal(input.idempotencyKey, key);
                return payment;
            }
            key = input.idempotencyKey;
            payment = openPayment(input);
            throw new Error('Response was lost');
        },
        async getPayment() { return payment; },
    };
    const deps = { prisma, gateway, config };
    await assert.rejects(startPayment(deps, order.id), /Response was lost/);

    await reconcileTicketPayments(deps, order.id - 1);
    assert.equal(await startPayment(deps, order.id), 'https://checkout.example.test');
});

test('the order confirms payment when Mollie rejects cancellation after the buyer pays', { skip }, async () => {
    const { order, accessToken } = await createPendingOrder();
    let payment: RemotePayment;
    const gateway: TicketPaymentGateway = {
        async createPayment(input) { payment = { ...openPayment(input), isCancelable: true }; return payment; },
        async getPayment() { return payment; },
        async cancelPayment() {
            payment = { ...payment, status: 'paid' };
            throw new Error('Payment cannot be canceled');
        },
    };
    const deps = { prisma, gateway, config };
    await startPayment(deps, order.id);

    const now = new Date(order.paymentDeadlineAt.getTime() + 1_000);
    await expireDueOrders({ ...deps, now: () => now }, order.id - 1);
    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'PAID');
});
