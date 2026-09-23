import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDraftApprovalNotification } from './telegram-notification.service';

test('draft notification escapes content and uses version-bound action buttons', () => {
    const notification = buildDraftApprovalNotification({
        draftId: 8, version: 4, sender: 'a<b>@example.com', subject: '<script>', body: 'Hello & welcome',
        language: 'en', intent: 'pricing', contactName: null,
        knowledgeSourceUrls: ['https://example.com/faq'], needsManualAnswer: true,
    });
    assert.match(notification.text, /a&lt;b&gt;@example.com/);
    assert.match(notification.text, /&lt;script&gt;/);
    assert.match(notification.text, /Hello &amp; welcome/);
    assert.equal(notification.inlineKeyboard[0][0].callback_data, 'ai:draft:8:4:approve');
    assert.equal(notification.inlineKeyboard[1][1].callback_data, 'ai:draft:8:4:spam');
});
