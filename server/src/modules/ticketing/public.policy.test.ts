import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildPublicSession,
    HOLD_REJECTION_STATUS,
    isSessionPublic,
    ORDER_REJECTION_STATUS,
    toPublicOrder,
    type PublicSessionSource,
} from './public.policy';
import type { OrderSummary } from './order.types';
import { createHoldSchema } from './public.schema';
import { isPublicSalesReady, readTicketingConfig } from './ticketing.config';

const NOW = new Date('2027-03-01T10:00:00.000Z');
const SECRET = 's'.repeat(32);

const session = (overrides: Partial<PublicSessionSource> = {}): PublicSessionSource => ({
    id: 7,
    status: 'ON_SALE',
    startsAt: new Date('2027-03-20T18:00:00.000Z'),
    doorsAt: null,
    salesStartAt: null,
    salesEndAt: null,
    holdTtlSeconds: 600,
    maxSeatsPerOrder: 8,
    currency: 'EUR',
    event: { title: 'Spring Gala', description: null },
    prices: [{ categoryId: 1, priceCents: 4500 }],
    seats: [{ seatId: 10, status: 'AVAILABLE' }, { seatId: 11, status: 'HELD' }, { seatId: 12, status: 'BLOCKED' }],
    seatMap: {
        name: 'Main hall',
        canvas: { width: 200, height: 100, seatSize: 28 },
        venue: { name: 'Theater', address: null, city: 'Amsterdam' },
        categories: [{ id: 1, name: 'VIP', colorSlot: 1 }, { id: 2, name: 'Standard', colorSlot: 2 }],
        seats: [10, 11, 12, 13].map((id) => ({ id, categoryId: 1, sectionLabel: '', rowLabel: '1', seatLabel: String(id), x: id, y: 0 })),
    },
    ...overrides,
});

test('buildPublicSession hides why a seat is taken', () => {
    const view = buildPublicSession(session(), NOW);

    assert.deepEqual(view.seats.map((seat) => seat.status), ['AVAILABLE', 'TAKEN', 'TAKEN', 'TAKEN']);
    assert.deepEqual(view.categories.map((category) => category.priceCents), [4500, null]);
    assert.equal(view.salesOpen, true);
    assert.equal(JSON.stringify(view).includes('HELD'), false);
});

test('buildPublicSession reports closed sales outside the window or when paused', () => {
    assert.equal(buildPublicSession(session({ status: 'PAUSED' }), NOW).salesOpen, false);
    assert.equal(buildPublicSession(session({ salesStartAt: new Date('2027-03-02T00:00:00.000Z') }), NOW).salesOpen, false);
    assert.equal(buildPublicSession(session({ salesEndAt: NOW }), NOW).salesOpen, false);
});

test('draft and cancelled sessions are not public', () => {
    assert.deepEqual(
        (['DRAFT', 'ON_SALE', 'PAUSED', 'CLOSED', 'CANCELLED'] as const).map(isSessionPublic),
        [false, true, true, true, false],
    );
});

test('the public order hides its checkout URL at the payment deadline', () => {
    const checkoutUrl = 'https://checkout.example.com/payment';
    const order: OrderSummary = {
        id: 99,
        number: 'T-ABCDEFGH',
        status: 'PENDING_PAYMENT',
        subtotalCents: 4500,
        feeCents: 0,
        totalCents: 4500,
        currency: 'EUR',
        paymentDeadlineAt: NOW,
        items: [],
        payment: { id: 5, idempotencyKey: 'secret-key', status: 'open', checkoutUrl },
    };
    const view = toPublicOrder(order, new Date(NOW.getTime() - 1));
    assert.equal(view.checkoutUrl, checkoutUrl);
    assert.equal(toPublicOrder(order, NOW).checkoutUrl, null);

    assert.equal(JSON.stringify(view).includes('secret-key'), false);
    assert.equal('id' in view, false);
});

test('rejections map to client errors, never to 5xx', () => {
    const statuses = [...Object.values(HOLD_REJECTION_STATUS), ...Object.values(ORDER_REJECTION_STATUS)];

    assert.equal(statuses.every((status) => status >= 400 && status < 500), true);
    assert.equal(ORDER_REJECTION_STATUS.HOLD_NOT_ACTIVE, 410);
    assert.equal(HOLD_REJECTION_STATUS.SESSION_NOT_FOUND, 404);
});

test('createHoldSchema bounds the seat list and refuses extra fields', () => {
    assert.equal(createHoldSchema.safeParse({ seatIds: [1, 2] }).success, true);
    assert.equal(createHoldSchema.safeParse({ seatIds: [] }).success, false);
    assert.equal(createHoldSchema.safeParse({ seatIds: Array.from({ length: 51 }, (_, index) => index + 1) }).success, false);
    assert.equal(createHoldSchema.safeParse({ seatIds: [1], sessionId: 3 }).success, false);
    assert.equal(createHoldSchema.safeParse({ seatIds: [1], requestKey: 'short' }).success, false);
});

test('public sales stay off until both the flag and a strong token secret are set', () => {
    assert.equal(isPublicSalesReady(readTicketingConfig({})), false);
    assert.equal(isPublicSalesReady(readTicketingConfig({ TICKETING_SALES_ENABLED: 'true' })), false);
    assert.equal(isPublicSalesReady(readTicketingConfig({ TICKETING_SALES_ENABLED: 'true', TICKETING_TOKEN_SECRET: 'short' })), false);
    assert.equal(isPublicSalesReady(readTicketingConfig({ TICKETING_SALES_ENABLED: '1', TICKETING_TOKEN_SECRET: SECRET })), false);
    assert.equal(isPublicSalesReady(readTicketingConfig({ TICKETING_SALES_ENABLED: 'true', TICKETING_TOKEN_SECRET: SECRET })), true);
});

test('readTicketingConfig takes the fee and terms version only when they are valid', () => {
    assert.deepEqual(readTicketingConfig({}).orderSettings, {});
    assert.deepEqual(readTicketingConfig({ TICKETING_FEE_CENTS: '150', TICKETING_TERMS_VERSION: ' 2027-01 ' }).orderSettings, {
        feeCents: 150,
        termsVersion: '2027-01',
    });
    assert.deepEqual(readTicketingConfig({ TICKETING_FEE_CENTS: '-5' }).orderSettings, {});
    assert.deepEqual(readTicketingConfig({ TICKETING_FEE_CENTS: '1.5' }).orderSettings, {});
});
