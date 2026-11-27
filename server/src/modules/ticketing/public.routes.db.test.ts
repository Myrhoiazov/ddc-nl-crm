import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { overrideTicketPaymentGateway } from './payment.mollie-gateway';
import type { RemotePayment } from './payment.types';
import { createEvent, createSession, publishSession } from './event.service';
import { createSeatMap, createVenue, getSeatMap, publishSeatMap } from './venue.service';

// Публичный API через настоящий HTTP и MySQL: карта -> hold -> checkout -> статус заказа.
// Приложение читает DATABASE_URL при загрузке, поэтому окружение задаётся до его импорта.

const databaseUrl = process.env.TICKETING_TEST_DATABASE_URL;
const skip = databaseUrl ? false : 'TICKETING_TEST_DATABASE_URL is not set';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? 'mysql://unused' } } });
const JSON_HEADERS = { 'content-type': 'application/json' };
const BUYER = { name: 'Anna de Vries', email: 'anna@example.com' };

let server: Server;
let base = '';
let payment: RemotePayment;
let creates = 0;
let reads = 0;
let loseCreateResponse = false;
let lostResponseKey: string | null = null;
const CHECKOUT_URL = 'https://checkout.example.test/tickets';

const notifyPayment = (id = payment.id) => fetch(base.replace(/\/public$/, '/webhooks/mollie'), {
    method: 'POST',
    body: new URLSearchParams({ id, status: 'paid' }),
});

const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) });

const createOnSaleSession = async () => {
    const venue = await createVenue(prisma, { name: `Venue ${randomUUID()}` });
    const created = await createSeatMap(prisma, venue.id, { name: 'Hall', blocks: [{ categoryName: 'Standard', rows: 1, seatsPerRow: 4 }] });
    const seatMapId = created.kind === 'created' ? created.seatMapId : 0;
    await publishSeatMap(prisma, seatMapId);
    const seatMap = await getSeatMap(prisma, seatMapId);
    const event = await createEvent(prisma, { title: 'HTTP Gala' });
    const session = await createSession(prisma, event.id, {
        seatMapId,
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        prices: [{ categoryId: seatMap?.categories[0].id ?? 0, priceCents: 2500 }],
    });
    const sessionId = session.kind === 'created' ? session.sessionId : 0;
    await publishSession(prisma, sessionId);
    return { sessionId, seatIds: seatMap?.seats.map((seat) => seat.id) ?? [] };
};

