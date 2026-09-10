import assert from 'node:assert/strict';
import test from 'node:test';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { validateUpdateUserRequest } from './controller.Users';

const createReq = (actor?: { id: number; role: UserRole }) => ({
    user: actor,
} as unknown as Request);

test('rejects a request with no userId', () => {
    const error = validateUpdateUserRequest(createReq(), 0, UserRole.ADMIN, undefined);
    assert.equal(error, 'Role or account state is required');
});

test('rejects a request with neither role nor isEnabled', () => {
    const error = validateUpdateUserRequest(createReq(), 5, undefined, undefined);
    assert.equal(error, 'Role or account state is required');
});

test('rejects an invalid role value', () => {
    const error = validateUpdateUserRequest(createReq(), 5, 'NOT_A_ROLE' as UserRole, undefined);
    assert.equal(error, 'Invalid role');
});

test('rejects a non-boolean isEnabled value', () => {
    const error = validateUpdateUserRequest(createReq(), 5, undefined, 'yes' as unknown as boolean);
    assert.equal(error, 'Invalid account state');
});

test('rejects disabling your own account', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 5, undefined, false);
    assert.equal(error, 'Нельзя заблокировать собственный аккаунт');
});

test('allows enabling your own account', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 5, undefined, true);
    assert.equal(error, null);
});

test('rejects changing your own role to a different role', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 5, UserRole.MANAGER, undefined);
    assert.equal(error, 'Нельзя изменить собственную роль');
});

test('allows "changing" your own role to the role you already have', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 5, UserRole.ADMIN, undefined);
    assert.equal(error, null);
});

test('allows changing another user\'s role', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 7, UserRole.MANAGER, undefined);
    assert.equal(error, null);
});

test('allows disabling another user\'s account', () => {
    const req = createReq({ id: 5, role: UserRole.ADMIN });
    const error = validateUpdateUserRequest(req, 7, undefined, false);
    assert.equal(error, null);
});
