import { ChatOllama } from '@langchain/ollama';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ILLMProvider } from '../provider-interface';
import type { LLMConfig } from '../types';
import { LLMInitializationError } from '../errors';

export class OllamaProvider implements ILLMProvider {
  readonly name = 'ollama';

  createModel(config: LLMConfig): BaseChatModel {
    try {
      return new ChatOllama({
        model: config.modelName,
        baseUrl: config.baseUrl,
        temperature: config.temperature ?? 0,
        topP: config.topP ?? 1
      });
    } catch (error: any) {
      throw new LLMInitializationError(this.name, error.message);
    }
  }
}
