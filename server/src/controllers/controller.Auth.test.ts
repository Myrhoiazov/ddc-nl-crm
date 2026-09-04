import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthenticatedUserData, describeLoginFailure, maskEmail } from './controller.Auth';

// Type-compatible with the AuthenticatedUser shape the controller works with.
const user: NonNullable<Parameters<typeof describeLoginFailure>[0]> = {
    id: 7,
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: 'ADMIN',
    email: 'ada@example.com',
    isEnabled: true,
    isActive: true,
    password: 'hash',
    salt: 'salt',
    authVersion: 1,
    lastLogin: new Date('2026-01-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
};

test('maskEmail hides the local part but keeps the domain', () => {
    assert.equal(maskEmail('ada@example.com'), 'a***@example.com');
    assert.equal(maskEmail('x@example.com'), 'x***@example.com');
    assert.equal(maskEmail('no-domain'), 'no-domain');
});

test('describeLoginFailure reports a disabled account distinctly', () => {
    assert.equal(describeLoginFailure(user).reason, 'INVALID_CREDENTIALS');
    assert.equal(describeLoginFailure(null).reason, 'INVALID_CREDENTIALS');
    assert.equal(describeLoginFailure({ ...user, isEnabled: false }).reason, 'ACCOUNT_DISABLED');
    assert.equal(describeLoginFailure(null).targetUserId, undefined);
});

test('buildAuthenticatedUserData exposes exactly the safe user profile', () => {
    const lastLogin = new Date('2026-09-04T10:00:00Z');
    const data = buildAuthenticatedUserData(user, lastLogin);

    assert.deepEqual(data, {
        id: 7,
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: 'ADMIN',
        email: 'ada@example.com',
        isEnabled: true,
        isActive: true,
        lastLogin,
    });
    assert.equal('password' in data, false);
    assert.equal('salt' in data, false);
});