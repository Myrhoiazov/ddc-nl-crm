import assert from 'node:assert/strict';
import test from 'node:test';
import { OllamaQueryExpansionClient, parseExpansionResponse } from './query-expansion.service';

test('parseExpansionResponse parses plain valid JSON', () => {
    const result = parseExpansionResponse('{"clean_query": "цена абонемента", "keywords": ["цена", "абонемент"]}');
    assert.deepEqual(result, { cleanQuery: 'цена абонемента', keywords: ['цена', 'абонемент'] });
});

test('parseExpansionResponse strips a markdown code fence', () => {
    const result = parseExpansionResponse('```json\n{"clean_query": "x", "keywords": ["a"]}\n```');
    assert.deepEqual(result, { cleanQuery: 'x', keywords: ['a'] });
});

test('parseExpansionResponse extracts JSON embedded in explanatory prose', () => {
    const result = parseExpansionResponse('Конечно! Вот результат: {"clean_query": "x", "keywords": ["a", "b"]} Надеюсь, это поможет.');
    assert.deepEqual(result, { cleanQuery: 'x', keywords: ['a', 'b'] });
});

test('parseExpansionResponse accepts keywords as a comma-separated string', () => {
    const result = parseExpansionResponse('{"clean_query": "x", "keywords": "a, b, c"}');
    assert.deepEqual(result, { cleanQuery: 'x', keywords: ['a', 'b', 'c'] });
});

test('parseExpansionResponse returns null for garbage input', () => {
    assert.equal(parseExpansionResponse('not json at all'), null);
    assert.equal(parseExpansionResponse(''), null);
    assert.equal(parseExpansionResponse('   '), null);
});

test('parseExpansionResponse returns null when both fields are empty', () => {
    assert.equal(parseExpansionResponse('{"clean_query": "", "keywords": []}'), null);
});

const config = {
    ollamaUrl: 'http://ollama:11434/',
    ollamaModel: 'test-model',
    contextLength: 1024,
    temperature: 0.2,
    keepAlive: 0,
    maxConcurrency: 1,
    ollamaEmbeddingModel: '',
    ragTopK: 4,
    ragQueryExpansionEnabled: true,
    ragRerankEnabled: false,
    ragRerankModel: 'test-reranker',
    ragChunkSize: 700,
    ragChunkOverlap: 100,
};

test('OllamaQueryExpansionClient returns the parsed expansion on success', async () => {
    const client = new OllamaQueryExpansionClient({
        config,
        fetchImpl: async () => new Response(JSON.stringify({ response: '{"clean_query": "цена", "keywords": ["цена", "абонемент"]}' }), { status: 200 }),
    });
    const result = await client.expand('сколько стоит абонемент');
    assert.deepEqual(result, { cleanQuery: 'цена', keywords: ['цена', 'абонемент'] });
});

test('OllamaQueryExpansionClient falls back to the original query and local keywords on a non-2xx response', async () => {
    const client = new OllamaQueryExpansionClient({
        config,
        fetchImpl: async () => new Response('error', { status: 500 }),
    });
    const result = await client.expand('сколько стоит абонемент');
    assert.equal(result.cleanQuery, 'сколько стоит абонемент');
    assert.ok(result.keywords.length > 0);
});

test('OllamaQueryExpansionClient falls back on a network error', async () => {
    const client = new OllamaQueryExpansionClient({
        config,
        fetchImpl: async () => { throw new Error('network down'); },
    });
    const result = await client.expand('пробное занятие');
    assert.equal(result.cleanQuery, 'пробное занятие');
    assert.deepEqual(result.keywords, ['пробное', 'занятие']);
});

test('OllamaQueryExpansionClient falls back when the model output cannot be parsed', async () => {
    const client = new OllamaQueryExpansionClient({
        config,
        fetchImpl: async () => new Response(JSON.stringify({ response: 'I cannot help with that.' }), { status: 200 }),
    });
    const result = await client.expand('где вы находитесь');
    assert.equal(result.cleanQuery, 'где вы находитесь');
});
