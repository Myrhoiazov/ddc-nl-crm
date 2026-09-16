import prisma from '../../../prisma/prisma-client';
import { aiConfig } from '../../config/ai.config';
import type { EmbeddedKnowledgeChunk, KnowledgeRepository, ScoredKnowledgeChunk } from './embedding.service';
import type { NormalizedKnowledgeDocument } from './knowledge-ingestion.service';
import { cosineSimilarity } from './embedding.service';

export interface PersistedKnowledgeDocument {
    document: NormalizedKnowledgeDocument;
    chunks: EmbeddedKnowledgeChunk[];
    embeddingModel?: string;
}

export class MysqlKnowledgeRepository implements KnowledgeRepository {
    public async upsertChunks(chunks: EmbeddedKnowledgeChunk[]): Promise<void> {
        for (const chunk of chunks) {
            await prisma.knowledgeChunk.upsert({
                where: { id: chunk.id },
                create: { id: chunk.id, documentId: chunk.documentId, ordinal: chunk.ordinal, content: chunk.content, headingPath: chunk.headingPath ?? [], embedding: chunk.embedding, embeddingModel: aiConfig.ollamaEmbeddingModel, contentHash: chunk.contentHash },
                update: { content: chunk.content, headingPath: chunk.headingPath ?? [], embedding: chunk.embedding, embeddingModel: aiConfig.ollamaEmbeddingModel, contentHash: chunk.contentHash },
            });
        }
    }

    public async persistDocument(input: PersistedKnowledgeDocument): Promise<void> {
        const { document, chunks } = input;
        await prisma.$transaction(async (transaction) => {
            await transaction.knowledgeDocument.updateMany({
                where: { sourceType: document.sourceType, sourceId: document.sourceId, sourceUrl: document.sourceUrl, contentHash: { not: document.contentHash }, status: 'ACTIVE' },
                data: { status: 'INACTIVE' },
            });
            await transaction.knowledgeDocument.upsert({
                where: { id: `${document.sourceId}:${document.contentHash}` },
                create: { id: `${document.sourceId}:${document.contentHash}`, sourceType: document.sourceType, sourceId: document.sourceId, sourceUrl: document.sourceUrl, relativePath: document.relativePath, folderPath: document.folderPath, title: document.title, language: document.language, contentHash: document.contentHash, content: document.content, status: 'ACTIVE', lastSyncedAt: document.lastCheckedAt },
                update: { content: document.content, relativePath: document.relativePath, folderPath: document.folderPath, title: document.title, language: document.language, status: 'ACTIVE', lastSyncedAt: document.lastCheckedAt },
            });
            await transaction.knowledgeChunk.deleteMany({ where: { documentId: `${document.sourceId}:${document.contentHash}` } });
            if (chunks.length) await transaction.knowledgeChunk.createMany({ data: chunks.map((chunk) => ({ id: chunk.id, documentId: `${document.sourceId}:${document.contentHash}`, ordinal: chunk.ordinal, content: chunk.content, headingPath: chunk.headingPath ?? [], embedding: chunk.embedding, embeddingModel: input.embeddingModel ?? aiConfig.ollamaEmbeddingModel, contentHash: chunk.contentHash })) });
        });
    }

    public async search(query: number[], topK: number): Promise<ScoredKnowledgeChunk[]> {
        const chunks = await prisma.knowledgeChunk.findMany({ where: { document: { status: 'ACTIVE' } }, select: { id: true, documentId: true, ordinal: true, content: true, contentHash: true, embedding: true, document: { select: { sourceUrl: true } } } });
        return chunks.map((chunk) => ({ id: chunk.id, documentId: chunk.documentId, sourceUrl: chunk.document.sourceUrl, contentHash: chunk.contentHash, ordinal: chunk.ordinal, content: chunk.content, score: cosineSimilarity(query, Array.isArray(chunk.embedding) ? chunk.embedding.filter((value): value is number => typeof value === 'number') : []) })).sort((a, b) => b.score - a.score).slice(0, Math.max(0, topK));
    }
}
