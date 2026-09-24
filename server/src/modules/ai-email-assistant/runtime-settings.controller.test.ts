import test from 'node:test';
import assert from 'node:assert/strict';
import { AiDraftProvider } from '@prisma/client';
import { updateRuntimeSettingsSchema } from './runtime-settings.controller';

test('runtime settings schema accepts provider and model', () => {
  assert.deepEqual(updateRuntimeSettingsSchema.parse({ provider: AiDraftProvider.OPENAI, model: 'gpt-test' }), { provider: 'OPENAI', model: 'gpt-test' });
});
test('runtime settings schema rejects empty model', () => {
  assert.equal(updateRuntimeSettingsSchema.safeParse({ provider: 'OPENAI', model: '' }).success, false);
});
