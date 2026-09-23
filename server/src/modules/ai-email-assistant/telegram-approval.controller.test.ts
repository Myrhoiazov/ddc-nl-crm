import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import type { Request, Response } from 'express';
import { buildDraftCallbackData, parseDraftCallbackData, parseDraftEditCommand } from './telegram-approval.controller';
import { telegramWebhookController } from '../../common/telegram/telegram-webhook.controller';

const withEnv = (vars: Record<string, string | undefined>, fn: () => Promise<void>) => {
    const previous: Record<string, string | undefined> = {};
    for (const key of Object.keys(vars)) previous[key] = process.env[key];
    for (const key of Object.keys(vars)) {
        if (vars[key] === undefined) delete process.env[key];
        else process.env[key] = vars[key];
    }
    return fn().finally(() => {
        for (const key of Object.keys(previous)) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
    });
};

const fakeResponse = () => {
    const calls: { status?: number; body?: unknown } = {};
    const res = {
        status(code: number) { calls.status = code; return res; },
        json(body: unknown) { calls.body = body; return res; },
    } as unknown as Response;
    return { res, calls };
};

const editCallbackRequest = (fromId: number) => ({
    header: (name: string) => (name === 'x-telegram-bot-api-secret-token' ? 'webhook-secret' : undefined),
    body: { callback_query: { data: 'ai:draft:12:3:edit', from: { id: fromId } } },
} as unknown as Request);

test('Telegram callback data carries the immutable draft version', () => {
    const value = buildDraftCallbackData(12, 3, 'approve');
    assert.equal(value, 'ai:draft:12:3:approve');
    assert.deepEqual(parseDraftCallbackData(value), { draftId: 12, draftVersion: 3, action: 'approve' });
});

test('Telegram callback parser rejects malformed or unsupported payloads', () => {
    assert.equal(parseDraftCallbackData('ai:draft:12:3:send'), null);
    assert.equal(parseDraftCallbackData('ai:draft:12:0:approve'), null);
    assert.equal(parseDraftCallbackData(42), null);
});

test('Telegram edit command preserves spaces and binds the draft version', () => {
    assert.deepEqual(parseDraftEditCommand('/edit 12 3 Please call us after 18:00'), {
        draftId: 12, draftVersion: 3, action: 'edit', editedBody: 'Please call us after 18:00',
    });
    assert.equal(parseDraftEditCommand('/edit 12 3'), null);
});

test('tapping Edit sends a real Telegram message with the exact command to type next', async (t) => {
    // Regression: responding to the webhook with a plain JSON body is not the same as sending a
    // chat message — Telegram never renders it, so the operator sees nothing after tapping Edit
    // unless the bot actively calls sendMessage (found live in this session).
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    const { res, calls } = fakeResponse();

    await withEnv({
        TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
        TELEGRAM_APPROVER_IDS: '111',
        TELEGRAM_TOKEN: 'bot-token',
        TELEGRAM_CHAT_ID: 'chat-id',
    }, () => telegramWebhookController(editCallbackRequest(111), res));

    assert.equal(postMock.mock.callCount(), 1);
    const [, body] = postMock.mock.calls[0].arguments;
    assert.match((body as { text: string }).text, /\/edit 12 3 ваш новый текст/);
    assert.deepEqual(calls.body, { ok: true, requiresEdit: true });
});

test('tapping Edit as an unauthorized actor is rejected without sending a Telegram message', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    const { res, calls } = fakeResponse();

    await withEnv({
        TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
        TELEGRAM_APPROVER_IDS: '111',
        TELEGRAM_TOKEN: 'bot-token',
        TELEGRAM_CHAT_ID: 'chat-id',
    }, () => telegramWebhookController(editCallbackRequest(999), res));

    assert.equal(postMock.mock.callCount(), 0);
    assert.equal(calls.status, 403);
});
