import { AiDraftProvider, AiEmailDraftStatus } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { aiConfig } from '../../config/ai.config';
import { emailDraftSchema, type EmailDraft } from './draft.service';
import type { DraftApprovalRepository } from './approval.service';

export const DRAFT_PROMPT_VERSION = 'draft-v1';

export interface DraftKnowledgeRefInput {
    id: string;
    sourceUrl: string;
    score: number;
}

export interface DraftRecord {
    emailId: number;
    draft: EmailDraft;
    knowledge: DraftKnowledgeRefInput[];
    model?: string;
    promptVersion?: string;
    provider?: AiDraftProvider;
    generationErrorCode?: string;
    generationErrorMessage?: string;
    status?: AiEmailDraftStatus;
}

export interface AiEmailDraftRepository {
    createNextVersion(record: DraftRecord): Promise<{ id: number; version: number }>;
    createFailureVersion?(record: DraftRecord): Promise<{ id: number; version: number }>;
}

export const createPrismaAiEmailDraftRepository = (): AiEmailDraftRepository => ({
    async createNextVersion(record) {
        const parsed = emailDraftSchema.parse(record.draft);
        return prisma.$transaction(async (transaction) => {
            const latest = await transaction.aiEmailDraft.findFirst({
                where: { emailId: record.emailId },
                orderBy: { version: 'desc' },
                select: { version: true },
            });
            const version = (latest?.version ?? 0) + 1;
            const created = await transaction.aiEmailDraft.create({
                data: {
                    emailId: record.emailId,
                    version,
                    subject: parsed.subject,
                    body: parsed.body,
                    replyLanguage: parsed.replyLanguage,
                    confidence: parsed.confidence,
                    needsManualAnswer: parsed.needsManualAnswer,
                    provider: record.provider ?? AiDraftProvider.OLLAMA,
                    model: record.model ?? aiConfig.ollamaModel,
                    promptVersion: record.promptVersion ?? DRAFT_PROMPT_VERSION,
                    status: record.status ?? AiEmailDraftStatus.GENERATED,
                    generationErrorCode: record.generationErrorCode,
                    generationErrorMessage: record.generationErrorMessage?.slice(0, 500),
                    knowledgeRefs: {
                        create: record.knowledge.slice(0, 20).map((ref) => ({
                            knowledgeId: ref.id,
                            sourceUrl: ref.sourceUrl,
                            score: ref.score,
                        })),
                    },
                },
                select: { id: true, version: true },
            });
            return created;
        });
    },
    async createFailureVersion(record) {
        const latest = await prisma.aiEmailDraft.findFirst({ where: { emailId: record.emailId }, orderBy: { version: 'desc' }, select: { version: true } });
        return prisma.aiEmailDraft.create({
            data: {
                emailId: record.emailId,
                version: (latest?.version ?? 0) + 1,
                subject: record.draft.subject,
                body: record.draft.body,
                replyLanguage: record.draft.replyLanguage,
                confidence: record.draft.confidence,
                needsManualAnswer: true,
                provider: record.provider ?? AiDraftProvider.OLLAMA,
                model: record.model ?? aiConfig.ollamaModel,
                promptVersion: record.promptVersion ?? DRAFT_PROMPT_VERSION,
                status: AiEmailDraftStatus.FAILED,
                generationErrorCode: record.generationErrorCode,
                generationErrorMessage: record.generationErrorMessage?.slice(0, 500),
            },
            select: { id: true, version: true },
        });
    },
});

export const persistDraft = (
    repository: AiEmailDraftRepository,
    record: DraftRecord,
) => repository.createNextVersion({
    ...record,
    draft: emailDraftSchema.parse(record.draft),
});

export const createPrismaDraftApprovalRepository = (): DraftApprovalRepository => ({
    async findDraftVersion(draftId, version) {
        return prisma.aiEmailDraft.findUnique({
            where: { id: draftId },
            select: { id: true, version: true, status: true },
        }).then((draft) => draft && draft.version === version ? draft : null) as Promise<Awaited<ReturnType<DraftApprovalRepository['findDraftVersion']>>>;
    },

    async transitionDraft(draftId, version, status, editedBody) {
        await prisma.aiEmailDraft.updateMany({
            where: { id: draftId, version, status: { in: ['GENERATED', 'EDITED'] } },
            data: { status, ...(editedBody ? { body: editedBody } : {}) },
        });
    },

    async recordApproval(input) {
        await prisma.aiEmailApproval.create({
            data: {
                draftId: input.draftId,
                draftVersion: input.draftVersion,
                action: input.action,
                actorId: input.actorId,
                editedBody: input.editedBody,
            },
        });
    },
});
