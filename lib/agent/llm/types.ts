export interface LLMConfig {
  provider: 'openai' | 'openai-compatible' | 'ollama' | 'anthropic' | 'google' | string;
  apiKey: string;
  modelName?: string;
  baseUrl?: string;
  temperature?: number;
  topP?: number;
}
