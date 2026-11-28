import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { overrideTicketPaymentGateway } from './payment.mollie-gateway';
import type { RemotePayment } from './payment.types';
import { hashTicketToken } from './ticket.policy';
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
// Новые сценарии билетов не должны расходовать лимит checkout, проверяемый другими тестами.
const TICKET_IP_HEADERS = { ...JSON_HEADERS, 'x-forwarded-for': '127.0.0.42' };
const postTickets = (path: string, body: unknown) => fetch(`${base}${path}`, {
    method: 'POST', headers: TICKET_IP_HEADERS, body: JSON.stringify(body),
});

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

const paidOrder = async () => {
    const { sessionId, seatIds } = await createOnSaleSession();
    const { holdToken } = await (await post(`/sessions/${sessionId}/holds`, { seatIds: [seatIds[0], seatIds[1]] })).json();
    const created = await (await postTickets('/orders', { holdToken, buyer: BUYER, acceptTerms: true })).json();
    payment = { ...payment, status: 'paid', paidAt: new Date() };
    assert.equal((await notifyPayment()).status, 200);
    return { orderToken: created.orderToken as string, orderNumber: created.order.number as string };
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

test('a paid buyer lists tickets without hashes, short codes or internal ids', { skip }, async () => {
    const { orderToken, orderNumber } = await paidOrder();

    const response = await fetch(`${base}/orders/current/tickets`, {
        headers: { 'x-ticketing-order-token': orderToken },
    });
    assert.equal(response.status, 200);
    const text = await response.text();
    const body = JSON.parse(text);
    assert.equal(body.orderNumber, orderNumber);
    assert.equal(body.tickets.length, 2);
    for (const ticket of body.tickets) {
        assert.match(ticket.token, /^v1\.[A-Za-z0-9_-]+$/);
        assert.ok(ticket.issuedAt);
        assert.equal(ticket.seat.rowLabel, '1');
    }
    assert.equal(text.includes('codeHash'), false);
    assert.equal(text.includes('shortCode'), false);
    assert.equal(text.includes('"id"'), false);
    assert.equal(text.includes('anna@example.com'), false);

    // Независимая проверка: токен из ответа должен восстановить ровно тот хеш, что лежит в БД.
    const stored = await prisma.ticket.findMany({
        where: { orderItem: { order: { number: orderNumber } } },
        select: { codeHash: true },
    });
    assert.deepEqual(
        stored.map((ticket) => ticket.codeHash).sort(),
        body.tickets.map((ticket: { token: string }) => hashTicketToken(ticket.token)).sort(),
    );
});

test('tickets are hidden from unknown, unpaid and wrongly signed orders', { skip }, async () => {
    const { sessionId, seatIds } = await createOnSaleSession();
    const { holdToken } = await (await post(`/sessions/${sessionId}/holds`, { seatIds: [seatIds[0]] })).json();
    const created = await (await postTickets('/orders', { holdToken, buyer: BUYER, acceptTerms: true })).json();
    const orderToken = created.orderToken as string;
    const url = `${base}/orders/current/tickets`;
    const withToken = (token: string | null) => fetch(url, token ? { headers: { 'x-ticketing-order-token': token } } : {});

    assert.equal((await withToken(null)).status, 404);
    assert.equal((await withToken('x'.repeat(43))).status, 404);
    assert.equal((await withToken(orderToken)).status, 404);

    payment = { ...payment, status: 'paid', paidAt: new Date() };
    assert.equal((await notifyPayment()).status, 200);

    process.env.TICKETING_TICKET_TOKEN_SECRET = 'z'.repeat(32);
    try {
        assert.equal((await withToken(orderToken)).status, 404);
    } finally {
        delete process.env.TICKETING_TICKET_TOKEN_SECRET;
    }
    assert.equal((await withToken(orderToken)).status, 200);
});

test('a paid buyer downloads a PDF that only their token can unlock', { skip }, async () => {
    const { orderToken } = await paidOrder();
    const url = `${base}/orders/current/tickets.pdf`;

    assert.equal((await fetch(url)).status, 404);
    assert.equal((await fetch(url, { headers: { 'x-ticketing-order-token': 'x'.repeat(43) } })).status, 404);

    const response = await fetch(url, { headers: { 'x-ticketing-order-token': orderToken } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /application\/pdf/);
    assert.match(response.headers.get('content-disposition') ?? '', /tickets-.*\.pdf/);
    const pdf = Buffer.from(await response.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal(pdf.includes(Buffer.from('anna@example.com')), false);
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

const RECOVER_LIMIT = 5;
const recover = (ip: string, body: unknown) => fetch(`${base}/orders/recover`, {
    method: 'POST', headers: { ...JSON_HEADERS, 'x-forwarded-for': ip }, body: JSON.stringify(body),
});
const recoveryRows = (orderNumber: string) => prisma.ticketDelivery.count({
    where: { type: 'RECOVERY_LINK', order: { number: orderNumber } },
});

test('order recovery answers 202 identically whether or not the order exists', { skip }, async () => {
    const { orderToken, orderNumber } = await paidOrder();
    const ip = '127.0.0.43';

    const unknown = await recover(ip, { orderNumber: 'T-NOSUCH00', email: BUYER.email });
    const wrongEmail = await recover(ip, { orderNumber, email: 'someone-else@example.com' });
    assert.equal(await recoveryRows(orderNumber), 0);
    const known = await recover(ip, { orderNumber: orderNumber.toLowerCase(), email: BUYER.email.toUpperCase() });

    assert.deepEqual([unknown.status, wrongEmail.status, known.status], [202, 202, 202]);
    const bodies = await Promise.all([unknown.text(), wrongEmail.text(), known.text()]);
    assert.equal(new Set(bodies).size, 1);
    assert.equal(bodies[0].includes(orderNumber), false);
    assert.equal(await recoveryRows(orderNumber), 1);

    const current = await fetch(`${base}/orders/current`, { headers: { 'x-ticketing-order-token': orderToken } });
    assert.equal(current.status, 404);
});

test('order recovery rejects malformed input and is rate limited per IP', { skip }, async () => {
    const ip = '127.0.0.44';
    assert.equal((await recover(ip, { orderNumber: 'T-NOSUCH00' })).status, 400);
    assert.equal((await recover(ip, { orderNumber: 'T-NOSUCH00', email: 'not-an-email' })).status, 400);
    assert.equal((await recover(ip, { orderNumber: 'T-NOSUCH00', email: BUYER.email, extra: 1 })).status, 400);

    const statuses: number[] = [];
    for (let attempt = 0; attempt < RECOVER_LIMIT; attempt += 1) {
        statuses.push((await recover(ip, { orderNumber: 'T-NOSUCH00', email: BUYER.email })).status);
    }
    assert.equal(statuses[statuses.length - 1], 429);
    assert.equal((await recover('127.0.0.45', { orderNumber: 'T-NOSUCH00', email: BUYER.email })).status, 202);
});

test('ticket resend is a staff-only route', { skip }, async () => {
    const { orderNumber } = await paidOrder();
    const order = await prisma.ticketOrder.findUniqueOrThrow({ where: { number: orderNumber } });
    const url = base.replace(/\/public$/, `/admin/orders/${order.id}/resend`);

    // Без сессии запрос останавливает общий CSRF-слой; с заголовком Mini App, который CSRF
    // пропускает, его отклоняет уже проверка роли на самом маршруте.
    const anonymous = await fetch(url, { method: 'POST', headers: JSON_HEADERS });
    const unsigned = await fetch(url, {
        method: 'POST', headers: { ...JSON_HEADERS, 'x-telegram-init-data': 'not-a-signed-payload' },
    });
    assert.deepEqual([anonymous.status, unsigned.status], [403, 401]);
    assert.equal(await prisma.ticketDelivery.count({ where: { orderId: order.id, type: 'RESEND' } }), 0);
});
