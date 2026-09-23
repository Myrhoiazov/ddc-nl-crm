import assert from 'node:assert/strict';
import test from 'node:test';
import { handleTelegramAdminBotUpdate, type TelegramAdminBotDeps } from './telegram-admin-bot.service';
import type { AdminBotFlowState } from './telegram-admin-bot.state';
import type { TelegramSentMessage } from '../../common/telegram/telegram-bot-api.client';

const admin = { userId: 5, email: 'admin@ddc.nl', firstName: 'Anna', lastName: 'K' };

const makeDeps = (overrides: Partial<TelegramAdminBotDeps> = {}): TelegramAdminBotDeps & {
    sent: Array<{ chatId: unknown; text: string }>;
    edited: Array<{ chatId: unknown; messageId: number; text: string }>;
    answered: Array<{ callbackQueryId: string; text?: string; showAlert?: boolean }>;
    flows: Map<string, AdminBotFlowState>;
} => {
    const sent: Array<{ chatId: unknown; text: string }> = [];
    const edited: Array<{ chatId: unknown; messageId: number; text: string }> = [];
    const answered: Array<{ callbackQueryId: string; text?: string; showAlert?: boolean }> = [];
    const flows = new Map<string, AdminBotFlowState>();

    return {
        resolveAdmin: async () => admin,
        getFlow: async (id: string) => flows.get(id) ?? null,
        setFlow: async (id: string, state: AdminBotFlowState) => { flows.set(id, state); },
        clearFlow: async (id: string) => { flows.delete(id); },
        send: async (params): Promise<TelegramSentMessage> => { sent.push({ chatId: params.chatId, text: params.text }); return { message_id: 100 + sent.length, chat: { id: 1 } }; },
        edit: async (params): Promise<void> => { edited.push({ chatId: params.chatId, messageId: params.messageId, text: params.text }); },
        answerCallback: async (params): Promise<void> => { answered.push(params); },
        renderDashboard: async (): Promise<string> => 'DASHBOARD_TEXT',
        searchStudents: async (query: string): Promise<string> => `RESULTS_FOR:${query}`,
        createStudent: (async (data: unknown) => ({ id: 42, ...(data as object) })) as unknown as TelegramAdminBotDeps['createStudent'],
        recordAudit: (async (): Promise<undefined> => undefined) as unknown as TelegramAdminBotDeps['recordAudit'],
        sent,
        edited,
        answered,
        flows,
        ...overrides,
    };
};

test('unauthorized user gets no CRM data and a plain rejection on /start', async () => {
    const deps = makeDeps({ resolveAdmin: async () => null });
    await handleTelegramAdminBotUpdate({ message: { text: '/start', from: { id: 999 }, chat: { id: 1 } } }, deps);
    assert.equal(deps.sent.length, 1);
    assert.match(deps.sent[0].text, /нет доступа/i);
});

test('unauthorized callback gets an alert answer, not the requested action', async () => {
    const deps = makeDeps({ resolveAdmin: async () => null });
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb1', data: 'adm:dashboard', from: { id: 999 }, message: { message_id: 5, chat: { id: 1 } } },
    }, deps);
    assert.equal(deps.edited.length, 0);
    assert.equal(deps.answered.length, 1);
    assert.equal(deps.answered[0].showAlert, true);
});

test('/start shows the root menu to an authorized admin', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({ message: { text: '/start', from: { id: 1 }, chat: { id: 1 } } }, deps);
    assert.equal(deps.sent.length, 1);
    assert.match(deps.sent[0].text, /DDC ADMIN/);
});

test('adm:dashboard reuses the dashboard renderer and edits the tapped message', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb1', data: 'adm:dashboard', from: { id: 1 }, message: { message_id: 7, chat: { id: 1 } } },
    }, deps);
    assert.equal(deps.edited.length, 1);
    assert.equal(deps.edited[0].text, 'DASHBOARD_TEXT');
    assert.equal(deps.answered.length, 1);
});

test('student search flow: prompt, then free-text query renders results and clears the flow', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb1', data: 'adm:student:search', from: { id: 1 }, message: { message_id: 7, chat: { id: 1 } } },
    }, deps);
    assert.equal(deps.flows.get('1')?.step, 'QUERY');

    await handleTelegramAdminBotUpdate({ message: { text: 'Anna', from: { id: 1 }, chat: { id: 1 } } }, deps);
    assert.equal(deps.edited[deps.edited.length - 1]?.text, 'RESULTS_FOR:Anna');
    assert.equal(deps.flows.has('1'), false);
});

test('create-student flow walks NAME -> PHONE -> EMAIL -> CONFIRM and creates on confirm', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb1', data: 'adm:student:new', from: { id: 1 }, message: { message_id: 7, chat: { id: 1 } } },
    }, deps);
    assert.equal(deps.flows.get('1')?.step, 'NAME');

    await handleTelegramAdminBotUpdate({ message: { text: 'Anna Petrova', from: { id: 1 }, chat: { id: 1 } } }, deps);
    assert.equal(deps.flows.get('1')?.step, 'PHONE');

    await handleTelegramAdminBotUpdate({ message: { text: '-', from: { id: 1 }, chat: { id: 1 } } }, deps);
    assert.equal(deps.flows.get('1')?.step, 'EMAIL');

    await handleTelegramAdminBotUpdate({ message: { text: 'anna@example.com', from: { id: 1 }, chat: { id: 1 } } }, deps);
    assert.equal(deps.flows.get('1')?.step, 'CONFIRM');
    assert.match(deps.edited[deps.edited.length - 1]?.text ?? '', /Anna Petrova/);

    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb2', data: 'adm:student:confirm', from: { id: 1 }, message: { message_id: 7, chat: { id: 1 } } },
    }, deps);
    assert.match(deps.edited[deps.edited.length - 1]?.text ?? '', /Ученик создан/);
    assert.equal(deps.flows.has('1'), false);
});

test('create-student flow rejects empty name and stays on the NAME step', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb1', data: 'adm:student:new', from: { id: 1 }, message: { message_id: 7, chat: { id: 1 } } },
    }, deps);
    await handleTelegramAdminBotUpdate({ message: { text: '   ', from: { id: 1 }, chat: { id: 1 } } }, deps);
    assert.equal(deps.flows.get('1')?.step, 'NAME');
    assert.match(deps.edited[deps.edited.length - 1]?.text ?? '', /Имя не может быть пустым/);
});

test('adm:cancel clears the flow and returns to the root menu', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb1', data: 'adm:student:new', from: { id: 1 }, message: { message_id: 7, chat: { id: 1 } } },
    }, deps);
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb2', data: 'adm:cancel', from: { id: 1 }, message: { message_id: 7, chat: { id: 1 } } },
    }, deps);
    assert.equal(deps.flows.has('1'), false);
    assert.match(deps.edited[deps.edited.length - 1]?.text ?? '', /DDC ADMIN/);
});

test('flow-state isolation: two different admins get independent flows', async () => {
    const deps = makeDeps();
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb1', data: 'adm:student:new', from: { id: 1 }, message: { message_id: 7, chat: { id: 1 } } },
    }, deps);
    await handleTelegramAdminBotUpdate({
        callback_query: { id: 'cb2', data: 'adm:student:search', from: { id: 2 }, message: { message_id: 8, chat: { id: 1 } } },
    }, deps);
    assert.equal(deps.flows.get('1')?.flow, 'student-create');
    assert.equal(deps.flows.get('2')?.flow, 'student-search');
});
