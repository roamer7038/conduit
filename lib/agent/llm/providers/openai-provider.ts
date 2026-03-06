import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ILLMProvider } from '../provider-interface';
import type { LLMConfig } from '../types';
import { LLMInitializationError } from '../errors';

export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai';

  createModel(config: LLMConfig): BaseChatModel {
    if (!config.apiKey && !config.baseUrl) {
      // Sometimes local compatible servers don't need API keys, but generally OpenAI requires one
      // We check for some minimal config here.
      console.warn('OpenAIProvider: apiKey is missing. Initialization might fail if not using a local server.');
    }

    try {
      return new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: config.modelName,
        configuration: {
          baseURL: config.baseUrl
        },
        temperature: config.temperature ?? 0,
        topP: config.topP ?? 1,
        streaming: true
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new LLMInitializationError(this.name, message);
    }
  }
}
