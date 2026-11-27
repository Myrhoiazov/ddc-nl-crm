import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildEventSnapshot,
    computeOrderTotals,
    computePaymentDeadline,
    formatOrderNumber,
    resolveOrderSettings,
} from './order.policy';
import { checkoutSchema } from './order.schema';
import { deriveOrderAccessToken } from './hold-token';

const HOLD_TOKEN = 'h'.repeat(43);
const BUYER = { name: 'Anna de Vries', email: 'anna@example.com' };

test('formatOrderNumber gives a fixed-length number without ambiguous letters', () => {
    const number = formatOrderNumber(Uint8Array.from([0, 31, 32, 63, 255, 18, 20, 24]));

    assert.equal(number, 'T-0Z0ZZJMR');
    assert.match(formatOrderNumber(Uint8Array.from(Array.from({ length: 8 }, (_, index) => index * 37))), /^T-[0-9A-HJKMNP-TV-Z]{8}$/);
});

test('computeOrderTotals sums seat prices on the server and adds the fee', () => {
    assert.deepEqual(computeOrderTotals([4500, 2500, 2500], 0), { subtotalCents: 9500, feeCents: 0, totalCents: 9500 });
    assert.deepEqual(computeOrderTotals([2500], 150), { subtotalCents: 2500, feeCents: 150, totalCents: 2650 });
});

test('computePaymentDeadline and settings defaults follow the 20-minute payment window', () => {
    const now = new Date('2027-03-01T10:00:00.000Z');
    const settings = resolveOrderSettings({ feeCents: 100 });

    assert.equal(settings.paymentWindowSeconds, 1200);
    assert.equal(settings.feeCents, 100);
    assert.equal(computePaymentDeadline(now, settings.paymentWindowSeconds).toISOString(), '2027-03-01T10:20:00.000Z');
});

test('buildEventSnapshot keeps what a ticket needs after the event is edited', () => {
    const snapshot = buildEventSnapshot({
        startsAt: new Date('2027-03-20T18:00:00.000Z'),
        doorsAt: null,
        event: { title: 'Spring Gala' },
        seatMap: { name: 'Main hall', venue: { name: 'Theater', address: 'Hoofdstraat 1', city: 'Amsterdam' } },
    });

    assert.deepEqual(snapshot, {
        eventTitle: 'Spring Gala',
        startsAt: '2027-03-20T18:00:00.000Z',
        doorsAt: null,
        venueName: 'Theater',
        venueAddress: 'Hoofdstraat 1',
        venueCity: 'Amsterdam',
        seatMapName: 'Main hall',
    });
});

test('deriveOrderAccessToken is stable per hold token and differs between holds', () => {
    const token = deriveOrderAccessToken('secret', HOLD_TOKEN);

    assert.equal(token, deriveOrderAccessToken('secret', HOLD_TOKEN));
    assert.notEqual(token, deriveOrderAccessToken('secret', `${HOLD_TOKEN}x`));
    assert.notEqual(token, deriveOrderAccessToken('other-secret', HOLD_TOKEN));
    assert.notEqual(token, HOLD_TOKEN);
});

test('checkoutSchema normalises the buyer and requires explicit consent', () => {
    const parsed = checkoutSchema.safeParse({
        holdToken: HOLD_TOKEN,
        buyer: { name: '  Anna de Vries ', email: ' Anna@Example.COM ' },
        acceptTerms: true,
    });

    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.success && parsed.data.buyer, { name: 'Anna de Vries', email: 'anna@example.com', locale: 'nl' });
    assert.equal(checkoutSchema.safeParse({ holdToken: HOLD_TOKEN, buyer: BUYER, acceptTerms: false }).success, false);
    assert.equal(checkoutSchema.safeParse({ holdToken: HOLD_TOKEN, buyer: BUYER }).success, false);
    assert.equal(checkoutSchema.safeParse({ holdToken: HOLD_TOKEN, buyer: { ...BUYER, email: 'nope' }, acceptTerms: true }).success, false);
});

test('checkoutSchema refuses client-supplied amounts and seats', () => {
    const base = { holdToken: HOLD_TOKEN, buyer: BUYER, acceptTerms: true };

    assert.equal(checkoutSchema.safeParse({ ...base, totalCents: 1 }).success, false);
    assert.equal(checkoutSchema.safeParse({ ...base, seatIds: [1] }).success, false);
    assert.equal(checkoutSchema.safeParse({ ...base, buyer: { ...BUYER, locale: 'de' } }).success, false);
});
