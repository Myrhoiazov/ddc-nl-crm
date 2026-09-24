import type { DraftContext, DraftLlmClient, EmailDraft } from './draft.service';
import type { AiDraftProvider } from '@prisma/client';

export type DraftProviderErrorCode = 'PROVIDER_NOT_CONFIGURED' | 'TIMEOUT' | 'RATE_LIMITED' | 'INVALID_RESPONSE' | 'UNAVAILABLE';
export class DraftProviderError extends Error {
  public constructor(public readonly code: DraftProviderErrorCode, message: string) { super(message); this.name = 'DraftProviderError'; }
}
export interface DraftProvider extends DraftLlmClient {
  readonly provider: AiDraftProvider;
  readonly model: string;
  generateDraft(context: DraftContext): Promise<EmailDraft>;
}
