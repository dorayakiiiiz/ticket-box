// Token để inject vào các module khác qua @Inject(AI_PROVIDER)
export const AI_PROVIDER = 'AI_PROVIDER';

export interface AiProviderService {
  summarize(text: string): Promise<string | null>;
}
