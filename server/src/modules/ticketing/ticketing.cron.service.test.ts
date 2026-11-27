import assert from 'node:assert/strict';
import test from 'node:test';
import cron from 'node-cron';
import { startTicketingCron } from './ticketing.cron.service';

const paymentConfig = {
    TICKETING_PAYMENT_RETURN_URL: 'https://tickets.example.com/result',
    TICKETING_PAYMENT_WEBHOOK_URL: 'https://api.example.com/api/v1/ticketing/webhooks/mollie',
};

test('Ticketing jobs are off by default, including when sales are enabled', (t) => {
    const schedule = t.mock.method(cron, 'schedule');
    startTicketingCron({ ...paymentConfig, TICKETING_SALES_ENABLED: 'true' });
    assert.equal(schedule.mock.callCount(), 0);
});

test('Ticketing jobs run at their configured intervals even when sales are closed', (t) => {
    const schedule = t.mock.method(cron, 'schedule', () => {});
    startTicketingCron({
        ...paymentConfig,
        TICKETING_SALES_ENABLED: 'false',
        TICKETING_HOLD_EXPIRY_ENABLED: 'true',
        TICKETING_ORDER_EXPIRY_ENABLED: 'true',
        TICKETING_PAYMENT_RECONCILIATION_ENABLED: 'true',
    });
    assert.deepEqual(schedule.mock.calls.map(({ arguments: [expression, , options] }) => [
        options?.name, expression, options?.noOverlap,
    ]), [
        ['ticketing-hold-expiry', '* * * * *', true],
        ['ticketing-order-expiry', '* * * * *', true],
        ['ticketing-payment-reconciliation', '*/5 * * * *', true],
    ]);
});
