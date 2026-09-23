import { isTelegramConfigured, sendTelegramMessage } from '../communication/telegram/telegram.service';
import { buildDraftCallbackData } from './telegram-approval.controller';

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface DraftApprovalNotificationInput {
    draftId: number;
    version: number;
    sender: string;
    subject: string;
    body: string;
    language: string;
    intent: string;
    contactName?: string | null;
    knowledgeSourceUrls: string[];
    needsManualAnswer: boolean;
}

export const buildDraftApprovalNotification = (input: DraftApprovalNotificationInput) => {
    const sources = input.knowledgeSourceUrls.slice(0, 4).map((url) => `• ${escapeHtml(url)}`).join('\n');
    const text = [
        '<b>Новый AI draft требует проверки</b>',
        `<b>Версия:</b> <code>${input.draftId}:${input.version}</code>`,
        `<b>От:</b> ${escapeHtml(input.sender)}`,
        `<b>Тема:</b> ${escapeHtml(input.subject)}`,
        `<b>Язык / intent:</b> ${escapeHtml(input.language)} / ${escapeHtml(input.intent)}`,
        `<b>CRM:</b> ${escapeHtml(input.contactName || 'не найден')}`,
        `<b>Manual review:</b> ${input.needsManualAnswer ? 'да' : 'нет'}`,
        '',
        '<b>Сообщение:</b>',
        escapeHtml(input.body.slice(0, 2_000)),
        sources ? `\n<b>Источники:</b>\n${sources}` : '',
    ].join('\n');
    return {
        text: text.slice(0, 4_000),
        inlineKeyboard: [[
            { text: '✅ Approve', callback_data: buildDraftCallbackData(input.draftId, input.version, 'approve') },
            { text: '✏️ Edit', callback_data: buildDraftCallbackData(input.draftId, input.version, 'edit') },
        ], [
            { text: '❌ Reject', callback_data: buildDraftCallbackData(input.draftId, input.version, 'reject') },
            { text: '🚫 Spam', callback_data: buildDraftCallbackData(input.draftId, input.version, 'spam') },
        ]],
    };
};

export const notifyDraftForApproval = async (input: DraftApprovalNotificationInput) => {
    if (!isTelegramConfigured()) return false;
    const notification = buildDraftApprovalNotification(input);
    await sendTelegramMessage(notification.text, { inlineKeyboard: notification.inlineKeyboard });
    return true;
};
