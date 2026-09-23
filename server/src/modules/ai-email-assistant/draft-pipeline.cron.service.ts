import cron from 'node-cron';
import { logger } from '../../common/logger';
import { aiConfig } from '../../config/ai.config';
import { OllamaLlmClient } from './ollama.client';
import { createPrismaCrmReader } from './crm-context.service';
import { createPrismaDraftPipelineRepository, runDraftPipeline } from './draft-pipeline.service';
import {
    KnowledgeRetrievalService, MysqlKnowledgeRepository, OllamaEmbeddingClient,
    OllamaQueryExpansionClient, OllamaReranker,
} from '../knowledge-ingestion';

// Query expansion / reranking each add an extra model call to every classify→retrieve→draft
// cycle — off by default (aiConfig.ragQueryExpansionEnabled/ragRerankEnabled) on this deployment's
// 2 CPU/4 GB VPS until an admin opts in via .env after evaluating the effect in the "Симуляция
// письма" panel, where both are always available regardless of this flag.
const buildRetrievalService = (): KnowledgeRetrievalService => {
    const embeddings = new OllamaEmbeddingClient();
    return new KnowledgeRetrievalService(embeddings, new MysqlKnowledgeRepository(), {
        queryExpansion: aiConfig.ragQueryExpansionEnabled ? new OllamaQueryExpansionClient() : undefined,
        reranker: aiConfig.ragRerankEnabled ? new OllamaReranker(embeddings) : undefined,
    });
};

export const startAiEmailDraftCron = (): boolean => {
    if (process.env.AI_EMAIL_DRAFT_ENABLED !== 'true') return false;
    cron.schedule('*/5 * * * *', async () => {
        try {
            const result = await runDraftPipeline(
                createPrismaDraftPipelineRepository(),
                createPrismaCrmReader(),
                new OllamaLlmClient(),
                buildRetrievalService(),
            );
            logger.info(`[AiEmailDraft] processed=${result.processed}, skipped=${result.skipped}, failed=${result.failed}`);
        } catch (error) {
            logger.error(`[AiEmailDraft] batch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    return true;
};
