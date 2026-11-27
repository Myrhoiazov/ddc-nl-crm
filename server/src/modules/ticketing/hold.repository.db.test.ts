import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createHold, expireDueHolds, releaseHold } from './hold.service';
import { createPrismaHoldRepository } from './hold.repository';
import { generateSessionInventory } from './inventory-generation.service';
import type { CreateHoldResult, HoldServiceDeps } from './ticketing.types';

// Интеграционные тесты конкуренции на реальной MySQL. Запускаются только при заданном
// TICKETING_TEST_DATABASE_URL (изолированная база с применёнными миграциями) — в обычном
// test:ci пропускаются. Команда: npm run test:ticketing:db.

const databaseUrl = process.env.TICKETING_TEST_DATABASE_URL;
const skip = databaseUrl ? false : 'TICKETING_TEST_DATABASE_URL is not set';
const SEAT_COUNT = 260;
const ATTEMPTS = 500;

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? 'mysql://unused' } } });
const deps: HoldServiceDeps = { repository: createPrismaHoldRepository(prisma), tokenSecret: 'db-test-secret' };

const createSeatMap = async () => {
    const venue = await prisma.ticketVenue.create({ data: { name: `Test venue ${Date.now()}` } });
    const seatMap = await prisma.ticketSeatMap.create({
        data: { venueId: venue.id, version: 1, name: 'Main hall', status: 'PUBLISHED', publishedAt: new Date() },
    });
    const category = await prisma.ticketSeatCategory.create({
        data: { seatMapId: seatMap.id, code: 'STD', name: 'Standard' },
    });
    await prisma.ticketSeat.createMany({
        data: Array.from({ length: SEAT_COUNT }, (_, index) => ({
            seatMapId: seatMap.id,
            categoryId: category.id,
            rowLabel: String(Math.floor(index / 20) + 1),
            seatLabel: String((index % 20) + 1),
            x: (index % 20) * 10,
            y: Math.floor(index / 20) * 10,
        })),
    });
    return { seatMapId: seatMap.id, categoryId: category.id };
};

const createOnSaleSession = async (holdTtlSeconds = 600) => {
    const { seatMapId, categoryId } = await createSeatMap();
    const event = await prisma.ticketEvent.create({
        data: { slug: `test-${randomUUID()}`, title: 'Test concert' },
    });
    const session = await prisma.ticketSession.create({
        data: {
            eventId: event.id,
            seatMapId,
            startsAt: new Date(Date.now() + 86_400_000),
            status: 'ON_SALE',
            holdTtlSeconds,
            prices: { create: { categoryId, priceCents: 2500 } },
        },
    });
    const generated = await generateSessionInventory(prisma, session.id);
    assert.deepEqual(generated, { kind: 'generated', created: SEAT_COUNT, total: SEAT_COUNT });
    const seats = await prisma.ticketSessionSeat.findMany({
        where: { sessionId: session.id },
        select: { seatId: true },
        orderBy: { seatId: 'asc' },
    });
    return { sessionId: session.id, seatIds: seats.map((seat) => seat.seatId) };
};

// Каждая попытка берёт 1–4 случайных места, поэтому наборы постоянно пересекаются.
const randomSelection = (seatIds: number[]) => {
    const size = 1 + Math.floor(Math.random() * 4);
    return Array.from({ length: size }, () => seatIds[Math.floor(Math.random() * seatIds.length)]);
};

const countByStatus = async (sessionId: number) => {
    const groups = await prisma.ticketSessionSeat.groupBy({ by: ['status'], where: { sessionId }, _count: true });
    return Object.fromEntries(groups.map((group) => [group.status, group._count]));
};

const heldSeatIdsOf = (results: CreateHoldResult[]) => results.flatMap((result) => (
    result.kind === 'held' ? result.seatIds : []
));

const drainExpiredHolds = async (sweepDeps: HoldServiceDeps) => {
    for (let pass = 0; pass < 50; pass += 1) {
        const sweep = await expireDueHolds(sweepDeps);
        if (sweep.expired + sweep.skipped === 0) return;
    }
};

test.after(async () => { await prisma.$disconnect(); });

test('500 concurrent overlapping holds never double-allocate or partially hold', { skip }, async () => {
    const { sessionId, seatIds } = await createOnSaleSession();

    const results = await Promise.all(Array.from({ length: ATTEMPTS }, () => (
        createHold(deps, { sessionId, seatIds: randomSelection(seatIds) })
    )));

    const heldSeatIds = heldSeatIdsOf(results);
    assert.equal(new Set(heldSeatIds).size, heldSeatIds.length, 'a seat was held by two holds');

    const dbHeld = await prisma.ticketSessionSeat.findMany({
        where: { sessionId, status: 'HELD' },
        select: { seatId: true, holdId: true },
    });
    assert.equal(dbHeld.length, heldSeatIds.length, 'database HELD rows differ from successful holds');

    // Проигравшие транзакции откатываются целиком: строк ticket_holds ровно столько, сколько побед.
    const holds = await prisma.ticketHold.findMany({ where: { sessionId }, select: { id: true, seatCount: true } });
    assert.equal(holds.length, results.filter((result) => result.kind === 'held').length);
    for (const hold of holds) {
        assert.equal(dbHeld.filter((seat) => seat.holdId === hold.id).length, hold.seatCount, 'partial hold found');
    }
});

test('contending for the same seats lets exactly one buyer win', { skip }, async () => {
    const { sessionId, seatIds } = await createOnSaleSession();
    const contested = seatIds.slice(0, 3);

    const results = await Promise.all(Array.from({ length: 50 }, () => createHold(deps, { sessionId, seatIds: contested })));

    assert.equal(results.filter((result) => result.kind === 'held').length, 1);
    assert.equal(results.filter((result) => result.kind === 'unavailable').length, 49);
    assert.deepEqual(await countByStatus(sessionId), { AVAILABLE: SEAT_COUNT - 3, HELD: 3 });
});

test('release and expiry return seats to sale exactly once', { skip }, async () => {
    const { sessionId, seatIds } = await createOnSaleSession(1);
    const first = await createHold(deps, { sessionId, seatIds: seatIds.slice(0, 2) });
    const second = await createHold(deps, { sessionId, seatIds: seatIds.slice(2, 4) });
    assert.equal(first.kind, 'held');
    assert.equal(second.kind, 'held');
    if (first.kind !== 'held') return;

    const released = await Promise.all([releaseHold(deps, first.holdToken), releaseHold(deps, first.holdToken)]);
    assert.deepEqual(released.sort(), [false, true]);

    const later = { ...deps, now: () => new Date(Date.now() + 5000) };
    // База общая для прогонов: в ней копятся истёкшие hold прошлых запусков, а один проход
    // обрабатывает ограниченную пачку. Два параллельных прохода проверяют идемпотентность,
    // затем очередь добирается до конца.
    await Promise.all([expireDueHolds(later), expireDueHolds(later)]);
    await drainExpiredHolds(later);
    assert.deepEqual(await countByStatus(sessionId), { AVAILABLE: SEAT_COUNT });
});

test('the database itself rejects a HELD seat without a hold', { skip }, async () => {
    const { sessionId, seatIds } = await createOnSaleSession();

    await assert.rejects(prisma.ticketSessionSeat.update({
        where: { sessionId_seatId: { sessionId, seatId: seatIds[0] } },
        data: { status: 'HELD' },
    }));
});
