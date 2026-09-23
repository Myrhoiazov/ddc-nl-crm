import { Client } from '@prisma/client';
import {
    answerTelegramCallbackQuery, editTelegramBotMessageText, sendTelegramBotMessage,
    type TelegramInlineKeyboard,
} from '../../common/telegram/telegram-bot-api.client';
import { createClientSchema } from '../clients/clients.controller';
import { createClient } from '../clients/clients.service';
import { recordAuthSecurityEvent } from '../auth/auth.security-audit.service';
import { resolveTelegramAdmin, type ResolvedTelegramAdmin } from './telegram-admin-bot.auth';
import {
    clearFlowState, getFlowState, setFlowState, type AdminBotFlowState,
} from './telegram-admin-bot.state';
import {
    buildBackToMenuKeyboard, buildCancelKeyboard, buildRootMenuKeyboard, ROOT_MENU_TEXT,
} from './telegram-admin-bot.menu';
import { renderDashboardText } from './telegram-admin-bot.dashboard.flow';
import { renderStudentSearchResults } from './telegram-admin-bot.student-search.flow';
import {
    buildCreateStudentConfirmText, parseNameInput, parseSkippableInput, type CreateStudentData,
} from './telegram-admin-bot.student-create.flow';

export interface TelegramAdminBotUpdate {
    message?: {
        text?: unknown;
        from?: { id?: unknown };
        chat?: { id?: unknown };
    };
    callback_query?: {
        id?: unknown;
        data?: unknown;
        from?: { id?: unknown };
        message?: { message_id?: unknown; chat?: { id?: unknown } };
    };
}

export interface TelegramAdminBotDeps {
    resolveAdmin: (telegramUserId: string) => Promise<ResolvedTelegramAdmin | null>;
    getFlow: (telegramUserId: string) => Promise<AdminBotFlowState | null>;
    setFlow: (telegramUserId: string, state: AdminBotFlowState) => Promise<void>;
    clearFlow: (telegramUserId: string) => Promise<void>;
    send: typeof sendTelegramBotMessage;
    edit: typeof editTelegramBotMessageText;
    answerCallback: typeof answerTelegramCallbackQuery;
    renderDashboard: () => Promise<string>;
    searchStudents: (query: string) => Promise<string>;
    createStudent: typeof createClient;
    recordAudit: typeof recordAuthSecurityEvent;
}

const defaultDeps: TelegramAdminBotDeps = {
    resolveAdmin: resolveTelegramAdmin,
    getFlow: getFlowState,
    setFlow: setFlowState,
    clearFlow: clearFlowState,
    send: sendTelegramBotMessage,
    edit: editTelegramBotMessageText,
    answerCallback: answerTelegramCallbackQuery,
    renderDashboard: renderDashboardText,
    searchStudents: renderStudentSearchResults,
    createStudent: createClient,
    recordAudit: recordAuthSecurityEvent,
};

interface Render { text: string; keyboard?: TelegramInlineKeyboard }

const renderRootMenu = (): Render => ({ text: ROOT_MENU_TEXT, keyboard: buildRootMenuKeyboard() });

// Edits the bot's own flow message in place when one already exists (the compact, guided-flow
// UX the spec asks for) instead of sending a new message per step; falls back to a fresh send
// the first time (e.g. a plain /start with no prior message to edit).
const showStep = async (
    deps: TelegramAdminBotDeps,
    chatId: string | number,
    messageId: number | undefined,
    render: Render,
): Promise<number> => {
    if (messageId !== undefined) {
        await deps.edit({ chatId, messageId, text: render.text, inlineKeyboard: render.keyboard });
        return messageId;
    }
    const sent = await deps.send({ chatId, text: render.text, inlineKeyboard: render.keyboard });
    return sent.message_id;
};

const resolveChatId = (update: TelegramAdminBotUpdate): string | number => (
    update.callback_query?.message?.chat?.id as string | number | undefined
    ?? update.message?.chat?.id as string | number | undefined
    ?? process.env.TELEGRAM_CHAT_ID
    ?? ''
);

const runCreateStudent = async (
    deps: TelegramAdminBotDeps,
    admin: ResolvedTelegramAdmin,
    data: CreateStudentData,
): Promise<Render> => {
    const parsed = createClientSchema.safeParse(data);
    if (!parsed.success) {
        return { text: `⚠️ Проверьте данные: ${parsed.error.issues[0]?.message ?? 'некорректные данные'}`, keyboard: buildBackToMenuKeyboard() };
    }
    const client = await deps.createStudent(parsed.data as unknown as Client);
    await deps.recordAudit({
        type: 'TELEGRAM_ADMIN_STUDENT_CREATED',
        actorUserId: admin.userId,
        metadata: { clientId: client.id, source: 'TELEGRAM' },
    });
    const name = [client.firstName, client.lastName].filter(Boolean).join(' ');
    return { text: `✅ Ученик создан: <b>${name}</b> (id ${client.id})`, keyboard: buildBackToMenuKeyboard() };
};

