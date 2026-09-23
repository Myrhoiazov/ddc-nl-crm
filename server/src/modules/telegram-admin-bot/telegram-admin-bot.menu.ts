import type { TelegramInlineKeyboard } from '../../common/telegram/telegram-bot-api.client';

export const ROOT_MENU_TEXT = '<b>DDC ADMIN</b>';

// Buttons are added here as their flows land (Phase 2: dashboard/search; Phase 3: student
// creation; Phase 4: Mollie submenu) — a button for a flow that does not exist yet would be a
// dead end for a real administrator, so the spec's full suggested menu only appears once every
// flow behind it is real.
export const buildRootMenuKeyboard = (): TelegramInlineKeyboard => [
    [{ text: '📊 Dashboard', callback_data: 'adm:dashboard' }],
    [{ text: '👤 Новый ученик', callback_data: 'adm:student:new' }],
    [{ text: '🔎 Найти ученика', callback_data: 'adm:student:search' }],
];

export const buildBackToMenuKeyboard = (): TelegramInlineKeyboard => [
    [{ text: '⬅️ Меню', callback_data: 'adm:menu:root' }],
];

export const buildCancelKeyboard = (): TelegramInlineKeyboard => [
    [{ text: '❌ Отмена', callback_data: 'adm:cancel' }],
];
