import assert from 'node:assert/strict';
import test from 'node:test';
import { TicketDeliveryStatus } from '@prisma/client';
import {
    MAX_TICKET_DELIVERY_ATTEMPTS,
    ticketDeliveryEmail,
    ticketDeliveryRetry,
    ticketDeliveryRetryDelayMs,
} from './ticket-delivery.policy';
import type { TicketBundle } from './ticket.types';

const bundle: TicketBundle = {
    orderNumber: 'T-ABCDEF12',
    event: {
        title: 'Jazz <Night>',
        startsAt: '2027-03-01T20:00:00.000Z',
        doorsAt: '2027-03-01T19:00:00.000Z',
        venueName: 'Club <Amsterdam>',
        venueAddress: 'Damrak 1',
        venueCity: 'Amsterdam',
        seatMapName: 'Main hall',
    },
    tickets: [{
        token: 'v1.AbcDef123',
        status: 'VALID',
        issuedAt: new Date('2027-02-01T10:00:00.000Z'),
        seat: { sectionLabel: '', rowLabel: '1', seatLabel: '2', categoryName: 'Standard', priceCents: 2500 },
    }],
};

test('a delivery gets three retries after the first attempt with growing delays', () => {
    assert.equal(MAX_TICKET_DELIVERY_ATTEMPTS, 4);
    assert.deepEqual([1, 2, 3, 4].map(ticketDeliveryRetryDelayMs), [60_000, 120_000, 240_000, 480_000]);
    assert.equal(ticketDeliveryRetryDelayMs(20), 24 * 60 * 60 * 1000);

    const now = new Date('2027-02-01T10:00:00.000Z');
    for (const attempts of [1, 2, 3]) {
        const retry = ticketDeliveryRetry(attempts, now, 'SMTP down');
        assert.equal(retry.status, TicketDeliveryStatus.PENDING);
        assert.equal(retry.nextAttemptAt.getTime(), now.getTime() + ticketDeliveryRetryDelayMs(attempts));
        assert.equal(retry.lastError, 'SMTP down');
    }

    const exhausted = ticketDeliveryRetry(MAX_TICKET_DELIVERY_ATTEMPTS, now, 'SMTP down');
    assert.equal(exhausted.status, TicketDeliveryStatus.FAILED);
    assert.equal(exhausted.nextAttemptAt.getTime(), now.getTime());
});

test('ticket email contains event details but never exposes the opaque token in its body', () => {
    const email = ticketDeliveryEmail(bundle);

    assert.match(email.subject, /Jazz <Night>/);
    assert.match(email.text, /T-ABCDEF12/);
    assert.match(email.text, /Club <Amsterdam>/);
    assert.equal(email.text.includes(bundle.tickets[0].token), false);
    assert.equal(email.html.includes(bundle.tickets[0].token), false);
    assert.equal(email.html.includes('&lt;Night&gt;'), true);
    assert.equal(email.html.includes('&lt;Amsterdam&gt;'), true);
    assert.equal(email.html.includes('<script'), false);
    assert.equal(email.attachmentName, 'tickets-T-ABCDEF12.pdf');
});
