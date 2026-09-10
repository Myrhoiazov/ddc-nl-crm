import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildLoginBlockedNotification,
    buildMolliePaymentNotification,
    buildNewDeviceAfterFailuresNotification,
} from './service.Telegram';

const payment = {
    mollieId: 'tr_test',
    status: 'paid',
    amountValue: '80.00',
    amountCurrency: 'EUR',
    refundedAmount: '0.00',
    chargedBackAmount: '0.00',
    description: 'Dance classes',
    method: 'ideal',
    consumerName: 'D. Test',
    paidAt: new Date('2026-06-13T10:00:00.000Z'),
    customer: {
        payerName: 'Test Parent',
        email: 'parent@example.com',
        clientLinks: [{
            client: {
                firstName: 'Test',
                lastName: 'Student',
            },
        }],
    },
    invoice: {
        number: 'INV-2026-100',
        billToName: 'Test Student',
    },
};

test('builds a successful payment notification with customer and invoice data', () => {
    const message = buildMolliePaymentNotification(payment);

    assert.match(message ?? '', /Успешная оплата/);
    assert.match(message ?? '', /D\. Test/);
    assert.match(message ?? '', /Кто оплатил/);
    assert.match(message ?? '', /За кого/);
    assert.match(message ?? '', /Test Student/);
    assert.match(message ?? '', /Статус:<\/b> Оплачен/);
    assert.match(message ?? '', /INV-2026-100/);
    assert.match(message ?? '', /tr_test/);
});

test('builds a refund notification even when payment status remains paid', () => {
    const message = buildMolliePaymentNotification({ ...payment, refundedAmount: '10.00' });

    assert.match(message ?? '', /Возврат по платежу/);
    assert.match(message ?? '', /Возвращено/);
});

test('ignores intermediate payment statuses', () => {
    assert.equal(buildMolliePaymentNotification({ ...payment, status: 'pending', paidAt: null }), null);
});

test('builds a login-blocked notification with email, IP, and retry time', () => {
    const message = buildLoginBlockedNotification({
        email: 'attacker@example.com',
        ip: '203.0.113.7',
        retryAfterSeconds: 900,
    });

    assert.match(message, /Вход заблокирован/);
    assert.match(message, /attacker@example\.com/);
    assert.match(message, /203\.0\.113\.7/);
    assert.match(message, /900/);
});

test('builds a login-blocked notification without IP when not available', () => {
    const message = buildLoginBlockedNotification({
        email: 'attacker@example.com',
        ip: null,
        retryAfterSeconds: 900,
    });

    assert.doesNotMatch(message, /IP/);
});

test('builds a new-device-after-failures notification with email, IP, and failure count', () => {
    const message = buildNewDeviceAfterFailuresNotification({
        email: 'user@example.com',
        ip: '198.51.100.4',
        recentFailures: 3,
    });

    assert.match(message, /нового устройства/);
    assert.match(message, /user@example\.com/);
    assert.match(message, /198\.51\.100\.4/);
    assert.match(message, /3/);
});
