import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { fromPartial } from '@total-typescript/shoehorn';
import { MollieApiError } from '@mollie/api-client';
import prisma from '../../../prisma/prisma-client';
import * as mollieService from './payments.mollie.service';
import { webhookMollieController } from './payments.controller';

function stub(t: test.TestContext, delegate: object, method: string, impl: (...args: any[]) => unknown) {
    const target = delegate as Record<string, unknown>;
    const original = target[method];
    target[method] = impl;
    t.after(() => { target[method] = original; });
}

const response = () => {
    const res: Response = fromPartial({
        statusCode: 0,
        status(code: number) { this.statusCode = code; return this; },
        send() { return this; },
    });
    return res;
};

const webhookRequest = (id: string): Request => fromPartial({ body: { id }, query: {} });

const silenceLogs = (t: test.TestContext) => {
    stub(t, console, 'log', () => undefined);
    stub(t, console, 'warn', () => undefined);
    stub(t, console, 'error', () => undefined);
};

// Mollie recommends 200 for ids unknown to it, so probing the endpoint leaks nothing and a
// stale/foreign id is not retried 10 times over 26 hours.
test('webhook answers 200 without logging an event when Mollie does not know the payment id', async (t) => {
    silenceLogs(t);
    stub(t, mollieService, 'getPaymentById', async () => {
        throw new MollieApiError('The payment could not be found', { statusCode: 404 });
    });
    let eventCreated = false;
    stub(t, prisma.mollieEvent, 'create', async () => { eventCreated = true; });

    const res = response();
    await webhookMollieController(webhookRequest('tr_unknown'), res);

    assert.equal(res.statusCode, 200);
    assert.equal(eventCreated, false);
});

test('webhook still answers 500 on a transient Mollie failure so Mollie retries', async (t) => {
    silenceLogs(t);
    stub(t, mollieService, 'getPaymentById', async () => {
        throw new MollieApiError('Service unavailable', { statusCode: 503 });
    });

    const res = response();
    await webhookMollieController(webhookRequest('tr_retry'), res);

    assert.equal(res.statusCode, 500);
});
