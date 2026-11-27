import assert from 'node:assert/strict';
import test from 'node:test';
import { createHold, expireDueHolds, releaseHold } from './hold.service';
import { hashTicketingToken } from './hold-token';
import { createFakeHoldStore, createTestDeps, onSaleSession } from './ticketing.testHelpers';

const NOW = new Date('2026-12-01T10:00:00.000Z');
const minutesLater = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

test('createHold holds every requested seat and returns an opaque token', async () => {
    const store = createFakeHoldStore([1, 2, 3]);
    const result = await createHold(createTestDeps(store, NOW), { sessionId: 1, seatIds: [3, 1] });

    assert.equal(result.kind, 'held');
    if (result.kind !== 'held') return;
    assert.deepEqual(result.seatIds, [1, 3]);
    assert.equal(result.expiresAt.toISOString(), minutesLater(10).toISOString());
    assert.deepEqual(Array.from(store.availableSeatIds), [2]);
    assert.ok(store.holds.has(hashTicketingToken(result.holdToken)));
});

test('createHold holds nothing when one of the seats is taken', async () => {
    const store = createFakeHoldStore([1, 3]);
    const result = await createHold(createTestDeps(store, NOW), { sessionId: 1, seatIds: [1, 2, 3] });

    assert.deepEqual(result, { kind: 'unavailable', unavailableSeatIds: [2] });
    assert.deepEqual(Array.from(store.availableSeatIds), [1, 3]);
    assert.equal(store.holds.size, 0);
});

test('createHold rejects without touching inventory when sales are closed', async () => {
    const store = createFakeHoldStore([1], onSaleSession({ status: 'PAUSED' }));
    const result = await createHold(createTestDeps(store, NOW), { sessionId: 1, seatIds: [1] });

    assert.deepEqual(result, { kind: 'rejected', reason: 'SALES_CLOSED' });
    assert.equal(store.holdSeatsCalls, 0);
});

test('createHold rejects a selection above the per-order limit', async () => {
    const store = createFakeHoldStore([1, 2, 3, 4, 5]);
    const result = await createHold(createTestDeps(store, NOW), { sessionId: 1, seatIds: [1, 2, 3, 4, 5] });

    assert.deepEqual(result, { kind: 'rejected', reason: 'TOO_MANY_SEATS' });
});

test('createHold with the same requestKey returns the same hold instead of a seat conflict', async () => {
    const store = createFakeHoldStore([1, 2]);
    const deps = createTestDeps(store, NOW);
    const input = { sessionId: 1, seatIds: [1, 2], requestKey: 'client-request-key-0001' };

    const first = await createHold(deps, input);
    const retry = await createHold(deps, input);

    assert.equal(first.kind, 'held');
    assert.deepEqual(retry, first);
    assert.equal(store.holds.size, 1);
    assert.equal(store.holdSeatsCalls, 1);
});

test('createHold refuses a requestKey whose hold was already released', async () => {
    const store = createFakeHoldStore([1]);
    const deps = createTestDeps(store, NOW);
    const input = { sessionId: 1, seatIds: [1], requestKey: 'client-request-key-0002' };

    const first = await createHold(deps, input);
    assert.equal(first.kind, 'held');
    if (first.kind !== 'held') return;
    await releaseHold(deps, first.holdToken);

    assert.deepEqual(await createHold(deps, input), { kind: 'rejected', reason: 'REQUEST_KEY_REUSED' });
    assert.deepEqual(Array.from(store.availableSeatIds), [1]);
});

test('createHold retries a deadlock and then succeeds', async () => {
    const store = createFakeHoldStore([1]);
    store.failuresBeforeSuccess.push({ code: 'P2034', message: 'write conflict or a deadlock' });

    const result = await createHold(createTestDeps(store, NOW), { sessionId: 1, seatIds: [1] });

    assert.equal(result.kind, 'held');
    assert.equal(store.holdSeatsCalls, 2);
});

test('createHold does not retry an unrelated database error', async () => {
    const store = createFakeHoldStore([1]);
    store.failuresBeforeSuccess.push(new Error('connection refused'));

    await assert.rejects(createHold(createTestDeps(store, NOW), { sessionId: 1, seatIds: [1] }), /connection refused/);
    assert.equal(store.holdSeatsCalls, 1);
});

test('releaseHold frees the seats once and is harmless when repeated', async () => {
    const store = createFakeHoldStore([1, 2]);
    const deps = createTestDeps(store, NOW);
    const held = await createHold(deps, { sessionId: 1, seatIds: [1, 2] });
    assert.equal(held.kind, 'held');
    if (held.kind !== 'held') return;

    assert.equal(await releaseHold(deps, held.holdToken), true);
    assert.equal(await releaseHold(deps, held.holdToken), false);
    assert.deepEqual(Array.from(store.availableSeatIds).sort(), [1, 2]);
});

test('expireDueHolds frees only holds whose TTL has passed', async () => {
    const store = createFakeHoldStore([1, 2]);
    await createHold(createTestDeps(store, NOW), { sessionId: 1, seatIds: [1] });
    await createHold(createTestDeps(store, minutesLater(8)), { sessionId: 1, seatIds: [2] });

    const result = await expireDueHolds(createTestDeps(store, minutesLater(11)));

    assert.deepEqual(result, { expired: 1, skipped: 0 });
    assert.deepEqual(Array.from(store.availableSeatIds), [1]);
});
