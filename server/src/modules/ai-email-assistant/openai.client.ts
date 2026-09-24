import { aiConfig, type AiConfig } from '../../config/ai.config';
import { DEFAULT_PROMPT_CONTENT, PrismaAiPromptRepository, type AiPromptRepository } from './prompt-library.service';
import { buildDeterministicDraft, buildDraftBodyPrompt } from './ollama.client';
import { emailDraftSchema, type DraftContext, type EmailDraft } from './draft.service';
import { DRAFT_PROVIDERS, DraftProviderError, type DraftProvider } from './draft-provider';

interface OpenAiResponse { choices?: Array<{ message?: { content?: string | null } }> }
export interface OpenAiClientOptions { config?: AiConfig; fetchImpl?: typeof fetch; promptRepository?: AiPromptRepository; model?: string; }

export class OpenAiDraftClient implements DraftProvider {
  public readonly provider = DRAFT_PROVIDERS.OPENAI;
  public readonly model: string;
  private readonly config: AiConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly prompts: AiPromptRepository;
  public constructor(options: OpenAiClientOptions = {}) {
    this.config = options.config ?? aiConfig;
    this.model = options.model ?? this.config.openAiDefaultModel ?? this.config.ollamaModel;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.prompts = options.promptRepository ?? new PrismaAiPromptRepository();
  }
  public async generateDraft(context: DraftContext): Promise<EmailDraft> {
    if (!this.config.openAiApiKey) throw new DraftProviderError('PROVIDER_NOT_CONFIGURED', 'OpenAI is not configured');
    const instructions = await this.prompts.getActiveContent('DRAFT_BODY').catch(() => DEFAULT_PROMPT_CONTENT.DRAFT_BODY);
    const baseUrl = (this.config.openAiBaseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    let response: Response;
    try {
      response = await this.fetchImpl(`${baseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.openAiApiKey}` }, body: JSON.stringify({ model: this.model, temperature: this.config.temperature, messages: [{ role: 'system', content: instructions }, { role: 'user', content: buildDraftBodyPrompt(instructions, context) }] }) });
    } catch (error) {
      throw new DraftProviderError('UNAVAILABLE', error instanceof Error ? error.message : 'OpenAI unavailable');
    }
    if (response.status === 408 || response.status === 504) throw new DraftProviderError('TIMEOUT', 'OpenAI request timed out');
    if (response.status === 429) throw new DraftProviderError('RATE_LIMITED', 'OpenAI rate limit reached');
    if (!response.ok) throw new DraftProviderError('UNAVAILABLE', `OpenAI request failed with HTTP ${response.status}`);
    let content: string | null | undefined;
    try { content = (await response.json() as OpenAiResponse).choices?.[0]?.message?.content; } catch { throw new DraftProviderError('INVALID_RESPONSE', 'OpenAI response was not valid JSON'); }
    const body = content?.trim().slice(0, 6000) ?? '';
    if (body.length < 5) throw new DraftProviderError('INVALID_RESPONSE', 'OpenAI returned an empty draft');
    try { return emailDraftSchema.parse(JSON.parse(body)); } catch { return buildDeterministicDraft(context, body); }
  }
}
