import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedSourceStatuses, buildEventSlug, checkPriceCoverage, isSalesWindowValid } from './event.policy';
import { createEventSchema, createSessionSchema, sessionStatusSchema } from './event.schema';

const STARTS_AT = new Date('2027-03-01T19:00:00.000Z');

test('buildEventSlug keeps latin words and falls back for a cyrillic title', () => {
    assert.equal(buildEventSlug('Spring Gala 2027!', 'ab12'), 'spring-gala-2027-ab12');
    assert.equal(buildEventSlug('Весенний концерт', 'ab12'), 'event-ab12');
    assert.equal(buildEventSlug('  --  ', 'ab12'), 'event-ab12');
});

test('checkPriceCoverage requires exactly one price per category', () => {
    assert.deepEqual(checkPriceCoverage([1, 2], [{ categoryId: 1, priceCents: 100 }, { categoryId: 2, priceCents: 0 }]), { kind: 'ok' });
    assert.deepEqual(checkPriceCoverage([1, 2], [{ categoryId: 1, priceCents: 100 }]), {
        kind: 'mismatch', missingCategoryIds: [2], unknownCategoryIds: [],
    });
    assert.deepEqual(checkPriceCoverage([1], [{ categoryId: 1, priceCents: 1 }, { categoryId: 9, priceCents: 1 }]), {
        kind: 'mismatch', missingCategoryIds: [], unknownCategoryIds: [9],
    });
    assert.deepEqual(checkPriceCoverage([1], [{ categoryId: 1, priceCents: 1 }, { categoryId: 1, priceCents: 2 }]), {
        kind: 'mismatch', missingCategoryIds: [], unknownCategoryIds: [1],
    });
});

test('isSalesWindowValid rejects an inverted window and sales starting after the show', () => {
    const before = new Date('2027-01-01T00:00:00.000Z');
    const later = new Date('2027-02-01T00:00:00.000Z');
    const afterShow = new Date('2027-04-01T00:00:00.000Z');

    assert.equal(isSalesWindowValid({ startsAt: STARTS_AT, salesStartAt: null, salesEndAt: null }), true);
    assert.equal(isSalesWindowValid({ startsAt: STARTS_AT, salesStartAt: before, salesEndAt: later }), true);
    assert.equal(isSalesWindowValid({ startsAt: STARTS_AT, salesStartAt: later, salesEndAt: before }), false);
    assert.equal(isSalesWindowValid({ startsAt: STARTS_AT, salesStartAt: afterShow, salesEndAt: null }), false);
});

test('manual status changes never reopen a closed session or publish a draft', () => {
    assert.deepEqual(allowedSourceStatuses('PAUSED'), ['ON_SALE']);
    assert.deepEqual(allowedSourceStatuses('ON_SALE'), ['PAUSED']);
    assert.deepEqual(allowedSourceStatuses('CLOSED'), ['ON_SALE', 'PAUSED']);
    assert.equal(sessionStatusSchema.safeParse({ status: 'DRAFT' }).success, false);
    assert.equal(sessionStatusSchema.safeParse({ status: 'CANCELLED' }).success, false);
});

test('session and event schemas reject malformed input', () => {
    const valid = { seatMapId: 1, startsAt: '2027-03-01T19:00:00.000Z', prices: [{ categoryId: 1, priceCents: 2500 }] };

    assert.equal(createSessionSchema.safeParse(valid).success, true);
    assert.equal(createSessionSchema.safeParse({ ...valid, startsAt: 'tomorrow' }).success, false);
    assert.equal(createSessionSchema.safeParse({ ...valid, prices: [{ categoryId: 1, priceCents: -1 }] }).success, false);
    assert.equal(createSessionSchema.safeParse({ ...valid, prices: [{ categoryId: 1, priceCents: 25.5 }] }).success, false);
    assert.equal(createSessionSchema.safeParse({ ...valid, status: 'ON_SALE' }).success, false);
    assert.equal(createEventSchema.safeParse({ title: ' ' }).success, false);
});
