import assert from 'node:assert/strict';
import test from 'node:test';
import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { requireRole } from './auth.middleware';

const createReq = (role?: UserRole) => ({
    user: role ? { role } : undefined,
} as unknown as Request);

const createRes = () => {
    const response = {
        statusCode: 200,
        body: undefined as unknown,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(body: unknown) {
            this.body = body;
            return this;
        },
    };
    return response as unknown as Response;
};

test('requireRole blocks a request with no authenticated user', () => {
    const req = createReq(undefined);
    const res = createRes();
    let nextCalled = false;

    requireRole(UserRole.ADMIN)(req, res, (() => { nextCalled = true; }) as NextFunction);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 403);
    assert.equal(nextCalled, false);
});

test('requireRole blocks a user whose role is not in the allowed list', () => {
    const req = createReq(UserRole.MANAGER);
    const res = createRes();
    let nextCalled = false;

    requireRole(UserRole.ADMIN)(req, res, (() => { nextCalled = true; }) as NextFunction);

    assert.equal((res as unknown as { statusCode: number }).statusCode, 403);
    assert.equal(nextCalled, false);
});

test('requireRole allows a user whose role is in the allowed list', () => {
    const req = createReq(UserRole.ADMIN);
    const res = createRes();
    let nextCalled = false;

    requireRole(UserRole.ADMIN)(req, res, (() => { nextCalled = true; }) as NextFunction);

    assert.equal(nextCalled, true);
});

test('requireRole allows any role listed among multiple allowed roles', () => {
    const req = createReq(UserRole.MANAGER);
    const res = createRes();
    let nextCalled = false;

    requireRole(UserRole.ADMIN, UserRole.MANAGER)(req, res, (() => { nextCalled = true; }) as NextFunction);

    assert.equal(nextCalled, true);
});
