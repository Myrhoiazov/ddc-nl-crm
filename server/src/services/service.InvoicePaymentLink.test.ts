import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { paymentLinkExpiry } from './service.InvoicePaymentLink';

describe('invoice Mollie payment link expiry', () => {
    it('expires at the end of the due date in Amsterdam during summer time', () => {
        assert.equal(
            paymentLinkExpiry(new Date('2026-06-25T00:00:00.000Z'))?.toISOString(),
            '2026-06-25T21:59:59.999Z',
        );
    });

    it('expires at the end of the due date in Amsterdam during winter time', () => {
        assert.equal(
            paymentLinkExpiry(new Date('2026-12-25T00:00:00.000Z'))?.toISOString(),
            '2026-12-25T22:59:59.999Z',
        );
    });

    it('does not return an expiry for a due date that has already passed', () => {
        assert.equal(paymentLinkExpiry(new Date('2020-01-01T00:00:00.000Z')), null);
    });
});
