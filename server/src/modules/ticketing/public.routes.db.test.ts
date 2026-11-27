import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
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
        TICKETING_TOKEN_SECRET: 'http-test-secret-0123456789abcdef',
        TURNSTILE_SITE_KEY: '',
        TURNSTILE_SECRET_KEY: '',
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- окружение должно быть задано до загрузки приложения
    server = require('../../app').default;
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    const address = server.address();
    base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/api/v1/ticketing/public`;
});

test.after(async () => {
    await prisma.$disconnect();
    if (server) await new Promise<void>((resolve) => { server.close(() => resolve()); });
});

test('a buyer goes from the seat map to an order awaiting payment', { skip }, async () => {
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

    const status = await fetch(`${base}/orders/current`, { headers: { 'x-ticketing-order-token': created.orderToken } });
    assert.equal((await status.json()).order.number, created.order.number);
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
