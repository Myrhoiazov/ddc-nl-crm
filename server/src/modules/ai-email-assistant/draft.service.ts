import { z } from 'zod';
import type { EmailClassification, NormalizedEmailInput } from './email-assistant.service';

export const emailDraftSchema = z.object({
    replyLanguage: z.enum(['nl', 'en', 'ua', 'ru', 'unknown']),
    subject: z.string().trim().min(1).max(500),
    body: z.string().trim().min(1).max(6_000),
    confidence: z.number().min(0).max(1),
    needsManualAnswer: z.boolean(),
    usedKnowledgeIds: z.array(z.string().trim().min(1)).max(20),
}).strict();

export type EmailDraft = z.infer<typeof emailDraftSchema>;

export interface CrmContactProjection {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string | null;
}

export interface CrmReader {
    findContactByEmail(email: string): Promise<CrmContactProjection | null>;
}

export interface DraftKnowledgeContext {
    id: string;
    sourceUrl: string;
    content: string;
    score: number;
}

export interface DraftContext {
    email: NormalizedEmailInput;
    classification: EmailClassification;
    contact: CrmContactProjection | null;
    knowledge: DraftKnowledgeContext[];
}

export interface DraftLlmClient {
    generateDraft(context: DraftContext): Promise<EmailDraft>;
}

export const buildDraftContext = async (
    email: NormalizedEmailInput,
    classification: EmailClassification,
    crmReader: CrmReader,
    knowledge: DraftKnowledgeContext[] = [],
): Promise<DraftContext> => ({
    email,
    classification,
    contact: await crmReader.findContactByEmail(email.fromAddress),
    knowledge: knowledge.slice(0, 4).map(({ id, sourceUrl, content, score }) => ({ id, sourceUrl, content, score })),
});

export const generateEmailDraft = async (
    email: NormalizedEmailInput,
    classification: EmailClassification,
    crmReader: CrmReader,
    draftClient: DraftLlmClient,
    knowledge: DraftKnowledgeContext[] = [],
): Promise<EmailDraft | null> => {
    if (classification.spam || !classification.needsReply) return null;
    const context = await buildDraftContext(email, classification, crmReader, knowledge);
    return emailDraftSchema.parse(await draftClient.generateDraft(context));
};
