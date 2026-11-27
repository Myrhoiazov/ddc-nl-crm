import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { changeSessionStatus, createEvent, createSession, getSessionDetail, listEvents, publishSession } from './event.service';
import { createHold } from './hold.service';
import { createPrismaHoldRepository } from './hold.repository';
import { createSeatMap, createVenue, getSeatMap, publishSeatMap } from './venue.service';

// Сквозной сценарий админки на реальной MySQL: зал -> событие -> сеанс -> публикация -> hold.

const databaseUrl = process.env.TICKETING_TEST_DATABASE_URL;
const skip = databaseUrl ? false : 'TICKETING_TEST_DATABASE_URL is not set';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? 'mysql://unused' } } });
const STARTS_AT = new Date(Date.now() + 30 * 86_400_000).toISOString();

const createHall = async (publish = true) => {
    const venue = await createVenue(prisma, { name: `Venue ${Date.now()}` });
    const created = await createSeatMap(prisma, venue.id, {
        name: 'Main hall',
        blocks: [{ categoryName: 'VIP', rows: 3, seatsPerRow: 20 }, { categoryName: 'Standard', rows: 10, seatsPerRow: 20 }],
    });
    const seatMapId = created.kind === 'created' ? created.seatMapId : 0;
    if (publish) await publishSeatMap(prisma, seatMapId);
    const seatMap = await getSeatMap(prisma, seatMapId);
    return { seatMapId, categoryIds: seatMap?.categories.map((category) => category.id) ?? [] };
};

const createDraftSession = async () => {
    const { seatMapId, categoryIds } = await createHall();
    const event = await createEvent(prisma, { title: 'Spring Gala' });
    const result = await createSession(prisma, event.id, {
        seatMapId,
        startsAt: STARTS_AT,
        prices: [{ categoryId: categoryIds[0], priceCents: 4500 }, { categoryId: categoryIds[1], priceCents: 2500 }],
    });
    assert.equal(result.kind, 'created');
    return { eventId: event.id, sessionId: result.kind === 'created' ? result.sessionId : 0 };
};

test.after(async () => { await prisma.$disconnect(); });

test('createSession refuses a draft seat map and incomplete prices', { skip }, async () => {
    const draftHall = await createHall(false);
    const hall = await createHall();
    const event = await createEvent(prisma, { title: 'Refusals' });
    const prices = [{ categoryId: hall.categoryIds[0], priceCents: 100 }];

    const onDraftMap = await createSession(prisma, event.id, { seatMapId: draftHall.seatMapId, startsAt: STARTS_AT, prices });
    const missingPrice = await createSession(prisma, event.id, { seatMapId: hall.seatMapId, startsAt: STARTS_AT, prices });

    assert.deepEqual(onDraftMap, { kind: 'rejected', reason: 'SEAT_MAP_NOT_PUBLISHED' });
    assert.equal(missingPrice.kind === 'rejected' && missingPrice.reason, 'PRICE_MISMATCH');
});

test('publishSession creates the 260-seat inventory once and opens sales', { skip }, async () => {
    const { eventId, sessionId } = await createDraftSession();

    const results = await Promise.all([publishSession(prisma, sessionId), publishSession(prisma, sessionId)]);
    const detail = await getSessionDetail(prisma, sessionId);
    const listed = (await listEvents(prisma)).find((event) => event.id === eventId);

    assert.equal(results.filter((result) => result.kind === 'published').length >= 1, true);
    assert.equal(detail?.status, 'ON_SALE');
    assert.equal(detail?.seats.length, 260);
    assert.equal(detail?.seats.filter((seat) => seat.priceCents === 4500).length, 60);
    assert.equal(listed?.status, 'PUBLISHED');
    assert.deepEqual(listed?.sessions[0].seatCounts, { AVAILABLE: 260 });
});

test('a published session accepts holds and a paused one refuses them', { skip }, async () => {
    const { sessionId } = await createDraftSession();
    await publishSession(prisma, sessionId);
    const detail = await getSessionDetail(prisma, sessionId);
    const deps = { repository: createPrismaHoldRepository(prisma), tokenSecret: 'db-test-secret' };
    const seatIds = detail?.seats.slice(0, 2).map((seat) => seat.seatId) ?? [];

    assert.equal((await createHold(deps, { sessionId, seatIds })).kind, 'held');
    assert.equal(await changeSessionStatus(prisma, sessionId, 'PAUSED'), true);
    assert.deepEqual(await createHold(deps, { sessionId, seatIds: [detail?.seats[5].seatId ?? 0] }), {
        kind: 'rejected', reason: 'SALES_CLOSED',
    });
});

test('status changes follow the allowed transitions only', { skip }, async () => {
    const { sessionId } = await createDraftSession();

    assert.equal(await changeSessionStatus(prisma, sessionId, 'ON_SALE'), false);
    await publishSession(prisma, sessionId);
    assert.equal(await changeSessionStatus(prisma, sessionId, 'CLOSED'), true);
    assert.equal(await changeSessionStatus(prisma, sessionId, 'ON_SALE'), false);
});
