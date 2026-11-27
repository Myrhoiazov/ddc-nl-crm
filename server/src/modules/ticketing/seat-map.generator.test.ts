import assert from 'node:assert/strict';
import test from 'node:test';
import { countSeats, generateSeatMap, SEAT_PITCH } from './seat-map.generator';
import { createSeatMapSchema, createVenueSchema, parsePositiveId, updateSeatsSchema } from './venue.schema';

const HALL_260 = [
    { categoryName: 'VIP', rows: 3, seatsPerRow: 20 },
    { categoryName: 'Standard', rows: 10, seatsPerRow: 20 },
];

test('generateSeatMap produces every seat of the 260-seat hall with unique labels', () => {
    const map = generateSeatMap(HALL_260);
    const labels = new Set(map.seats.map((seat) => `${seat.rowLabel}-${seat.seatLabel}`));

    assert.equal(countSeats(HALL_260), 260);
    assert.equal(map.seats.length, 260);
    assert.equal(labels.size, 260);
    assert.deepEqual(map.categories.map((category) => [category.code, category.name, category.colorSlot]), [
        ['C1', 'VIP', 1],
        ['C2', 'Standard', 2],
    ]);
});

test('generateSeatMap numbers rows continuously across blocks and assigns categories', () => {
    const map = generateSeatMap(HALL_260);

    assert.equal(map.seats.filter((seat) => seat.categoryCode === 'C1').length, 60);
    assert.deepEqual(Array.from(new Set(map.seats.map((seat) => seat.rowLabel))).length, 13);
    assert.equal(map.seats[60].rowLabel, '4');
    assert.equal(map.seats[60].categoryCode, 'C2');
});

test('generateSeatMap centres a shorter row and never overlaps seats', () => {
    const map = generateSeatMap([
        { categoryName: 'Front', rows: 1, seatsPerRow: 4 },
        { categoryName: 'Back', rows: 1, seatsPerRow: 6 },
    ]);
    const positions = new Set(map.seats.map((seat) => `${seat.x}:${seat.y}`));

    assert.equal(positions.size, map.seats.length);
    assert.equal(map.seats[0].x - map.seats[4].x, SEAT_PITCH);
    assert.equal(map.canvas.width > 6 * SEAT_PITCH, true);
});

test('createSeatMapSchema rejects empty, oversized and unknown input', () => {
    assert.equal(createSeatMapSchema.safeParse({ name: 'Hall', blocks: HALL_260 }).success, true);
    assert.equal(createSeatMapSchema.safeParse({ name: 'Hall', blocks: [] }).success, false);
    assert.equal(createSeatMapSchema.safeParse({ name: ' ', blocks: HALL_260 }).success, false);
    assert.equal(createSeatMapSchema.safeParse({
        name: 'Hall',
        blocks: [{ categoryName: 'A', rows: 100, seatsPerRow: 100 }],
    }).success, false);
    assert.equal(createSeatMapSchema.safeParse({ name: 'Hall', blocks: HALL_260, status: 'PUBLISHED' }).success, false);
});

test('createVenueSchema trims the name and parsePositiveId rejects bad ids', () => {
    const parsed = createVenueSchema.safeParse({ name: '  Theater  ' });

    assert.equal(parsed.success && parsed.data.name, 'Theater');
    assert.equal(createVenueSchema.safeParse({ name: '' }).success, false);
    assert.equal(parsePositiveId('12'), 12);
    assert.equal(parsePositiveId('0'), null);
    assert.equal(parsePositiveId('abc'), null);
});

test('updateSeatsSchema requires seats and at least one change', () => {
    assert.equal(updateSeatsSchema.safeParse({ seatIds: [1, 2], isDefaultBlocked: true }).success, true);
    assert.equal(updateSeatsSchema.safeParse({ seatIds: [1], categoryId: 3 }).success, true);
    assert.equal(updateSeatsSchema.safeParse({ seatIds: [1] }).success, false);
    assert.equal(updateSeatsSchema.safeParse({ seatIds: [], isDefaultBlocked: true }).success, false);
    assert.equal(updateSeatsSchema.safeParse({ seatIds: [0], isDefaultBlocked: true }).success, false);
    assert.equal(updateSeatsSchema.safeParse({ seatIds: [1], isDefaultBlocked: true, x: 10 }).success, false);
});
