// Shared core of scripts/test-email-flow.ts (CLI) and the "Симуляция письма" panel on
// KnowledgeBasePage (HTTP): runs the real pipeline — normalize → deterministic spam check →
// LLM classify → RAG retrieve → draft — against a hand-written subject/body, without IMAP,
// without touching ai_email_messages/ai_email_drafts, and without notifying Telegram. Read-only
// against the real CRM (contact lookup) and the real knowledge base (retrieval).
//
// Every run is persisted to ai_simulation_runs/ai_simulation_run_metrics (a separate, simulation-
// only history table — see docs/superpowers/specs/2026-09-25-simulation-metrics-design.md) so an
// admin can compare prompts/providers over time. Persistence failure is caught and logged, never
// thrown — a DB hiccup must never break the admin's simulation preview.
import { AiDraftProvider, AiSimulationStage } from '@prisma/client';
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
import type { DraftProviderName } from './draft-provider';
import { PrismaAiPromptRepository } from './prompt-library.service';
import {
    buildSimulationRunMetricRow, createPrismaSimulationRunRepository,
    type SimulationRunInput, type SimulationRunMetricInput, type SimulationRunRepository,
} from './simulation-metrics.repository';

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
    runId: number | null;
    metrics: SimulationRunMetricInput[];
}

const DEFAULT_FROM = 'test@example.com';

// Pure — shapes the DB-write payload from the simulation's input/outcome. Kept separate from
// runEmailAssistantSimulation so it is unit-testable without Prisma/Ollama/network.
export const buildSimulationRunInput = (
    input: EmailSimulationInput,
    context: {
        deterministicSpamReason: string | null;
        classification: EmailClassification | null;
        draftSkippedReason: string | null;
        classificationPromptName: string | null;
        draftBodyPromptName: string | null;
        draftProvider: DraftProviderName | null;
        draftModel: string | null;
        classificationJson?: unknown;
        knowledgeJson?: unknown;
        draftJson?: unknown;
        metrics: SimulationRunMetricInput[];
        createdById?: number;
    },
): SimulationRunInput => ({
    fromAddress: input.from?.trim() || undefined,
    subject: input.subject,
    body: input.body,
    topK: input.topK,
    noKnowledge: input.noKnowledge ?? false,
    forceDraft: input.forceDraft ?? false,
    noQueryExpansion: input.noQueryExpansion ?? false,
    noRerank: input.noRerank ?? false,
    classificationPromptId: input.classificationPromptId,
    classificationPromptName: context.classificationPromptName ?? undefined,
    draftBodyPromptId: input.draftBodyPromptId,
    draftBodyPromptName: context.draftBodyPromptName ?? undefined,
    draftProvider: (context.draftProvider as AiDraftProvider | null) ?? undefined,
    draftModel: context.draftModel ?? undefined,
    classificationSpam: context.classification?.spam,
    classificationNeedsReply: context.classification?.needsReply,
    classificationConfidence: context.classification?.confidence,
    classificationJson: context.classificationJson,
    knowledgeJson: context.knowledgeJson,
    draftJson: context.draftJson,
    deterministicSpamReason: context.deterministicSpamReason ?? undefined,
    draftSkippedReason: context.draftSkippedReason ?? undefined,
    createdById: context.createdById,
    metrics: context.metrics,
});

