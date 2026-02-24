import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  modelName?: string;
  baseUrl?: string;
  temperature?: number;
}

export class LLMFactory {
  static createModel(config: LLMConfig): BaseChatModel {
    switch (config.provider) {
      case 'openai':
        return new ChatOpenAI({
          apiKey: config.apiKey,
          modelName: config.modelName || 'gpt-4o',
          configuration: {
            baseURL: config.baseUrl
          },
          temperature: config.temperature ?? 0,
          streaming: true
        });
      // Future expansion
      case 'anthropic':
        throw new Error('Anthropic not yet supported');
      case 'google':
        throw new Error('Google not yet supported');
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
}
