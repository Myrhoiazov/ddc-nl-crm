import assert from 'node:assert/strict';
import test from 'node:test';
import { decideOrderAction, findPaymentMismatch, fromMollieAmount, toMollieAmount } from './payment.policy';
import type { RemotePayment } from './payment.types';

const expected = { orderId: 42, mode: 'TEST', amountCents: 1250, currency: 'EUR' } as const;
const paid: RemotePayment = {
    id: 'tr_example', status: 'paid', mode: 'TEST', amountCents: 1250, currency: 'EUR',
    checkoutUrl: null, expiresAt: null, paidAt: null, method: null, refundedCents: 0,
    chargedBackCents: 0, metadata: { source: 'ticketing', orderId: 42 },
};

test('payment amounts round-trip using decimal strings and integer cents', () => {
    assert.equal(toMollieAmount(1250), '12.50');
    assert.equal(fromMollieAmount('12.50'), 1250);
    assert.ok(Number.isNaN(fromMollieAmount('12.501')));
});

test('a paid payment confirms only with matching metadata, amount, currency and mode', () => {
    assert.deepEqual(decideOrderAction('PENDING_PAYMENT', paid, findPaymentMismatch(expected, paid)), { kind: 'CONFIRM' });
    const cases = [
        [{ ...paid, metadata: { source: 'ticketing', orderId: 17 } }, 'METADATA_MISMATCH'],
        [{ ...paid, amountCents: 1249 }, 'AMOUNT_MISMATCH'],
        [{ ...paid, currency: 'USD' }, 'CURRENCY_MISMATCH'],
        [{ ...paid, mode: 'LIVE' as const }, 'MODE_MISMATCH'],
    ] as const;
    for (const [remote, reason] of cases) {
        assert.deepEqual(decideOrderAction('PENDING_PAYMENT', remote, findPaymentMismatch(expected, remote)), {
            kind: 'REVIEW', reason,
        });
    }
});

test('a chargeback sends a paid order for review', () => {
    assert.deepEqual(decideOrderAction('PAID', { ...paid, chargedBackCents: 1250 }, null), {
        kind: 'REVIEW', reason: 'CHARGEBACK',
    });
});

test('late valid payment can reclaim only expired orders', () => {
    assert.deepEqual(decideOrderAction('EXPIRED', paid, null), { kind: 'RECLAIM' });
    assert.deepEqual(decideOrderAction('CANCELLED', paid, null), { kind: 'REVIEW', reason: 'LATE_PAYMENT' });
});