export const runEmailAssistantSimulation = async (
    input: EmailSimulationInput,
    deps: { runRepository?: SimulationRunRepository; createdById?: number } = {},
): Promise<EmailSimulationResult> => {
    const runRepository = deps.runRepository ?? createPrismaSimulationRunRepository();
    const metrics: SimulationRunMetricInput[] = [];

    const from = input.from?.trim() || DEFAULT_FROM;
    const raw = { fromAddress: from, subject: input.subject, text: input.body };
    const normalized = normalizeEmail(raw);
    const spamReason = deterministicSpamReason(raw, normalized);

    const promptRepository = new PrismaAiPromptRepository();
    const classificationPromptName = input.classificationPromptId ? await promptRepository.getNameById(input.classificationPromptId) : null;
    const draftBodyPromptName = input.draftBodyPromptId ? await promptRepository.getNameById(input.draftBodyPromptId) : null;

    const classificationModel = aiConfig.ollamaModel;
    const classificationClient = new OllamaLlmClient({
        promptOverrides: { classificationPromptId: input.classificationPromptId, draftBodyPromptId: input.draftBodyPromptId },
        onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.CLASSIFICATION, AiDraftProvider.OLLAMA, classificationModel, metric)),
    });
    const classification = spamReason ? null : await classificationClient.classifyEmail(normalized);

    let knowledge: DraftKnowledgeContext[] = [];
    let queryExpansion: QueryExpansion | null = null;
    if (!input.noKnowledge) {
        const embeddings = new OllamaEmbeddingClient();
        const retrieval = new KnowledgeRetrievalService(embeddings, new MysqlKnowledgeRepository(), {
            queryExpansion: input.noQueryExpansion ? undefined : new OllamaQueryExpansionClient({
                onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.QUERY_EXPANSION, AiDraftProvider.OLLAMA, aiConfig.ollamaModel, metric)),
            }),
            reranker: input.noRerank ? undefined : new OllamaReranker(embeddings, {
                onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.RERANK, AiDraftProvider.OLLAMA, metric.model, metric)),
            }),
            onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.RETRIEVAL_EMBEDDING, AiDraftProvider.OLLAMA, aiConfig.ollamaEmbeddingModel, metric)),
        });
        const retrieved = await retrieval.retrieveWithDetails(`${normalized.subject}\n${normalized.normalizedBody}`, { topK: input.topK ?? aiConfig.ragTopK });
        knowledge = retrieved.chunks;
        queryExpansion = retrieved.queryExpansion;
    }

    // Never throws out of runEmailAssistantSimulation — a DB hiccup must never turn a working
    // simulation preview into a 500 for the admin. Logged, not surfaced.
    const persistRun = async (extra: {
        draftSkippedReason: string | null;
        draftProvider?: DraftProviderName; draftModel?: string;
        draftJson?: unknown;
    }): Promise<number | null> => {
        try {
            const record = buildSimulationRunInput(input, {
                deterministicSpamReason: spamReason,
                classification,
                draftSkippedReason: extra.draftSkippedReason,
                classificationPromptName,
                draftBodyPromptName,
                draftProvider: extra.draftProvider ?? null,
                draftModel: extra.draftModel ?? null,
                classificationJson: classification,
                knowledgeJson: knowledge,
                draftJson: extra.draftJson,
                metrics,
                createdById: deps.createdById,
            });
            return await runRepository.create(record);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to persist simulation run history', error);
            return null;
        }
    };

    if (!classification) {
        const runId = await persistRun({ draftSkippedReason: 'deterministic_spam' });
        return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact: null, draft: null, draftSkippedReason: 'deterministic_spam', runId, metrics };
    }

    const shouldDraft = input.forceDraft || (!classification.spam && classification.needsReply);
    if (!shouldDraft) {
        const reason = `classification_gate (spam=${classification.spam}, needsReply=${classification.needsReply})`;
        const runId = await persistRun({ draftSkippedReason: reason });
        return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact: null, draft: null, draftSkippedReason: reason, runId, metrics };
    }

    const crmReader = createPrismaCrmReader();
    // Safe despite referencing `draftClient` inside its own construction call: onMetric is only
    // invoked later, when generateDraft() runs — by then `draftClient` already holds the resolved
    // provider (same pattern as `const timer = setInterval(() => clearInterval(timer), ms)`).
    const draftClient = await createDraftProviderFactory().getSelectedProvider((metric) =>
        metrics.push(buildSimulationRunMetricRow(AiSimulationStage.DRAFT, draftClient.provider as AiDraftProvider, draftClient.model, metric)));
    const crmContact = await crmReader.findContactByEmail(from);
    const draft = input.forceDraft && (classification.spam || !classification.needsReply)
        ? emailDraftSchema.parse(await draftClient.generateDraft(await buildDraftContext(normalized, classification, crmReader, knowledge)))
        : await generateEmailDraft(normalized, classification, crmReader, draftClient, knowledge);

    const runId = await persistRun({
        draftSkippedReason: null,
        draftProvider: draftClient.provider as DraftProviderName, draftModel: draftClient.model,
        draftJson: draft,
    });

    return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact, draft, draftSkippedReason: null, runId, metrics };
};
