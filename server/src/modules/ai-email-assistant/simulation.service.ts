// Shared core of scripts/test-email-flow.ts (CLI) and the "Симуляция письма" panel on
// KnowledgeBasePage (HTTP): runs the real pipeline — normalize → deterministic spam check →
// LLM classify → RAG retrieve → draft — against a hand-written subject/body, without IMAP,
// without touching ai_email_messages/ai_email_drafts, and without notifying Telegram. Read-only
// against the real CRM (contact lookup) and the real knowledge base (retrieval).
import { deterministicSpamReason, normalizeEmail, type EmailClassification, type NormalizedEmailInput } from './email-assistant.service';
import { OllamaLlmClient } from './ollama.client';
import { createPrismaCrmReader } from './crm-context.service';
import { buildDraftContext, emailDraftSchema, generateEmailDraft, type CrmContactProjection, type DraftKnowledgeContext, type EmailDraft } from './draft.service';
import {
    KnowledgeRetrievalService, MysqlKnowledgeRepository, OllamaEmbeddingClient,
    OllamaQueryExpansionClient, OllamaReranker, type QueryExpansion,
} from '../knowledge-ingestion';
import { aiConfig } from '../../config/ai.config';
import { createDraftProviderFactory } from './draft-provider.factory';

export interface EmailSimulationInput {
    from?: string;
    subject: string;
    body: string;
    topK?: number;
    noKnowledge?: boolean;
    forceDraft?: boolean;
    // Test a specific saved prompt (active or not) for this run only — lets an admin try a
    // candidate prompt without activating it, so real production emails are unaffected until
    // they explicitly activate it via /ai-email/prompts/:id/activate.
    classificationPromptId?: number;
    draftBodyPromptId?: number;
    // Both default ON for the simulation panel regardless of aiConfig.ragQueryExpansionEnabled/
    // ragRerankEnabled — an admin evaluates the real effect here before opting real production
    // emails in via .env. Opt back OUT per-run for an apples-to-apples comparison.
    noQueryExpansion?: boolean;
    noRerank?: boolean;
}

export interface EmailSimulationResult {
    normalized: NormalizedEmailInput;
    deterministicSpamReason: string | null;
    classification: EmailClassification | null;
    knowledge: DraftKnowledgeContext[];
    queryExpansion: QueryExpansion | null;
    crmContact: CrmContactProjection | null;
    draft: EmailDraft | null;
    draftSkippedReason: string | null;
}

const DEFAULT_FROM = 'test@example.com';

export const runEmailAssistantSimulation = async (input: EmailSimulationInput): Promise<EmailSimulationResult> => {
    const from = input.from?.trim() || DEFAULT_FROM;
    const raw = { fromAddress: from, subject: input.subject, text: input.body };
    const normalized = normalizeEmail(raw);
    const spamReason = deterministicSpamReason(raw, normalized);

    const classificationClient = new OllamaLlmClient({
        promptOverrides: { classificationPromptId: input.classificationPromptId, draftBodyPromptId: input.draftBodyPromptId },
    });
    const classification = spamReason ? null : await classificationClient.classifyEmail(normalized);

    let knowledge: DraftKnowledgeContext[] = [];
    let queryExpansion: QueryExpansion | null = null;
    if (!input.noKnowledge) {
        const embeddings = new OllamaEmbeddingClient();
        const retrieval = new KnowledgeRetrievalService(embeddings, new MysqlKnowledgeRepository(), {
            queryExpansion: input.noQueryExpansion ? undefined : new OllamaQueryExpansionClient(),
            reranker: input.noRerank ? undefined : new OllamaReranker(embeddings),
        });
        const retrieved = await retrieval.retrieveWithDetails(`${normalized.subject}\n${normalized.normalizedBody}`, { topK: input.topK ?? aiConfig.ragTopK });
        knowledge = retrieved.chunks;
        queryExpansion = retrieved.queryExpansion;
    }

    if (!classification) {
        return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact: null, draft: null, draftSkippedReason: 'deterministic_spam' };
    }

    const shouldDraft = input.forceDraft || (!classification.spam && classification.needsReply);
    if (!shouldDraft) {
        const reason = `classification_gate (spam=${classification.spam}, needsReply=${classification.needsReply})`;
        return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact: null, draft: null, draftSkippedReason: reason };
    }

    const crmReader = createPrismaCrmReader();
    const draftClient = await createDraftProviderFactory().getSelectedProvider();
    const crmContact = await crmReader.findContactByEmail(from);
    // generateEmailDraft itself refuses to draft spam/no-reply-needed emails; forceDraft bypasses
    // that gate by calling the LLM client directly through the same context shape (mirrors the CLI).
    const draft = input.forceDraft && (classification.spam || !classification.needsReply)
        ? emailDraftSchema.parse(await draftClient.generateDraft(await buildDraftContext(normalized, classification, crmReader, knowledge)))
        : await generateEmailDraft(normalized, classification, crmReader, draftClient, knowledge);

    return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact, draft, draftSkippedReason: null };
};
