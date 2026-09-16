import assert from 'node:assert/strict';
import test from 'node:test';
import { runDraftPipeline, type DraftPipelineRepository } from './draft-pipeline.service';

test('draft pipeline classifies context, persists a version, and notifies approval sequentially', async () => {
    const events: string[] = [];
    const repository: DraftPipelineRepository = {
        async findDraftCandidates() { return [{ id: 9, sender: 'a@example.com', subject: 'Question', normalizedBody: 'Can I join?', classification: { spam: false, needsReply: true, language: 'en', intent: 'registration', confidence: 0.9, reason: 'question' } }]; },
        async createNextVersion() { events.push('persist'); return { id: 4, version: 1 }; },
    };
    const result = await runDraftPipeline(repository, {
        async findContactByEmail() { events.push('crm'); return { id: 1, email: 'a@example.com', firstName: 'Ada', lastName: 'Lovelace', status: 'active' }; },
    }, {
        async generateDraft() { events.push('llm'); return { replyLanguage: 'en', subject: 'Re: Question', body: 'Yes.', confidence: 0.8, needsManualAnswer: false, usedKnowledgeIds: ['kb-1'] }; },
    }, { async retrieve() { events.push('rag'); return [{ id: 'kb-1', sourceUrl: 'https://example.com', content: 'Yes', score: 0.9 }]; } }, 1,
    async () => { events.push('notify'); return true; });
    assert.deepEqual(result, { processed: 1, skipped: 0, failed: 0 });
    assert.deepEqual(events, ['rag', 'crm', 'llm', 'persist', 'crm', 'notify']);
});
