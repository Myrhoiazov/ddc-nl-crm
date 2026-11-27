import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createSeatMap, createVenue, getSeatMap, listVenues, publishSeatMap } from './venue.service';

// Интеграционные тесты площадок и схем зала на реальной MySQL (см. hold.repository.db.test.ts).

const databaseUrl = process.env.TICKETING_TEST_DATABASE_URL;
const skip = databaseUrl ? false : 'TICKETING_TEST_DATABASE_URL is not set';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? 'mysql://unused' } } });

const HALL_260 = {
    name: 'Main hall',
    blocks: [
        { categoryName: 'VIP', rows: 3, seatsPerRow: 20 },
        { categoryName: 'Standard', rows: 10, seatsPerRow: 20 },
    ],
};

const createHall = async () => {
    const venue = await createVenue(prisma, { name: `Venue ${Date.now()}`, city: 'Amsterdam' });
    const created = await createSeatMap(prisma, venue.id, HALL_260);
    assert.equal(created.kind, 'created');
    return { venueId: venue.id, seatMapId: created.kind === 'created' ? created.seatMapId : 0 };
};

test.after(async () => { await prisma.$disconnect(); });

test('createSeatMap stores every generated seat and category as a draft', { skip }, async () => {
    const { seatMapId } = await createHall();
    const seatMap = await getSeatMap(prisma, seatMapId);

    assert.equal(seatMap?.status, 'DRAFT');
    assert.equal(seatMap?.version, 1);
    assert.equal(seatMap?.seats.length, 260);
    assert.deepEqual(seatMap?.categories.map((category) => category.name), ['VIP', 'Standard']);
    assert.equal(seatMap?.seats.filter((seat) => seat.categoryId === seatMap.categories[0].id).length, 60);
});

test('a second seat map of the same venue gets the next version', { skip }, async () => {
    const { venueId } = await createHall();
    const second = await createSeatMap(prisma, venueId, HALL_260);
    assert.equal(second.kind, 'created');

    const venue = (await listVenues(prisma)).find((item) => item.id === venueId);
    assert.deepEqual(venue?.seatMaps.map((seatMap) => seatMap.version), [2, 1]);
    assert.equal(venue?.seatMaps[0]._count.seats, 260);
});

test('createSeatMap reports a missing venue', { skip }, async () => {
    assert.deepEqual(await createSeatMap(prisma, 2_000_000_000, HALL_260), { kind: 'venue_not_found' });
});

test('publishSeatMap publishes a draft exactly once', { skip }, async () => {
    const { seatMapId } = await createHall();

    const results = await Promise.all([publishSeatMap(prisma, seatMapId), publishSeatMap(prisma, seatMapId)]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal((await getSeatMap(prisma, seatMapId))?.status, 'PUBLISHED');
});
