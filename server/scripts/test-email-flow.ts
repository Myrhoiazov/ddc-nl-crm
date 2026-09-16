/**
 * Local CLI for exercising the AI email assistant pipeline (normalize → spam check → classify →
 * RAG retrieve → draft) against a hand-written subject/body, without IMAP, without touching
 * ai_email_messages/ai_email_drafts, and without notifying Telegram. Read-only against the real
 * CRM (contact lookup) and the real knowledge base (retrieval); nothing is persisted.
 *
 * Usage (from server/, with the environment that points at your Ollama + MySQL):
 *   npm run ai:test-flow -- --subject "Тема" --body "Текст письма" [--from a@b.com]
 *   echo "Текст письма" | npm run ai:test-flow -- --subject "Тема"
 *   npm run ai:test-flow -- --subject "..." --body-file ./sample.txt
 *
 * Flags:
 *   --from <email>       Sender address, used for CRM contact lookup. Default: test@example.com
 *   --subject <text>     Email subject. Required.
 *   --body <text>        Email body. Omit to read from --body-file or stdin.
 *   --body-file <path>   Read the body from a file instead of --body/stdin.
 *   --top-k <n>          Override RAG_TOP_K for this run only.
 *   --no-knowledge       Skip RAG retrieval entirely (classification-only testing).
 *   --force-draft        Generate a draft even when classification says spam or no reply needed —
 *                         useful to inspect what the model WOULD write, not what the pipeline
 *                         would actually do.
 *   --json                Print one machine-readable JSON object instead of the human-readable
 *                         stage-by-stage output.
 */
import { readFileSync } from 'node:fs';
import prisma from '../prisma/prisma-client';
// Imported from their specific submodules rather than the `ai-email-assistant` barrel: the
// barrel also re-exports send.persistence.ts, which pulls in
// communication/email/email-smtp.service.ts -> email-imap.service.ts, which imports back from
// the barrel itself. That cycle resolves fine in the real app's own import order, but a script
// that imports the barrel first hits it mid-evaluation and gets `undefined` exports. This script
// doesn't need the SMTP-sending path at all, so it just avoids the barrel entirely.
import { normalizeEmail, deterministicSpamReason } from '../src/modules/ai-email-assistant/email-assistant.service';
import { OllamaLlmClient } from '../src/modules/ai-email-assistant/ollama.client';
import { createPrismaCrmReader } from '../src/modules/ai-email-assistant/crm-context.service';
import { buildDraftContext, generateEmailDraft, emailDraftSchema } from '../src/modules/ai-email-assistant/draft.service';
import { KnowledgeRetrievalService, MysqlKnowledgeRepository, OllamaEmbeddingClient } from '../src/modules/knowledge-ingestion';
import { aiConfig } from '../src/config/ai.config';

interface CliArgs {
    from: string;
    subject: string;
    body?: string;
    bodyFile?: string;
    topK?: number;
    noKnowledge: boolean;
    forceDraft: boolean;
    json: boolean;
}

