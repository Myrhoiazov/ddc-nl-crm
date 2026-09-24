import type { TelegramInlineKeyboard } from '../../common/telegram/telegram-bot-api.client';

export const ROOT_MENU_TEXT = '<b>DDC ADMIN</b>';

// Single source of truth for the root menu's buttons. Each `id` must match a key in the
// `screens` map in client/telegram-mini-app/src/main.ts — that file is a separate, standalone
// esbuild bundle (spec §4.2), so the two can't share a TS import; this list is the server half
// of that contract. Adding a new Mini App screen later is: one entry here + one screen module
// on the client side, per the pattern already used for dashboard/search/new-student.
export const MINI_APP_SCREENS: ReadonlyArray<{ id: string; label: string; emoji: string }> = [
    { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
    { id: 'new-student', label: 'Новый ученик', emoji: '👤' },
    { id: 'search', label: 'Найти ученика', emoji: '🔎' },
];

// Every button opens the Mini App directly on its screen (`?screen=<id>`) instead of driving a
// bot-side conversational flow — the Mini App is the one real UI now (spec: Telegram Mini App
// plan, Task 11).
export const buildRootMenuKeyboard = (miniAppUrl: string): TelegramInlineKeyboard => (
    MINI_APP_SCREENS.map(({ id, label, emoji }) => [
        { text: `${emoji} ${label}`, web_app: { url: `${miniAppUrl}?screen=${id}` } },
    ])
);
