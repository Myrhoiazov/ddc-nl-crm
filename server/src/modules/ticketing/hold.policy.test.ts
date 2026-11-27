import assert from 'node:assert/strict';
import test from 'node:test';
import { isRetryableLockError, withLockRetry } from './db-retry';
import { deriveHoldToken, hashClientIp, hashTicketingToken, resolveHoldToken } from './hold-token';
import { checkSeatSelection, isHoldLive, isSalesOpen, normalizeSeatIds } from './hold.policy';
import { buildInventoryRows, findCategoriesWithoutPrice } from './inventory-generation.service';
import { onSaleSession } from './ticketing.testHelpers';

const NOW = new Date('2026-12-01T10:00:00.000Z');

test('normalizeSeatIds sorts, de-duplicates and rejects invalid ids', () => {
    assert.deepEqual(normalizeSeatIds([5, 2, 5, 9]), [2, 5, 9]);
    assert.equal(normalizeSeatIds([]), null);
    assert.equal(normalizeSeatIds([1, 0]), null);
    assert.equal(normalizeSeatIds([1.5]), null);
});

test('isSalesOpen respects status and the sales window', () => {
    assert.equal(isSalesOpen(onSaleSession(), NOW), true);
    assert.equal(isSalesOpen(onSaleSession({ status: 'DRAFT' }), NOW), false);
    assert.equal(isSalesOpen(onSaleSession({ salesStartAt: new Date('2026-12-02T00:00:00Z') }), NOW), false);
    assert.equal(isSalesOpen(onSaleSession({ salesEndAt: NOW }), NOW), false);
});

test('checkSeatSelection reports the first failing rule', () => {
    assert.deepEqual(checkSeatSelection(null, [1], NOW), { kind: 'rejected', reason: 'SESSION_NOT_FOUND' });
    assert.deepEqual(checkSeatSelection(onSaleSession(), [-1], NOW), { kind: 'rejected', reason: 'INVALID_SEATS' });
    assert.deepEqual(checkSeatSelection(onSaleSession(), [2, 1], NOW), { kind: 'ok', seatIds: [1, 2] });
});

test('isHoldLive is false for an expired or closed hold', () => {
    const future = new Date(NOW.getTime() + 1000);
    assert.equal(isHoldLive({ status: 'ACTIVE', expiresAt: future }, NOW), true);
    assert.equal(isHoldLive({ status: 'ACTIVE', expiresAt: NOW }, NOW), false);
    assert.equal(isHoldLive({ status: 'RELEASED', expiresAt: future }, NOW), false);
});

test('hold tokens are deterministic per request key and secret-dependent', () => {
    assert.equal(deriveHoldToken('s', 1, 'key'), deriveHoldToken('s', 1, 'key'));
    assert.notEqual(deriveHoldToken('s', 1, 'key'), deriveHoldToken('s', 2, 'key'));
    assert.notEqual(deriveHoldToken('s', 1, 'key'), deriveHoldToken('other', 1, 'key'));
    assert.notEqual(resolveHoldToken('s', 1), resolveHoldToken('s', 1));
    assert.match(hashTicketingToken('token'), /^[0-9a-f]{64}$/);
});

test('hashClientIp never returns the raw address', () => {
    assert.equal(hashClientIp('s', undefined), null);
    assert.match(hashClientIp('s', '203.0.113.7') ?? '', /^[0-9a-f]{64}$/);
});

test('isRetryableLockError recognises deadlocks and lock timeouts only', () => {
    assert.equal(isRetryableLockError({ code: 'P2034' }), true);
    assert.equal(isRetryableLockError(new Error('Lock wait timeout exceeded; try restarting transaction')), true);
    assert.equal(isRetryableLockError(new Error('Deadlock found when trying to get lock')), true);
    assert.equal(isRetryableLockError(new Error('Unknown column')), false);
    assert.equal(isRetryableLockError(null), false);
});

test('withLockRetry gives up after the configured number of attempts', async () => {
    let calls = 0;
    const operation = async () => {
        calls += 1;
        throw { code: 'P2034' };
    };

    await assert.rejects(withLockRetry(operation, { attempts: 3, sleep: async () => undefined }));
    assert.equal(calls, 3);
});

test('buildInventoryRows prices seats by category and blocks default-blocked seats', () => {
    const seats = [
        { id: 10, categoryId: 1, isDefaultBlocked: false },
        { id: 11, categoryId: 2, isDefaultBlocked: true },
    ];
    const rows = buildInventoryRows(7, seats, new Map([[1, 2500], [2, 4000]]));

    assert.deepEqual(rows, [
        { sessionId: 7, seatId: 10, status: 'AVAILABLE', priceCents: 2500, blockReason: null },
        { sessionId: 7, seatId: 11, status: 'BLOCKED', priceCents: 4000, blockReason: 'seat-map-default' },
    ]);
});

test('findCategoriesWithoutPrice lists every unpriced category once', () => {
    const seats = [
        { id: 1, categoryId: 3, isDefaultBlocked: false },
        { id: 2, categoryId: 3, isDefaultBlocked: false },
        { id: 3, categoryId: 1, isDefaultBlocked: false },
    ];
    assert.deepEqual(findCategoriesWithoutPrice(seats, new Map([[1, 100]])), [3]);
});
