import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { cloneSeatMap, updateSeats } from './seat-map-edit.service';
import { createSeatMap, createVenue, getSeatMap, publishSeatMap } from './venue.service';

// Интеграционные тесты правки и клонирования схемы на реальной MySQL (см. hold.repository.db.test.ts).

const databaseUrl = process.env.TICKETING_TEST_DATABASE_URL;
const skip = databaseUrl ? false : 'TICKETING_TEST_DATABASE_URL is not set';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? 'mysql://unused' } } });

const SMALL_HALL = {
    name: 'Small hall',
    blocks: [
        { categoryName: 'VIP', rows: 1, seatsPerRow: 4 },
        { categoryName: 'Standard', rows: 2, seatsPerRow: 4 },
    ],
};

const createDraft = async () => {
    const venue = await createVenue(prisma, { name: `Venue ${Date.now()}-${Math.random()}` });
    const created = await createSeatMap(prisma, venue.id, SMALL_HALL);
    assert.equal(created.kind, 'created');
    const seatMap = await getSeatMap(prisma, created.kind === 'created' ? created.seatMapId : 0);
    assert.ok(seatMap);
    return seatMap;
};

test.after(async () => { await prisma.$disconnect(); });

test('updateSeats blocks seats and moves them to another category, repeatably', { skip }, async () => {
    const draft = await createDraft();
    const [vip, standard] = draft.categories;
    const seatIds = draft.seats.filter((seat) => seat.categoryId === standard.id).slice(0, 2).map((seat) => seat.id);
    const patch = { seatIds: [...seatIds, seatIds[0]], categoryId: vip.id, isDefaultBlocked: true };

    assert.deepEqual(await updateSeats(prisma, draft.id, patch), { kind: 'updated', seats: 2 });
    assert.deepEqual(await updateSeats(prisma, draft.id, patch), { kind: 'updated', seats: 2 });

    const changed = (await getSeatMap(prisma, draft.id))?.seats.filter((seat) => seatIds.includes(seat.id));
    assert.deepEqual(changed?.map((seat) => [seat.categoryId, seat.isDefaultBlocked]), [[vip.id, true], [vip.id, true]]);
    assert.equal((await getSeatMap(prisma, draft.id))?.seats.filter((seat) => seat.isDefaultBlocked).length, 2);
});

test('updateSeats changes only the requested field', { skip }, async () => {
    const draft = await createDraft();
    const seat = draft.seats[0];

    await updateSeats(prisma, draft.id, { seatIds: [seat.id], isDefaultBlocked: true });
    await updateSeats(prisma, draft.id, { seatIds: [seat.id], categoryId: draft.categories[1].id });

    const stored = (await getSeatMap(prisma, draft.id))?.seats.find((item) => item.id === seat.id);
    assert.deepEqual([stored?.categoryId, stored?.isDefaultBlocked], [draft.categories[1].id, true]);
});

test('updateSeats rejects foreign seats and categories without partial changes', { skip }, async () => {
    const draft = await createDraft();
    const other = await createDraft();
    const ownSeatId = draft.seats[0].id;

    assert.deepEqual(
        await updateSeats(prisma, draft.id, { seatIds: [ownSeatId, other.seats[0].id], isDefaultBlocked: true }),
        { kind: 'rejected', reason: 'UNKNOWN_SEATS' },
    );
    assert.deepEqual(
        await updateSeats(prisma, draft.id, { seatIds: [ownSeatId], categoryId: other.categories[0].id }),
        { kind: 'rejected', reason: 'UNKNOWN_CATEGORY' },
    );
    assert.deepEqual(
        await updateSeats(prisma, 2_000_000_000, { seatIds: [ownSeatId], isDefaultBlocked: true }),
        { kind: 'rejected', reason: 'SEAT_MAP_NOT_FOUND' },
    );
    assert.equal((await getSeatMap(prisma, draft.id))?.seats.some((seat) => seat.isDefaultBlocked), false);
});

test('a published seat map refuses seat changes', { skip }, async () => {
    const draft = await createDraft();
    assert.equal(await publishSeatMap(prisma, draft.id), true);

    assert.deepEqual(
        await updateSeats(prisma, draft.id, { seatIds: [draft.seats[0].id], isDefaultBlocked: true }),
        { kind: 'rejected', reason: 'NOT_A_DRAFT' },
    );
});

test('cloneSeatMap copies a published version into the next editable draft', { skip }, async () => {
    const source = await createDraft();
    const blockedLabel = `${source.seats[3].rowLabel}-${source.seats[3].seatLabel}`;
    await updateSeats(prisma, source.id, { seatIds: [source.seats[3].id], isDefaultBlocked: true });
    await publishSeatMap(prisma, source.id);

    const cloneId = await cloneSeatMap(prisma, source.id);
    const clone = await getSeatMap(prisma, cloneId ?? 0);

    assert.deepEqual([clone?.status, clone?.version, clone?.venueId], ['DRAFT', 2, source.venueId]);
    assert.deepEqual(clone?.canvas, source.canvas);
    assert.deepEqual(clone?.categories.map((category) => category.name), ['VIP', 'Standard']);
    assert.equal(clone?.categories.some((category) => source.categories.some((item) => item.id === category.id)), false);
    assert.equal(clone?.seats.length, source.seats.length);
    assert.deepEqual(
        clone?.seats.filter((seat) => seat.isDefaultBlocked).map((seat) => `${seat.rowLabel}-${seat.seatLabel}`),
        [blockedLabel],
    );
    assert.equal(clone?.seats.filter((seat) => seat.categoryId === clone.categories[0].id).length, 4);

    const edited = await updateSeats(prisma, clone?.id ?? 0, { seatIds: [clone?.seats[0].id ?? 0], isDefaultBlocked: true });
    assert.equal(edited.kind, 'updated');
    assert.equal((await getSeatMap(prisma, source.id))?.seats.filter((seat) => seat.isDefaultBlocked).length, 1);
});

test('cloneSeatMap reports a missing seat map', { skip }, async () => {
    assert.equal(await cloneSeatMap(prisma, 2_000_000_000), null);
});