// The transport-agnostic core, mirroring ai-email-assistant/telegram-approval.controller.ts's
// handleTelegramApprovalUpdate: kept free of Express types so both the webhook controller and
// the polling service (server/src/common/telegram/telegram-update-dispatcher.ts) share one path.
export const handleTelegramAdminBotUpdate = async (
    update: TelegramAdminBotUpdate,
    deps: TelegramAdminBotDeps = defaultDeps,
): Promise<{ status: number; body: unknown }> => {
    const fromIdValue = update.callback_query?.from?.id ?? update.message?.from?.id;
    if (fromIdValue === undefined) return { status: 200, body: { ok: true } };
    const telegramUserId = String(fromIdValue);
    const chatId = resolveChatId(update);

    const admin = await deps.resolveAdmin(telegramUserId);
    if (!admin) {
        // Unauthorized: no CRM/customer data of any kind goes out, not even an error detail
        // beyond "no access" (spec §5.2).
        const callbackId = update.callback_query?.id;
        if (typeof callbackId === 'string') {
            await deps.answerCallback({ callbackQueryId: callbackId, text: '⛔ Недостаточно прав', showAlert: true });
        } else if (chatId) {
            await deps.send({ chatId, text: '⛔ У вас нет доступа к этому боту.' });
        }
        return { status: 200, body: { ok: true } };
    }

    const callback = update.callback_query;
    if (callback) {
        const callbackId = typeof callback.id === 'string' ? callback.id : '';
        const data = typeof callback.data === 'string' ? callback.data : '';
        const messageId = typeof callback.message?.message_id === 'number' ? callback.message.message_id : undefined;

        if (data === 'adm:menu:root' || data === 'adm:cancel') {
            await deps.clearFlow(telegramUserId);
            await showStep(deps, chatId, messageId, renderRootMenu());
        } else if (data === 'adm:dashboard') {
            await deps.clearFlow(telegramUserId);
            const text = await deps.renderDashboard();
            await showStep(deps, chatId, messageId, { text, keyboard: buildBackToMenuKeyboard() });
        } else if (data === 'adm:student:search') {
            const id = await showStep(deps, chatId, messageId, {
                text: 'Введите имя, email или телефон ученика для поиска:',
                keyboard: buildCancelKeyboard(),
            });
            await deps.setFlow(telegramUserId, { flow: 'student-search', step: 'QUERY', data: {}, chatId, messageId: id });
        } else if (data === 'adm:student:new') {
            const id = await showStep(deps, chatId, messageId, {
                text: 'Введите имя и фамилию ученика (например: Anna Petrova):',
                keyboard: buildCancelKeyboard(),
            });
            await deps.setFlow(telegramUserId, { flow: 'student-create', step: 'NAME', data: {}, chatId, messageId: id });
        } else if (data === 'adm:student:confirm') {
            const flow = await deps.getFlow(telegramUserId);
            if (flow?.flow === 'student-create' && flow.step === 'CONFIRM') {
                const render = await runCreateStudent(deps, admin, flow.data as CreateStudentData);
                await deps.clearFlow(telegramUserId);
                await showStep(deps, chatId, flow.messageId, render);
            }
        }

        if (callbackId) await deps.answerCallback({ callbackQueryId: callbackId });
        return { status: 200, body: { ok: true } };
    }

    const text = typeof update.message?.text === 'string' ? update.message.text : '';
    const trimmedText = text.trim();

    if (/^\/start(\s|$)/.test(trimmedText)) {
        await deps.clearFlow(telegramUserId);
        const render = renderRootMenu();
        await deps.send({ chatId, text: render.text, inlineKeyboard: render.keyboard });
        return { status: 200, body: { ok: true } };
    }

    const flow = await deps.getFlow(telegramUserId);
    if (!flow) return { status: 200, body: { ok: true } };

    if (flow.flow === 'student-search' && flow.step === 'QUERY') {
        const resultText = await deps.searchStudents(trimmedText);
        await deps.clearFlow(telegramUserId);
        await showStep(deps, flow.chatId, flow.messageId, { text: resultText, keyboard: buildBackToMenuKeyboard() });
        return { status: 200, body: { ok: true } };
    }

    if (flow.flow === 'student-create') {
        const data = flow.data as CreateStudentData;
        if (flow.step === 'NAME') {
            const parsed = parseNameInput(trimmedText);
            if ('error' in parsed) {
                await showStep(deps, flow.chatId, flow.messageId, { text: `⚠️ ${parsed.error}`, keyboard: buildCancelKeyboard() });
                return { status: 200, body: { ok: true } };
            }
            const nextData: CreateStudentData = { ...data, firstName: parsed.firstName, lastName: parsed.lastName };
            await deps.setFlow(telegramUserId, { ...flow, step: 'PHONE', data: nextData });
            await showStep(deps, flow.chatId, flow.messageId, { text: 'Телефон ученика (или "-" чтобы пропустить):', keyboard: buildCancelKeyboard() });
        } else if (flow.step === 'PHONE') {
            const nextData: CreateStudentData = { ...data, phoneNumber: parseSkippableInput(trimmedText) };
            await deps.setFlow(telegramUserId, { ...flow, step: 'EMAIL', data: nextData });
            await showStep(deps, flow.chatId, flow.messageId, { text: 'Email ученика (или "-" чтобы пропустить):', keyboard: buildCancelKeyboard() });
        } else if (flow.step === 'EMAIL') {
            const nextData: CreateStudentData = { ...data, email: parseSkippableInput(trimmedText) };
            await deps.setFlow(telegramUserId, { ...flow, step: 'CONFIRM', data: nextData });
            await showStep(deps, flow.chatId, flow.messageId, {
                text: buildCreateStudentConfirmText(nextData),
                keyboard: [[{ text: '✅ Подтвердить', callback_data: 'adm:student:confirm' }], [{ text: '❌ Отмена', callback_data: 'adm:cancel' }]],
            });
        }
        return { status: 200, body: { ok: true } };
    }

    return { status: 200, body: { ok: true } };
};
