import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { changeSessionStatus, createEvent, createSession, publishSession } from './event.service';
import { createHold, expireDueHolds, releaseHold } from './hold.service';
import { createPrismaHoldRepository } from './hold.repository';
import { createOrder, getOrderByAccessToken } from './order.service';
import type { OrderBuyer, OrderServiceDeps } from './order.types';
import type { HoldServiceDeps } from './ticketing.types';
import { createSeatMap, createVenue, getSeatMap, publishSeatMap } from './venue.service';

// Checkout на реальной MySQL: hold -> заказ, идемпотентность и гонки (см. hold.repository.db.test.ts).

const databaseUrl = process.env.TICKETING_TEST_DATABASE_URL;
const skip = databaseUrl ? false : 'TICKETING_TEST_DATABASE_URL is not set';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? 'mysql://unused' } } });
const TOKEN_SECRET = 'db-test-secret';
const holdDeps: HoldServiceDeps = { repository: createPrismaHoldRepository(prisma), tokenSecret: TOKEN_SECRET };
const orderDeps: OrderServiceDeps = { prisma, tokenSecret: TOKEN_SECRET };
const BUYER: OrderBuyer = { name: 'Anna de Vries', email: 'anna@example.com', locale: 'nl' };
const HOUR_MS = 3_600_000;

const createOnSaleSession = async () => {
    const venue = await createVenue(prisma, { name: `Venue ${Date.now()}-${Math.random()}`, city: 'Amsterdam' });
    const created = await createSeatMap(prisma, venue.id, {
        name: 'Small hall',
        blocks: [{ categoryName: 'VIP', rows: 1, seatsPerRow: 4 }, { categoryName: 'Standard', rows: 2, seatsPerRow: 4 }],
    });
    const seatMapId = created.kind === 'created' ? created.seatMapId : 0;
    await publishSeatMap(prisma, seatMapId);
    const seatMap = await getSeatMap(prisma, seatMapId);
    const event = await createEvent(prisma, { title: 'Spring Gala' });
    const session = await createSession(prisma, event.id, {
        seatMapId,
        startsAt: new Date(Date.now() + 30 * 24 * HOUR_MS).toISOString(),
        prices: [
            { categoryId: seatMap?.categories[0].id ?? 0, priceCents: 4500 },
            { categoryId: seatMap?.categories[1].id ?? 0, priceCents: 2500 },
        ],
    });
    const sessionId = session.kind === 'created' ? session.sessionId : 0;
    assert.equal((await publishSession(prisma, sessionId)).kind, 'published');
    return { sessionId, seatIds: seatMap?.seats.map((seat) => seat.id) ?? [] };
};

// Удерживает одно VIP-место и одно Standard: 45,00 + 25,00.
const holdTwoSeats = async (deps: HoldServiceDeps = holdDeps) => {
    const { sessionId, seatIds } = await createOnSaleSession();
    const held = await createHold(deps, { sessionId, seatIds: [seatIds[0], seatIds[4]] });
    assert.equal(held.kind, 'held');
    return { sessionId, seatIds: [seatIds[0], seatIds[4]], holdToken: held.kind === 'held' ? held.holdToken : '' };
};

const seatStatuses = async (sessionId: number, seatIds: number[]) => {
    const seats = await prisma.ticketSessionSeat.findMany({
        where: { sessionId, seatId: { in: seatIds } },
        select: { status: true },
    });
    return seats.map((seat) => seat.status);
};

test.after(async () => { await prisma.$disconnect(); });

test('createOrder turns a hold into an order awaiting payment', { skip }, async () => {
    const { sessionId, seatIds, holdToken } = await holdTwoSeats();
    const now = new Date();

    const result = await createOrder({ ...orderDeps, now: () => now }, { holdToken, buyer: BUYER });
    assert.equal(result.kind, 'created');
    const order = result.kind === 'created' ? result.order : null;

    assert.match(order?.number ?? '', /^T-[0-9A-Z]{8}$/);
    assert.deepEqual(
        [order?.status, order?.subtotalCents, order?.feeCents, order?.totalCents, order?.currency],
        ['PENDING_PAYMENT', 7000, 0, 7000, 'EUR'],
    );
    assert.equal(order?.paymentDeadlineAt.getTime(), now.getTime() + 20 * 60_000);
    assert.deepEqual(order?.items.map((item) => [item.categoryName, item.rowLabel, item.seatLabel, item.priceCents]), [
        ['VIP', '1', '1', 4500],
        ['Standard', '2', '1', 2500],
    ]);
    assert.deepEqual([order?.payment?.status, order?.payment?.checkoutUrl], ['CREATED', null]);
    assert.deepEqual(await seatStatuses(sessionId, seatIds), ['HELD', 'HELD']);
});

