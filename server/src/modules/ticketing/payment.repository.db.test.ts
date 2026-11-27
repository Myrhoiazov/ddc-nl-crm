import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createEvent, createSession, publishSession } from './event.service';
import { createPrismaHoldRepository } from './hold.repository';
import { createHold } from './hold.service';
import { createOrder, getOrderByAccessToken } from './order.service';
import { applyRemotePayment, expirePendingOrder } from './payment.repository';
import type { RemotePayment } from './payment.types';
import { createSeatMap, createVenue, getSeatMap, publishSeatMap } from './venue.service';

const databaseUrl = process.env.TICKETING_TEST_DATABASE_URL;
const skip = databaseUrl ? false : 'TICKETING_TEST_DATABASE_URL is not set';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? 'mysql://unused' } } });
const tokenSecret = 'ticketing-expiry-db-fixture';
const ticketTokens = { secret: 'ticketing-ticket-token-db-fixture', version: 1 } as const;
const holdDeps = { repository: createPrismaHoldRepository(prisma), tokenSecret };
const orderDeps = { prisma, tokenSecret };
const MINUTE_MS = 60_000;

const createPayableSession = async () => {
    const venue = await createVenue(prisma, { name: `Venue ${randomUUID()}` });
    const map = await createSeatMap(prisma, venue.id, {
        name: 'Hall', blocks: [{ categoryName: 'Standard', rows: 1, seatsPerRow: 2 }],
    });
    assert.equal(map.kind, 'created');
    await publishSeatMap(prisma, map.seatMapId);
    const seatMap = await getSeatMap(prisma, map.seatMapId);
    assert.ok(seatMap);
    const event = await createEvent(prisma, { title: 'Payment expiry' });
    const session = await createSession(prisma, event.id, {
        seatMapId: map.seatMapId,
        startsAt: new Date(Date.now() + 1440 * MINUTE_MS).toISOString(),
        prices: [{ categoryId: seatMap.categories[0].id, priceCents: 2500 }],
    });
    assert.equal(session.kind, 'created');
    assert.equal((await publishSession(prisma, session.sessionId)).kind, 'published');
    return { sessionId: session.sessionId, seatIds: seatMap.seats.map((seat) => seat.id) };
};

const createPendingOrder = async () => {
    const session = await createPayableSession();
    const hold = await createHold(holdDeps, session);
    assert.equal(hold.kind, 'held');
    const result = await createOrder(orderDeps, {
        holdToken: hold.holdToken,
        buyer: { name: 'Anna de Vries', email: 'anna@example.com', locale: 'nl' },
    });
    assert.equal(result.kind, 'created');
    assert.ok(result.order.payment);
    const remote: RemotePayment = {
        id: `tr_testsettlement${result.order.id}`, status: 'paid', mode: 'TEST',
        amountCents: 5000, currency: 'EUR', checkoutUrl: null, expiresAt: null,
        paidAt: null, method: null, refundedCents: 0, chargedBackCents: 0,
        metadata: { source: 'ticketing', orderId: result.order.id },
    };
    await prisma.ticketPayment.update({
        where: { id: result.order.payment.id }, data: { molliePaymentId: remote.id, status: 'open' },
    });
    const due = result.order.paymentDeadlineAt;
    const hardDeadlineAt = new Date(due.getTime() + 40 * MINUTE_MS);
    return { ...session, order: result.order, accessToken: result.accessToken, remote, due, hardDeadlineAt };
};

const seatStatuses = async (sessionId: number) => {
    const seats = await prisma.ticketSessionSeat.findMany({
        where: { sessionId }, orderBy: { seatId: 'asc' }, select: { status: true },
    });
    return seats.map((seat) => seat.status);
};

const ticketsForOrder = (orderId: number) => prisma.ticket.findMany({
    where: { orderItem: { orderId } }, orderBy: { id: 'asc' },
});

const deliveriesForOrder = (orderId: number) => prisma.ticketDelivery.findMany({
    where: { orderId }, orderBy: { id: 'asc' },
});

test.after(async () => { await prisma.$disconnect(); });

