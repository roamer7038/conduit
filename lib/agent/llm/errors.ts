export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMInitializationError extends LLMError {
  constructor(provider: string, message: string) {
    super(`Failed to initialize ${provider} provider: ${message}`);
    this.name = 'LLMInitializationError';
  }
}

export class UnsupportedProviderError extends LLMError {
  constructor(provider: string) {
    super(`Unsupported provider: ${provider}`);
    this.name = 'UnsupportedProviderError';
  }
}
