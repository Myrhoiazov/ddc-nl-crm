import { AiDraftProvider } from '@prisma/client';
import { OllamaLlmClient } from './ollama.client';
import { OpenAiDraftClient } from './openai.client';
import type { DraftProvider } from './draft-provider';
import { createPrismaAiRuntimeSettingsRepository, type AiRuntimeSettingsRepository } from './runtime-settings.service';

export const createDraftProviderFactory = (settingsRepository: AiRuntimeSettingsRepository = createPrismaAiRuntimeSettingsRepository()) => ({
  async getSelectedProvider(): Promise<DraftProvider> {
    const settings = await settingsRepository.get();
    return settings.provider === AiDraftProvider.OPENAI ? new OpenAiDraftClient({ model: settings.model }) : new OllamaLlmClient();
  },
  async testSelectedProvider(): Promise<{ provider: AiDraftProvider; model: string }> {
    const settings = await settingsRepository.get();
    const provider = await this.getSelectedProvider();
    await provider.generateDraft({ email: { fromAddress: 'synthetic@example.com', subject: 'Synthetic test', normalizedBody: 'Synthetic provider connectivity test.' }, classification: { spam: false, needsReply: true, language: 'en', intent: 'other', confidence: 1, reason: 'synthetic' }, contact: null, knowledge: [] });
    return { provider: settings.provider, model: settings.model };
  },
});
