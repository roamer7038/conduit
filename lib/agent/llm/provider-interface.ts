import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMConfig } from './types';

export interface ILLMProvider {
  /**
   * The identifier for this provider (e.g., 'openai', 'ollama')
   */
  readonly name: string;

  /**
   * Creates a language model instance based on the provided configuration.
   * @param config The configuration for the LLM.
   * @throws {LLMInitializationError} If the initialization fails or required config is missing.
   */
  createModel(config: LLMConfig): BaseChatModel;
}
