import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMolliePaymentNotification } from './service.Telegram';

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
