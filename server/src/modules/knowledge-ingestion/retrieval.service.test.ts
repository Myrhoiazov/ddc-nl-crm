import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryKnowledgeRepository } from './embedding.service';
import { KnowledgeRetrievalService } from './retrieval.service';

test('retrieval applies score threshold, deduplicates document versions and limits topK', async () => {
    const repository = new InMemoryKnowledgeRepository();
    await repository.upsertChunks([
        { id: 'a1', documentId: 'a', sourceUrl: 'a', contentHash: 'v1', ordinal: 0, content: 'one', embedding: [1, 0] },
        { id: 'a2', documentId: 'a', sourceUrl: 'a', contentHash: 'v1', ordinal: 1, content: 'two', embedding: [0.99, 0.01] },
        { id: 'b1', documentId: 'b', sourceUrl: 'b', contentHash: 'v1', ordinal: 0, content: 'three', embedding: [0.8, 0.2] },
        { id: 'c1', documentId: 'c', sourceUrl: 'c', contentHash: 'v1', ordinal: 0, content: 'weak', embedding: [0, 1] },
    ]);
    const service = new KnowledgeRetrievalService({ embed: async () => [1, 0] }, repository);
    const results = await service.retrieve('query', { topK: 2, minimumScore: 0.7 });
    assert.deepEqual(results.map((result) => result.id), ['a1', 'b1']);
});
