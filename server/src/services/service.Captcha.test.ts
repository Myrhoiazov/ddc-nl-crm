import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { captchaSiteKey, isCaptchaConfigured, verifyCaptchaToken } from './service.Captcha';

const withEnv = (vars: Record<string, string | undefined>, fn: () => void) => {
    const previous: Record<string, string | undefined> = {};
    for (const key of Object.keys(vars)) {
        previous[key] = process.env[key];
        if (vars[key] === undefined) delete process.env[key];
        else process.env[key] = vars[key];
    }
    try {
        fn();
    } finally {
        for (const key of Object.keys(previous)) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
    }
};

test('isCaptchaConfigured is false when neither key is set', () => {
    withEnv({ TURNSTILE_SITE_KEY: undefined, TURNSTILE_SECRET_KEY: undefined }, () => {
        assert.equal(isCaptchaConfigured(), false);
    });
});

test('isCaptchaConfigured is false when only one key is set', () => {
    withEnv({ TURNSTILE_SITE_KEY: 'site-key', TURNSTILE_SECRET_KEY: undefined }, () => {
        assert.equal(isCaptchaConfigured(), false);
    });
    withEnv({ TURNSTILE_SITE_KEY: undefined, TURNSTILE_SECRET_KEY: 'secret-key' }, () => {
        assert.equal(isCaptchaConfigured(), false);
    });
});

test('isCaptchaConfigured is true when both keys are set', () => {
    withEnv({ TURNSTILE_SITE_KEY: 'site-key', TURNSTILE_SECRET_KEY: 'secret-key' }, () => {
        assert.equal(isCaptchaConfigured(), true);
    });
});

test('captchaSiteKey returns the configured site key, or null when unset', () => {
    withEnv({ TURNSTILE_SITE_KEY: 'site-key' }, () => {
        assert.equal(captchaSiteKey(), 'site-key');
    });
    withEnv({ TURNSTILE_SITE_KEY: undefined }, () => {
        assert.equal(captchaSiteKey(), null);
    });
});

test('verifyCaptchaToken returns true on a successful Turnstile verification', async (t) => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key';
    const postMock = t.mock.method(axios, 'post', async () => ({ data: { success: true } }));

    const result = await verifyCaptchaToken('valid-token', '203.0.113.5');

    assert.equal(result, true);
    assert.equal(postMock.mock.callCount(), 1);
    delete process.env.TURNSTILE_SECRET_KEY;
});

test('verifyCaptchaToken returns false when Turnstile rejects the token', async (t) => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key';
    t.mock.method(axios, 'post', async () => ({ data: { success: false, 'error-codes': ['invalid-input-response'] } }));

    const result = await verifyCaptchaToken('bad-token');

    assert.equal(result, false);
    delete process.env.TURNSTILE_SECRET_KEY;
});

test('verifyCaptchaToken returns false and swallows the error on a network failure', async (t) => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key';
    t.mock.method(axios, 'post', async () => {
        throw new Error('network error');
    });

    const result = await verifyCaptchaToken('any-token');

    assert.equal(result, false);
    delete process.env.TURNSTILE_SECRET_KEY;
});

test('verifyCaptchaToken returns false without calling axios when the secret is not configured', async (t) => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const postMock = t.mock.method(axios, 'post', async () => ({ data: { success: true } }));

    const result = await verifyCaptchaToken('any-token');

    assert.equal(result, false);
    assert.equal(postMock.mock.callCount(), 0);
});

test('verifyCaptchaToken returns false without calling axios when the token is empty', async (t) => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key';
    const postMock = t.mock.method(axios, 'post', async () => ({ data: { success: true } }));

    const result = await verifyCaptchaToken('');

    assert.equal(result, false);
    assert.equal(postMock.mock.callCount(), 0);
    delete process.env.TURNSTILE_SECRET_KEY;
});
