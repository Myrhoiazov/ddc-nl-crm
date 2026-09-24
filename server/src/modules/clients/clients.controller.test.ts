import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { createClientsController, getClientCountController } from './clients.controller';
import prisma from '../../../prisma/prisma-client';
import * as clientsService from './clients.service';
import * as auditService from '../auth/auth.security-audit.service';

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

test('records a Mini App student-created event from the server authentication marker', async (t) => {
    const events: unknown[] = [];
    t.mock.method(clientsService, 'createClient', async () => ({ id: 99, firstName: 'Anna' } as never));
    t.mock.method(auditService, 'recordAuthSecurityEvent', async (input: unknown) => { events.push(input); });
    const res = response();
    const req = {
        body: { firstName: 'Anna', groupIds: [] },
        user: { id: 7 },
        authMethod: 'telegram-miniapp',
    } as unknown as Request;

    await createClientsController(req, res as unknown as Response);

    assert.equal(res.statusCode, 200);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], {
        type: 'TELEGRAM_MINIAPP_STUDENT_CREATED',
        actorUserId: 7,
        metadata: { clientId: 99 },
        req,
    });
});

test('does not trust a raw Telegram header as an audit marker', async (t) => {
    const events: unknown[] = [];
    t.mock.method(clientsService, 'createClient', async () => ({ id: 100, firstName: 'Eva' } as never));
    t.mock.method(auditService, 'recordAuthSecurityEvent', async (input: unknown) => { events.push(input); });
    const res = response();
    const req = {
        body: { firstName: 'Eva', groupIds: [] },
        user: { id: 7 },
        header: () => 'unverified',
    } as unknown as Request;

    await createClientsController(req, res as unknown as Response);

    assert.equal(res.statusCode, 200);
    assert.equal(events.length, 0);
});
