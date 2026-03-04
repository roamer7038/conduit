import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMConfig } from './types';
import { llmRegistry } from './registry';
import { OpenAIProvider } from './providers/openai-provider';
import { OllamaProvider } from './providers/ollama-provider';

// Register built-in providers
llmRegistry.register(new OpenAIProvider());
llmRegistry.register(new OllamaProvider());

export class LLMFactory {
  /**
   * Creates an LLM model instance using the registered providers.
   * @param config Configuration for the LLM
   * @returns BaseChatModel instance
   * @throws {UnsupportedProviderError} If the provider is not registered
   * @throws {LLMInitializationError} If the provider fails to initialize the model
   */
  static createModel(config: LLMConfig): BaseChatModel {
    return llmRegistry.createModel(config);
  }
}

// Re-export types and interfaces for external use
export type { LLMConfig } from './types';
export type { ILLMProvider } from './provider-interface';
export { LLMRegistry, llmRegistry } from './registry';
export * from './errors';
