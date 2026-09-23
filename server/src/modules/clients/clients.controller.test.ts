import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { getClientCountController } from './clients.controller';
import prisma from '../../../prisma/prisma-client';

const response = () => ({
    statusCode: 200, body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
});
function stub(t: test.TestContext, delegate: object, method: string, impl: (...args: any[]) => unknown) {
    const target = delegate as Record<string, unknown>;
    const original = target[method];
    target[method] = impl;
    t.after(() => { target[method] = original; });
}
test('returns the current student count', async (t) => {
    stub(t, prisma.client, 'count', async () => 42);
    const res = response();
    await getClientCountController({} as Request, res as unknown as Response);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { count: 42 });
});
