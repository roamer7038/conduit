import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ILLMProvider } from './provider-interface';
import type { LLMConfig } from './types';
import { UnsupportedProviderError } from './errors';

export class LLMRegistry {
  private providers: Map<string, ILLMProvider> = new Map();

  register(provider: ILLMProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): ILLMProvider | undefined {
    return this.providers.get(name);
  }

  createModel(config: LLMConfig): BaseChatModel {
    const providerName = config.provider === 'openai-compatible' ? 'openai' : config.provider;
    const provider = this.get(providerName);

    if (!provider) {
      throw new UnsupportedProviderError(providerName);
    }

    return provider.createModel(config);
  }
}

// Create a singleton instance
export const llmRegistry = new LLMRegistry();
