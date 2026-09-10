import assert from 'node:assert/strict';
import test from 'node:test';
import { captchaSiteKey, isCaptchaConfigured } from './service.Captcha';

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
