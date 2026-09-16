import test from 'node:test';
import assert from 'node:assert/strict';
import { readAiConfig } from './ai.config';

test('AI config uses the resource-safe local defaults', () => {
    const config = readAiConfig({});

    assert.deepEqual(config, {
        ollamaUrl: 'http://127.0.0.1:11434',
        ollamaModel: 'qwen3:0.6b',
        contextLength: 2048,
        temperature: 0.2,
        keepAlive: 0,
        maxConcurrency: 1,
        ollamaEmbeddingModel: 'bge-m3',
        ragTopK: 4,
    });
});

test('AI config is fully environment-driven', () => {
    const config = readAiConfig({
        OLLAMA_URL: 'http://ollama:11434/',
        OLLAMA_MODEL: 'custom-model',
        LLM_CONTEXT_LENGTH: '1024',
        LLM_TEMPERATURE: '0.7',
        LLM_KEEP_ALIVE: '30',
        AI_MAX_CONCURRENCY: '2',
        OLLAMA_EMBEDDING_MODEL: 'multilingual-test',
        RAG_TOP_K: '8',
    });

    assert.deepEqual(config, {
        ollamaUrl: 'http://ollama:11434/',
        ollamaModel: 'custom-model',
        contextLength: 1024,
        temperature: 0.7,
        keepAlive: 30,
        maxConcurrency: 2,
        ollamaEmbeddingModel: 'multilingual-test',
        ragTopK: 8,
    });
});

test('invalid or unsafe numeric values fall back to bounded defaults', () => {
    const config = readAiConfig({
        LLM_CONTEXT_LENGTH: '0',
        LLM_TEMPERATURE: '3',
        LLM_KEEP_ALIVE: '-1',
        AI_MAX_CONCURRENCY: 'not-a-number',
    });

    assert.equal(config.contextLength, 2048);
    assert.equal(config.temperature, 0.2);
    assert.equal(config.keepAlive, 0);
    assert.equal(config.maxConcurrency, 1);
});