const parseArgs = (argv: string[]): CliArgs => {
    const args: CliArgs = { from: 'test@example.com', subject: '', noKnowledge: false, forceDraft: false, json: false };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        const next = () => argv[++i];
        switch (flag) {
            case '--from': args.from = next(); break;
            case '--subject': args.subject = next(); break;
            case '--body': args.body = next(); break;
            case '--body-file': args.bodyFile = next(); break;
            case '--top-k': args.topK = Number(next()); break;
            case '--no-knowledge': args.noKnowledge = true; break;
            case '--force-draft': args.forceDraft = true; break;
            case '--json': args.json = true; break;
            default:
                if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`);
        }
    }
    return args;
};

const readStdin = (): Promise<string> => new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
});

const section = (title: string) => console.log(`\n=== ${title} ===`);

const main = async () => {
    const args = parseArgs(process.argv.slice(2));
    if (!args.subject) throw new Error('--subject is required');

    let bodyText = args.body;
    if (!bodyText && args.bodyFile) bodyText = readFileSync(args.bodyFile, 'utf8');
    if (!bodyText && !process.stdin.isTTY) bodyText = await readStdin();
    if (!bodyText?.trim()) throw new Error('Provide the email body via --body, --body-file, or stdin');

    const json: Record<string, unknown> = {};

    // --- Stage 1: normalize ---
    const normalized = normalizeEmail({ fromAddress: args.from, subject: args.subject, text: bodyText });
    json.normalized = normalized;
    if (!args.json) {
        section('1. NORMALIZE');
        console.log(normalized);
    }

    // --- Stage 2: deterministic spam check ---
    const spamReason = deterministicSpamReason({ fromAddress: args.from, subject: args.subject, text: bodyText }, normalized);
    json.deterministicSpamReason = spamReason;
    if (!args.json) {
        section('2. DETERMINISTIC SPAM CHECK');
        console.log(spamReason ? `SPAM (${spamReason}) — the real pipeline would stop here` : 'not spam');
    }

    const client = new OllamaLlmClient();
    let classification;
    if (!spamReason) {
        // --- Stage 3: LLM classification ---
        classification = await client.classifyEmail(normalized);
        json.classification = classification;
        if (!args.json) {
            section(`3. CLASSIFY (model: ${aiConfig.ollamaModel})`);
            console.log(classification);
        }
    }

    // --- Stage 4: RAG retrieval ---
    let knowledge: Array<{ id: string; sourceUrl: string; content: string; score: number }> = [];
    if (!args.noKnowledge) {
        const retrieval = new KnowledgeRetrievalService(new OllamaEmbeddingClient(), new MysqlKnowledgeRepository());
        knowledge = await retrieval.retrieve(`${normalized.subject}\n${normalized.normalizedBody}`, { topK: args.topK ?? aiConfig.ragTopK });
        json.knowledge = knowledge.map(({ id, sourceUrl, score }) => ({ id, sourceUrl, score }));
        if (!args.json) {
            section(`4. RAG RETRIEVAL (embedding: ${aiConfig.ollamaEmbeddingModel}, topK: ${args.topK ?? aiConfig.ragTopK})`);
            if (!knowledge.length) console.log('(no relevant knowledge found)');
            for (const chunk of knowledge) console.log(`score=${chunk.score.toFixed(3)}  ${chunk.sourceUrl}\n  ${chunk.content.slice(0, 160).replace(/\n/g, ' ')}`);
        }
    }

    // --- Stage 5: draft generation ---
    const shouldDraft = classification && (args.forceDraft || (!classification.spam && classification.needsReply));
    if (!classification) {
        json.draft = null;
        if (!args.json) { section('5. DRAFT'); console.log('skipped — message was deterministic spam'); }
    } else if (!shouldDraft) {
        json.draft = null;
        if (!args.json) {
            section('5. DRAFT');
            console.log(`skipped — classification says spam=${classification.spam}, needsReply=${classification.needsReply} (use --force-draft to generate anyway)`);
        }
    } else {
        const crmReader = createPrismaCrmReader();
        const contact = await crmReader.findContactByEmail(args.from);
        json.crmContact = contact;
        const draft = args.forceDraft && (classification.spam || !classification.needsReply)
            // generateEmailDraft itself refuses to draft spam/no-reply-needed emails; --force-draft
            // bypasses that gate by calling the LLM client directly through the same context shape.
            ? emailDraftSchema.parse(await client.generateDraft(await buildDraftContext(normalized, classification, crmReader, knowledge)))
            : await generateEmailDraft(normalized, classification, crmReader, client, knowledge);
        json.draft = draft;
        if (!args.json) {
            section(`5. DRAFT (model: ${aiConfig.ollamaModel})`);
            console.log(draft);
        }
    }

    if (args.json) console.log(JSON.stringify(json, null, 2));
};

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
