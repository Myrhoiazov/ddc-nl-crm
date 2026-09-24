import { aiConfig } from '../../config/ai.config';
import { logger } from '../../common/logger';
import { generateEmailDraft, type CrmReader, type DraftKnowledgeContext, type DraftLlmClient } from './draft.service';
import { createPrismaAiEmailDraftRepository, persistDraft, type AiEmailDraftRepository, type DraftKnowledgeRefInput } from './draft.persistence';
import prisma from '../../../prisma/prisma-client';
import { notifyDraftForApproval } from './telegram-notification.service';
import type { EmailClassification } from './email-assistant.service';
import { DraftProviderError, type DraftProvider } from './draft-provider';

export interface DraftCandidate {
    id: number;
    sender: string;
    subject: string;
    normalizedBody: string;
    classification: EmailClassification;
}

export interface DraftPipelineRepository extends AiEmailDraftRepository {
    findDraftCandidates(limit: number): Promise<DraftCandidate[]>;
}

export interface DraftKnowledgeProvider {
    retrieve(query: string): Promise<DraftKnowledgeContext[]>;
}

export interface DraftPipelineRunResult {
    processed: number;
    skipped: number;
    failed: number;
}

export interface RunDraftPipelineOptions {
    knowledgeProvider?: DraftKnowledgeProvider;
    limit?: number;
    notify?: (input: Parameters<typeof notifyDraftForApproval>[0]) => Promise<boolean>;
}

export const runDraftPipeline = async (
    repository: DraftPipelineRepository,
    crmReader: CrmReader,
    draftClient: DraftLlmClient,
    options: RunDraftPipelineOptions = {},
): Promise<DraftPipelineRunResult> => {
    const { knowledgeProvider, limit = aiConfig.maxConcurrency, notify = notifyDraftForApproval } = options;
    const result: DraftPipelineRunResult = { processed: 0, skipped: 0, failed: 0 };
    const candidates = await repository.findDraftCandidates(Math.max(1, limit));
    for (const candidate of candidates) {
        try {
            if (candidate.classification.spam || !candidate.classification.needsReply) {
                result.skipped += 1;
                continue;
            }
            const knowledge = knowledgeProvider ? await knowledgeProvider.retrieve(`${candidate.subject}\n${candidate.normalizedBody}`) : [];
            const email = { fromAddress: candidate.sender, subject: candidate.subject, normalizedBody: candidate.normalizedBody };
            const draft = await generateEmailDraft(email, candidate.classification, crmReader, draftClient, knowledge);
            if (!draft) {
                result.skipped += 1;
                continue;
            }
            const saved = await persistDraft(repository, {
                emailId: candidate.id,
                draft,
                knowledge: knowledge.map((item): DraftKnowledgeRefInput => ({ id: item.id, sourceUrl: item.sourceUrl, score: item.score })),
            });
            const contact = await crmReader.findContactByEmail(candidate.sender);
            await notify({
                draftId: saved.id,
                version: saved.version,
                sender: candidate.sender,
                subject: draft.subject,
                body: draft.body,
                language: draft.replyLanguage,
                intent: candidate.classification.intent,
                contactName: contact ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') : null,
                knowledgeSourceUrls: knowledge.map((item) => item.sourceUrl),
                needsManualAnswer: draft.needsManualAnswer,
            });
            result.processed += 1;
        } catch (error) {
            result.failed += 1;
            if (repository.createFailureVersion && error instanceof DraftProviderError) {
                const failedDraft = {
                    replyLanguage: candidate.classification.language,
                    subject: candidate.subject,
                    body: '',
                    confidence: candidate.classification.confidence,
                    needsManualAnswer: true,
                    usedKnowledgeIds: [] as string[],
                };
                await repository.createFailureVersion({ emailId: candidate.id, draft: failedDraft, knowledge: [], provider: (draftClient as DraftProvider).provider, model: (draftClient as DraftProvider).model, generationErrorCode: error.code, generationErrorMessage: error.message });
            }
            logger.error(`[AiEmailDraft] Failed email=${candidate.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return result;
};

export const createPrismaDraftPipelineRepository = (): DraftPipelineRepository => {
    return {
        ...createPrismaAiEmailDraftRepository(),
        async findDraftCandidates(limit) {
            // `drafts: { none: {} }` alone can't tell "not yet evaluated" apart from "evaluated,
            // a draft is correctly never generated for this one" (spam / !needsReply) — both look
            // identical to that filter, since a skipped email never gets a draft row either. With
            // `take: limit` small (AI_MAX_CONCURRENCY throttles concurrent Ollama calls, default
            // 1) and `orderBy: receivedAt asc`, a single old skip-forever email would occupy that
            // slot on every future run forever, permanently starving any real, newer candidate.
            // Fetching a wider pool and filtering out the permanently-skipped ones here (cheap —
            // no Ollama call yet) before slicing to `limit` fixes the starvation while keeping the
            // actual draft-generation concurrency unchanged.
            const messages = await prisma.aiEmailMessage.findMany({
                where: { status: 'CLASSIFIED', drafts: { none: {} } },
                orderBy: { receivedAt: 'asc' }, take: Math.max(limit, 50),
                select: { id: true, sender: true, subject: true, normalizedBody: true, classifications: { orderBy: { createdAt: 'desc' }, take: 1 } },
            });
            const candidates = messages.flatMap((message) => {
                const classification = message.classifications[0];
                if (!classification) return [];
                if (classification.spam || !classification.needsReply) return [];
                return [{ id: message.id, sender: message.sender, subject: message.subject ?? '', normalizedBody: message.normalizedBody,
                    classification: { spam: classification.spam, needsReply: classification.needsReply, language: classification.language as EmailClassification['language'], intent: classification.intent as EmailClassification['intent'], confidence: classification.confidence, reason: classification.reason } }];
            });
            return candidates.slice(0, limit);
        },
    };
};
