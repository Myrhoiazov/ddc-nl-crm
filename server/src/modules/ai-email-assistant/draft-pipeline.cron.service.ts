import cron from 'node-cron';
import { logger } from '../../common/logger';
import { OllamaLlmClient } from './ollama.client';
import { createPrismaCrmReader } from './crm-context.service';
import { createPrismaDraftPipelineRepository, runDraftPipeline } from './draft-pipeline.service';
import { KnowledgeRetrievalService, MysqlKnowledgeRepository, OllamaEmbeddingClient } from '../knowledge-ingestion';

export const startAiEmailDraftCron = (): boolean => {
    if (process.env.AI_EMAIL_DRAFT_ENABLED !== 'true') return false;
    cron.schedule('*/5 * * * *', async () => {
        try {
            const result = await runDraftPipeline(
                createPrismaDraftPipelineRepository(),
                createPrismaCrmReader(),
                new OllamaLlmClient(),
                new KnowledgeRetrievalService(new OllamaEmbeddingClient(), new MysqlKnowledgeRepository()),
            );
            logger.info(`[AiEmailDraft] processed=${result.processed}, skipped=${result.skipped}, failed=${result.failed}`);
        } catch (error) {
            logger.error(`[AiEmailDraft] batch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    return true;
};
