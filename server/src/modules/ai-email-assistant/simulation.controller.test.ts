import assert from 'node:assert/strict';
import test from 'node:test';
import { simulationRequestSchema } from './simulation.controller';

test('simulationRequestSchema requires subject and body', () => {
    assert.equal(simulationRequestSchema.safeParse({}).success, false);
    assert.equal(simulationRequestSchema.safeParse({ subject: 'x' }).success, false);
    assert.equal(simulationRequestSchema.safeParse({ body: 'x' }).success, false);
});

test('simulationRequestSchema accepts a minimal valid payload and defaults flags to false', () => {
    const result = simulationRequestSchema.safeParse({ subject: 'Вопрос', body: 'Текст письма' });
    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.noKnowledge, false);
        assert.equal(result.data.forceDraft, false);
        assert.equal(result.data.from, undefined);
    }
});

test('simulationRequestSchema coerces topK and rejects out-of-range values', () => {
    const inRange = simulationRequestSchema.safeParse({ subject: 'x', body: 'y', topK: '5' });
    assert.equal(inRange.success, true);
    if (inRange.success) assert.equal(inRange.data.topK, 5);
    assert.equal(simulationRequestSchema.safeParse({ subject: 'x', body: 'y', topK: '0' }).success, false);
    assert.equal(simulationRequestSchema.safeParse({ subject: 'x', body: 'y', topK: '21' }).success, false);
});

test('simulationRequestSchema rejects an empty subject or body', () => {
    assert.equal(simulationRequestSchema.safeParse({ subject: '', body: 'y' }).success, false);
    assert.equal(simulationRequestSchema.safeParse({ subject: 'x', body: '' }).success, false);
});
