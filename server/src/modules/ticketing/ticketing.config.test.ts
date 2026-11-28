import assert from 'node:assert/strict';
import test from 'node:test';
import { isTicketEmailEnabled, readTicketOrderUrl, readTicketSmtpConfig } from './ticketing.config';

test('ticket email is opt-in', () => {
    assert.equal(isTicketEmailEnabled({}), false);
    assert.equal(isTicketEmailEnabled({ TICKETING_EMAIL_ENABLED: 'true' }), true);
    assert.equal(isTicketEmailEnabled({ TICKETING_EMAIL_ENABLED: 'TRUE' }), false);
});

test('SMTP config is all-or-nothing and falls back to the configured sender', () => {
    const base = {
        SMTP_HOST: 'smtp.example.test',
        SMTP_USER: 'tickets@example.test',
        SMTP_PASSWORD: 'not-a-real-password',
    };
    assert.equal(readTicketSmtpConfig({}), null);
    assert.equal(readTicketSmtpConfig({ ...base, SMTP_PASSWORD: '' }), null);

    assert.deepEqual(readTicketSmtpConfig(base), {
        host: 'smtp.example.test',
        port: 587,
        secure: false,
        user: 'tickets@example.test',
        password: 'not-a-real-password',
        from: 'tickets@example.test',
    });
    assert.deepEqual(readTicketSmtpConfig({
        ...base,
        SMTP_PORT: '465',
        SMTP_FROM: 'tickets+alias@example.test',
    }), {
        host: 'smtp.example.test',
        port: 465,
        secure: true,
        user: 'tickets@example.test',
        password: 'not-a-real-password',
        from: 'tickets+alias@example.test',
    });
    assert.deepEqual(readTicketSmtpConfig({ ...base, SMTP_PORT: 'bad', SMTP_SECURE: 'true' }), {
        host: 'smtp.example.test',
        port: 587,
        secure: true,
        user: 'tickets@example.test',
        password: 'not-a-real-password',
        from: 'tickets@example.test',
    });
});

test('recovery links use the order page, falling back to the payment return URL', () => {
    const returnUrl = 'https://tickets.example.test/payment/result';
    assert.equal(readTicketOrderUrl({}), null);
    assert.equal(readTicketOrderUrl({ TICKETING_PAYMENT_RETURN_URL: returnUrl }), returnUrl);
    assert.equal(
        readTicketOrderUrl({ TICKETING_PAYMENT_RETURN_URL: returnUrl, TICKETING_ORDER_URL: 'https://tickets.example.test/order' }),
        'https://tickets.example.test/order',
    );
    assert.equal(readTicketOrderUrl({ TICKETING_ORDER_URL: 'http://insecure.test/order' }), null);
});