test.before(async () => {
    if (skip) return;
    Object.assign(process.env, {
        DATABASE_URL: databaseUrl,
        SECRET_SALT: 'test-secret-salt',
        TICKETING_SALES_ENABLED: 'true',
        TICKETING_TOKEN_SECRET: 'http-test-secret-000000000000000',
        TICKETING_PAYMENT_MODE: 'TEST',
        TICKETING_PAYMENT_RETURN_URL: 'https://crm.example.test/tickets/result',
        TICKETING_PAYMENT_WEBHOOK_URL: 'https://crm.example.test/api/v1/ticketing/webhooks/mollie',
        TURNSTILE_SITE_KEY: '',
        TURNSTILE_SECRET_KEY: '',
    });
    overrideTicketPaymentGateway({
        async createPayment(input) {
            creates += 1;
            assert.ok(input.idempotencyKey);
            if (lostResponseKey) {
                assert.equal(input.idempotencyKey, lostResponseKey);
                lostResponseKey = null;
                return payment;
            }
            payment = {
                id: `tr_testorder${input.orderId}`, status: 'open', mode: 'TEST',
                amountCents: input.amountCents, currency: input.currency, checkoutUrl: CHECKOUT_URL,
                expiresAt: null, paidAt: null, method: null, refundedCents: 0, chargedBackCents: 0,
                metadata: { source: 'ticketing', orderId: input.orderId },
            };
            if (loseCreateResponse) {
                loseCreateResponse = false;
                lostResponseKey = input.idempotencyKey;
                throw new Error('Simulated Mollie response loss');
            }
            return payment;
        },
        async getPayment() { reads += 1; return payment; },
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- окружение должно быть задано до загрузки приложения
    server = require('../../app').default;
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    const address = server.address();
    base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/api/v1/ticketing/public`;
});

test.after(async () => {
    overrideTicketPaymentGateway(null);
    await prisma.$disconnect();
    if (server) await new Promise<void>((resolve) => { server.close(() => resolve()); });
});

test('checkout creates one payment and concurrent webhooks sell its seats once', { skip }, async () => {
    const { sessionId, seatIds } = await createOnSaleSession();

    const hold = await post(`/sessions/${sessionId}/holds`, { seatIds: [seatIds[0], seatIds[1]] });
    const { holdToken } = await hold.json();
    assert.equal(hold.status, 201);

    const map = await (await fetch(`${base}/sessions/${sessionId}`)).json();
    assert.deepEqual(map.seats.map((seat: { status: string }) => seat.status), ['TAKEN', 'TAKEN', 'AVAILABLE', 'AVAILABLE']);
    assert.equal(map.categories[0].priceCents, 2500);

    const checkout = await post('/orders', { holdToken, buyer: BUYER, acceptTerms: true });
    const created = await checkout.json();
    assert.equal(checkout.status, 201);
    assert.deepEqual([created.order.status, created.order.totalCents], ['PENDING_PAYMENT', 5000]);

    const repeat = await post('/orders', { holdToken, buyer: BUYER, acceptTerms: true });
    assert.equal(repeat.status, 200);
    assert.equal((await repeat.json()).orderToken, created.orderToken);

    assert.equal(created.order.checkoutUrl, CHECKOUT_URL);
    assert.equal(creates, 1);

    const status = await fetch(`${base}/orders/current`, { headers: { 'x-ticketing-order-token': created.orderToken } });
    assert.equal((await status.json()).order.number, created.order.number);

    assert.equal((await notifyPayment()).status, 200);
    const readStatus = async () => (await (await fetch(`${base}/orders/current`, {
        headers: { 'x-ticketing-order-token': created.orderToken },
    })).json()).order.status;
    assert.equal(await readStatus(), 'PENDING_PAYMENT');

    payment = { ...payment, status: 'paid', paidAt: new Date() };
    process.env.TICKETING_SALES_ENABLED = 'false';
    try {
        const responses = await Promise.all([notifyPayment(), notifyPayment()]);
        assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    } finally {
        process.env.TICKETING_SALES_ENABLED = 'true';
    }
    payment = { ...payment, status: 'open', paidAt: null };
    assert.equal((await notifyPayment()).status, 200);
    assert.equal(await readStatus(), 'PAID');
    const synced = await prisma.ticketPayment.findUniqueOrThrow({ where: { molliePaymentId: payment.id } });
    assert.equal(synced.status, 'paid');
    assert.equal(await prisma.ticketSessionSeat.count({ where: { sessionId, status: 'SOLD' } }), 2);
});

test('conflicts, bad input and unknown tokens get precise client errors', { skip }, async () => {
    const { sessionId, seatIds } = await createOnSaleSession();
    const first = await post(`/sessions/${sessionId}/holds`, { seatIds: [seatIds[0]] });
    const { holdToken } = await first.json();

    const conflict = await post(`/sessions/${sessionId}/holds`, { seatIds: [seatIds[0], seatIds[1]] });
    assert.equal(conflict.status, 409);
    assert.deepEqual((await conflict.json()).unavailableSeatIds, [seatIds[0]]);

    assert.equal((await post(`/sessions/${sessionId}/holds`, { seatIds: [] })).status, 400);
    assert.equal((await post('/orders', { holdToken, buyer: BUYER })).status, 400);
    assert.equal((await post('/orders', { holdToken, buyer: BUYER, acceptTerms: true, totalCents: 1 })).status, 400);
    assert.equal((await post('/orders', { holdToken: 'x'.repeat(43), buyer: BUYER, acceptTerms: true })).status, 404);
    assert.equal((await fetch(`${base}/orders/current`)).status, 404);
    assert.equal((await fetch(`${base}/sessions/2000000000`)).status, 404);

    assert.equal((await post('/holds/release', { holdToken })).status, 204);
    assert.equal((await post('/orders', { holdToken, buyer: BUYER, acceptTerms: true })).status, 410);
});

test('unknown webhook IDs are ignored and incorrect amounts leave the seat held', { skip }, async () => {
    const readsBefore = reads;
    assert.equal((await notifyPayment('invalid')).status, 400);
    assert.equal((await notifyPayment('tr_foreign')).status, 200);
    assert.equal(reads, readsBefore);

    const { sessionId, seatIds } = await createOnSaleSession();
    const { holdToken } = await (await post(`/sessions/${sessionId}/holds`, { seatIds: [seatIds[0]] })).json();
    const checkout = await post('/orders', { holdToken, buyer: BUYER, acceptTerms: true });
    assert.equal(checkout.status, 201);

    payment = { ...payment, status: 'paid', amountCents: 1 };
    assert.equal((await notifyPayment()).status, 200);

    const order = await prisma.ticketOrder.findUniqueOrThrow({ where: { id: payment.metadata.orderId } });
    assert.deepEqual([order.status, order.reviewReason], ['NEEDS_REVIEW', 'AMOUNT_MISMATCH']);
    assert.equal(await prisma.ticketSessionSeat.count({ where: { sessionId, status: 'SOLD' } }), 0);
});

test('checkout retry recovers after Mollie accepted the payment but the response was lost', { skip }, async () => {
    const { sessionId, seatIds } = await createOnSaleSession();
    const { holdToken } = await (await post(`/sessions/${sessionId}/holds`, { seatIds: [seatIds[0]] })).json();
    const checkout = { holdToken, buyer: BUYER, acceptTerms: true };
    loseCreateResponse = true;
    assert.equal((await post('/orders', checkout)).status, 500);

    const retry = await post('/orders', checkout);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).order.checkoutUrl, CHECKOUT_URL);
    assert.equal(lostResponseKey, null);
    assert.equal(await prisma.ticketOrder.count({ where: { sessionId } }), 1);
});