test('terminal provider failure releases a due order once and later valid payment reclaims both seats', { skip }, async () => {
    const { order, accessToken, remote, due, hardDeadlineAt, sessionId } = await createPendingOrder();
    const expiry = { orderId: order.id, now: due, hardDeadlineAt };
    const sync = { now: due, expectedMode: 'TEST', ticketTokens } as const;

    assert.equal(await expirePendingOrder(prisma, expiry), false);
    await applyRemotePayment(prisma, { ...remote, status: 'failed' }, sync);
    assert.equal(await expirePendingOrder(prisma, expiry), true);
    assert.equal(await expirePendingOrder(prisma, expiry), false);
    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'EXPIRED');
    assert.deepEqual(await seatStatuses(sessionId), ['AVAILABLE', 'AVAILABLE']);

    assert.equal(await applyRemotePayment(prisma, remote, sync), 'CONFIRMED');
    assert.equal(await applyRemotePayment(prisma, remote, sync), 'NO_CHANGE');
    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'PAID');
    assert.deepEqual(await seatStatuses(sessionId), ['SOLD', 'SOLD']);

    const tickets = await ticketsForOrder(order.id);
    assert.equal(tickets.length, 2);
    for (const ticket of tickets) {
        assert.match(ticket.codeHash, /^[0-9a-f]{64}$/);
        assert.match(ticket.shortCode, /^[0-9A-F]{8}$/);
        assert.match(ticket.tokenNonce, /^[0-9a-f]{32}$/);
        assert.equal(ticket.status, 'VALID');
        assert.deepEqual(ticket.issuedAt, due);
        assert.equal(ticket.tokenVersion, 1);
    }
    const deliveries = await deliveriesForOrder(order.id);
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].type, 'TICKETS');
    assert.equal(deliveries[0].recipientEmail, 'anna@example.com');
    assert.equal(deliveries[0].status, 'PENDING');
});

test('hard expiry allows new holds and late payment leaves all seats intact when one was taken', { skip }, async () => {
    const { order, accessToken, remote, hardDeadlineAt, sessionId, seatIds } = await createPendingOrder();
    assert.equal(await expirePendingOrder(prisma, { orderId: order.id, now: hardDeadlineAt, hardDeadlineAt }), true);
    assert.equal((await createHold(holdDeps, { sessionId, seatIds: [seatIds[1]] })).kind, 'held');

    const outcome = await applyRemotePayment(prisma, remote, { now: hardDeadlineAt, expectedMode: 'TEST', ticketTokens });
    assert.equal(outcome, 'NEEDS_REVIEW');
    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'NEEDS_REVIEW');
    assert.deepEqual(await seatStatuses(sessionId), ['AVAILABLE', 'HELD']);
    assert.deepEqual(await ticketsForOrder(order.id), []);
    assert.deepEqual(await deliveriesForOrder(order.id), []);
});

test('payment confirmation racing hard expiry preserves paid inventory', { skip }, async () => {
    const { order, accessToken, remote, hardDeadlineAt, sessionId } = await createPendingOrder();
    await Promise.all([
        applyRemotePayment(prisma, remote, { now: hardDeadlineAt, expectedMode: 'TEST', ticketTokens }),
        expirePendingOrder(prisma, { orderId: order.id, now: hardDeadlineAt, hardDeadlineAt }),
    ]);

    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'PAID');
    assert.deepEqual(await seatStatuses(sessionId), ['SOLD', 'SOLD']);
    assert.equal((await ticketsForOrder(order.id)).length, 2);
});

test('a paid order without ticket token configuration goes to review without issuing tickets', { skip }, async () => {
    const { order, accessToken, remote, due, sessionId } = await createPendingOrder();
    const outcome = await applyRemotePayment(prisma, remote, { now: due, expectedMode: 'TEST', ticketTokens: null });

    assert.equal(outcome, 'NEEDS_REVIEW');
    const stored = await prisma.ticketOrder.findUnique({ where: { id: order.id }, select: { status: true, reviewReason: true } });
    assert.equal(stored?.status, 'NEEDS_REVIEW');
    assert.equal(stored?.reviewReason, 'TICKET_CONFIG_MISSING');
    assert.equal((await getOrderByAccessToken(orderDeps, accessToken))?.status, 'NEEDS_REVIEW');
    assert.deepEqual(await seatStatuses(sessionId), ['HELD', 'HELD']);
    assert.deepEqual(await ticketsForOrder(order.id), []);
    assert.deepEqual(await deliveriesForOrder(order.id), []);
});
