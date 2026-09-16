const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen3:0.6b';
const DEFAULT_OLLAMA_EMBEDDING_MODEL = 'bge-m3';
const DEFAULT_CONTEXT_LENGTH = 2048;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_KEEP_ALIVE = 0;
const DEFAULT_MAX_CONCURRENCY = 1;

export interface AiConfig {
    ollamaUrl: string;
    ollamaModel: string;
    contextLength: number;
    temperature: number;
    keepAlive: number;
    maxConcurrency: number;
    ollamaEmbeddingModel: string;
    ragTopK: number;
}

const positiveInteger = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const boundedTemperature = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : fallback;
};

const keepAliveSeconds = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const readAiConfig = (environment: NodeJS.ProcessEnv = process.env): AiConfig => ({
    ollamaUrl: environment.OLLAMA_URL?.trim() || DEFAULT_OLLAMA_URL,
    ollamaModel: environment.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL,
    contextLength: positiveInteger(environment.LLM_CONTEXT_LENGTH, DEFAULT_CONTEXT_LENGTH),
    temperature: boundedTemperature(environment.LLM_TEMPERATURE, DEFAULT_TEMPERATURE),
    keepAlive: keepAliveSeconds(environment.LLM_KEEP_ALIVE, DEFAULT_KEEP_ALIVE),
    maxConcurrency: positiveInteger(environment.AI_MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY),
    ollamaEmbeddingModel: environment.OLLAMA_EMBEDDING_MODEL?.trim() || DEFAULT_OLLAMA_EMBEDDING_MODEL,
    ragTopK: positiveInteger(environment.RAG_TOP_K, 4),
});

export const aiConfig = readAiConfig();
