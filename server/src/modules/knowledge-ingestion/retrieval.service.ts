import { aiConfig } from '../../config/ai.config';
import type { EmbeddingClient, KnowledgeRepository, ScoredKnowledgeChunk } from './embedding.service';

export interface RetrievalOptions {
    topK?: number;
    minimumScore?: number;
}

export class KnowledgeRetrievalService {
    public constructor(
        private readonly embeddings: EmbeddingClient,
        private readonly repository: KnowledgeRepository,
    ) {}

    public async retrieve(query: string, options: RetrievalOptions = {}): Promise<ScoredKnowledgeChunk[]> {
        const topK = options.topK ?? aiConfig.ragTopK;
        const minimumScore = options.minimumScore ?? 0.35;
        const vector = await this.embeddings.embed(query);
        const chunks = await this.repository.search(vector, Math.max(topK * 2, topK));
        const seen = new Set<string>();
        return chunks
            .filter((chunk) => chunk.score >= minimumScore)
            .filter((chunk) => {
                const key = `${chunk.documentId}:${chunk.contentHash}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, topK);
    }
}