test('seats of an order outlive the hold TTL and the buyer data stays out of the response', { skip }, async () => {
    const { sessionId, seatIds, holdToken } = await holdTwoSeats();
    const result = await createOrder(orderDeps, { holdToken, buyer: { ...BUYER, phone: '+31 6 12345678' } });
    assert.equal(result.kind, 'created');

    await expireDueHolds({ ...holdDeps, now: () => new Date(Date.now() + 24 * HOUR_MS) });
    assert.equal(await releaseHold(holdDeps, holdToken), false);
    assert.deepEqual(await seatStatuses(sessionId, seatIds), ['HELD', 'HELD']);

    const stored = await prisma.ticketOrder.findFirst({
        where: { sessionId },
        select: { buyerEmail: true, buyerPhone: true, termsVersion: true, eventSnapshot: true, hold: { select: { status: true } } },
    });
    assert.deepEqual([stored?.buyerEmail, stored?.buyerPhone, stored?.termsVersion], ['anna@example.com', '+31 6 12345678', '1']);
    assert.equal(stored?.hold.status, 'CONVERTED');
    assert.equal((stored?.eventSnapshot as { eventTitle: string; venueCity: string }).eventTitle, 'Spring Gala');
    assert.equal(JSON.stringify(result).includes('anna@example.com'), false);
});

test('a repeated checkout returns the same order and access token', { skip }, async () => {
    const { sessionId, holdToken } = await holdTwoSeats();

    const first = await createOrder(orderDeps, { holdToken, buyer: BUYER });
    await changeSessionStatus(prisma, sessionId, 'PAUSED');
    const second = await createOrder(orderDeps, { holdToken, buyer: { ...BUYER, name: 'Someone Else' } });

    assert.equal(first.kind, 'created');
    assert.equal(second.kind, 'existing');
    assert.equal(second.order.id, first.order.id);
    assert.equal(second.accessToken, first.accessToken);
    assert.equal(second.order.payment?.idempotencyKey, first.order.payment?.idempotencyKey);
    assert.equal((await getOrderByAccessToken(orderDeps, first.accessToken))?.number, first.order.number);
    assert.equal(await getOrderByAccessToken(orderDeps, first.order.number), null);
});

test('parallel checkouts of one hold create exactly one order and one payment', { skip }, async () => {
    const { sessionId, holdToken } = await holdTwoSeats();

    const results = await Promise.all(
        Array.from({ length: 12 }, () => createOrder(orderDeps, { holdToken, buyer: BUYER })),
    );

    assert.equal(results.filter((result) => result.kind === 'created').length, 1);
    assert.equal(results.filter((result) => result.kind === 'existing').length, 11);
    assert.equal(await prisma.ticketOrder.count({ where: { sessionId } }), 1);
    assert.equal(await prisma.ticketPayment.count({ where: { order: { sessionId } } }), 1);
    assert.equal(await prisma.ticketOrderItem.count({ where: { sessionId } }), 2);
});

test('createOrder refuses unknown, released and expired holds', { skip }, async () => {
    const released = await holdTwoSeats();
    await releaseHold(holdDeps, released.holdToken);
    const expired = await holdTwoSeats();
    const later = { ...orderDeps, now: () => new Date(Date.now() + HOUR_MS) };

    assert.deepEqual(
        await createOrder(orderDeps, { holdToken: 'x'.repeat(43), buyer: BUYER }),
        { kind: 'rejected', reason: 'HOLD_NOT_FOUND' },
    );
    assert.deepEqual(
        await createOrder(orderDeps, { holdToken: released.holdToken, buyer: BUYER }),
        { kind: 'rejected', reason: 'HOLD_NOT_ACTIVE' },
    );
    assert.deepEqual(
        await createOrder(later, { holdToken: expired.holdToken, buyer: BUYER }),
        { kind: 'rejected', reason: 'HOLD_NOT_ACTIVE' },
    );
    assert.equal(await prisma.ticketOrder.count({ where: { sessionId: { in: [released.sessionId, expired.sessionId] } } }), 0);
});

test('a paused session refuses a new checkout and leaves the hold usable', { skip }, async () => {
    const { sessionId, seatIds, holdToken } = await holdTwoSeats();
    await changeSessionStatus(prisma, sessionId, 'PAUSED');

    assert.deepEqual(await createOrder(orderDeps, { holdToken, buyer: BUYER }), { kind: 'rejected', reason: 'SALES_CLOSED' });
    assert.deepEqual(await seatStatuses(sessionId, seatIds), ['HELD', 'HELD']);

    await changeSessionStatus(prisma, sessionId, 'ON_SALE');
    assert.equal((await createOrder(orderDeps, { holdToken, buyer: BUYER })).kind, 'created');
});

test('the database rejects an order whose total does not add up', { skip }, async () => {
    const { holdToken } = await holdTwoSeats();
    const result = await createOrder({ ...orderDeps, settings: { feeCents: 150 } }, { holdToken, buyer: BUYER });
    assert.equal(result.kind === 'created' && result.order.totalCents, 7150);
    const orderId = result.kind === 'created' ? result.order.id : 0;

    await assert.rejects(prisma.ticketOrder.update({ where: { id: orderId }, data: { totalCents: 1 } }));
    await assert.rejects(prisma.ticketOrder.update({ where: { id: orderId }, data: { refundedCents: 7151 } }));
});
