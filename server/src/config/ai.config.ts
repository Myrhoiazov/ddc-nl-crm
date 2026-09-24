const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen3:0.6b';
const DEFAULT_OLLAMA_EMBEDDING_MODEL = 'bge-m3';
const DEFAULT_CONTEXT_LENGTH = 2048;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_KEEP_ALIVE = 0;
const DEFAULT_MAX_CONCURRENCY = 1;
const DEFAULT_RAG_RERANK_MODEL = 'qwen3-reranker:0.6b';
const DEFAULT_RAG_CHUNK_SIZE = 700;
const DEFAULT_RAG_CHUNK_OVERLAP = 100;

export interface AiConfig {
    ollamaUrl: string;
    openAiApiKey?: string;
    openAiBaseUrl?: string;
    openAiDefaultModel?: string;
    openAiAllowedModels?: string[];
    ollamaModel: string;
    contextLength: number;
    temperature: number;
    keepAlive: number;
    maxConcurrency: number;
    ollamaEmbeddingModel: string;
    ragTopK: number;
    // Both default OFF in real production drafting/classification (draft-pipeline.cron.service.ts)
    // — each adds an extra model call to every classify→retrieve→draft cycle, on a 2 CPU/4 GB
    // deployment, for a quality benefit unproven in this specific knowledge base. The "Симуляция
    // письма" admin panel always has both available regardless of this flag, so an admin can
    // evaluate the effect on real queries before opting the production path in via .env.
    ragQueryExpansionEnabled: boolean;
    ragRerankEnabled: boolean;
    ragRerankModel: string;
    // Defaults for chunkKnowledgeDocument's maxCharacters/overlapCharacters — see
    // embedding.service.ts. Character-based, not token-based (no tokenizer wired up in this
    // codebase); ~2-2.5 chars/token for Cyrillic, this deployment's canonical language.
    ragChunkSize: number;
    ragChunkOverlap: number;
}

const positiveInteger = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const nonNegativeInteger = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const boundedTemperature = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : fallback;
};

const keepAliveSeconds = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const booleanFlag = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return fallback;
};

export const readAiConfig = (environment: NodeJS.ProcessEnv = process.env): AiConfig => ({
    ollamaUrl: environment.OLLAMA_URL?.trim() || DEFAULT_OLLAMA_URL,
    openAiApiKey: environment.OPENAI_API_KEY?.trim() || "",
    openAiBaseUrl: environment.OPENAI_BASE_URL?.trim() || undefined,
    openAiDefaultModel: environment.OPENAI_DEFAULT_MODEL?.trim() || "gpt-4o-mini",
    openAiAllowedModels: (environment.OPENAI_ALLOWED_MODELS || "").split(",").map((v) => v.trim()).filter(Boolean),
    ollamaModel: environment.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL,
    contextLength: positiveInteger(environment.LLM_CONTEXT_LENGTH, DEFAULT_CONTEXT_LENGTH),
    temperature: boundedTemperature(environment.LLM_TEMPERATURE, DEFAULT_TEMPERATURE),
    keepAlive: keepAliveSeconds(environment.LLM_KEEP_ALIVE, DEFAULT_KEEP_ALIVE),
    maxConcurrency: positiveInteger(environment.AI_MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY),
    ollamaEmbeddingModel: environment.OLLAMA_EMBEDDING_MODEL?.trim() || DEFAULT_OLLAMA_EMBEDDING_MODEL,
    ragTopK: positiveInteger(environment.RAG_TOP_K, 4),
    ragQueryExpansionEnabled: booleanFlag(environment.RAG_QUERY_EXPANSION_ENABLED, false),
    ragRerankEnabled: booleanFlag(environment.RAG_RERANK_ENABLED, false),
    ragRerankModel: environment.RAG_RERANK_MODEL?.trim() || DEFAULT_RAG_RERANK_MODEL,
    ragChunkSize: positiveInteger(environment.RAG_CHUNK_SIZE, DEFAULT_RAG_CHUNK_SIZE),
    ragChunkOverlap: nonNegativeInteger(environment.RAG_CHUNK_OVERLAP, DEFAULT_RAG_CHUNK_OVERLAP),
});

export const aiConfig = readAiConfig();
