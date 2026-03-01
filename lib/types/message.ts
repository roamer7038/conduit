// lib/types/message.ts

/** Per-message token usage from LangChain's usage_metadata. */
export interface TokenUsageMetadata {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

/** Aggregated token usage for an entire thread. */
export interface ThreadTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'error' | 'tool' | 'reasoning';
  content: string;
  type?: 'text' | 'image' | 'tool_call' | 'tool_result' | 'reasoning';
  name?: string;
  usageMetadata?: TokenUsageMetadata;
}

export interface Thread {
  id: string;
  updatedAt: number;
  preview: string;
}

export interface ThreadHistory {
  messages: unknown[];
  screenshots: string[];
  totalUsage?: ThreadTokenUsage;
}

export interface ChatMessageResponse {
  response: string;
  threadId: string;
  screenshotDataUrl?: string;
  messages?: unknown[];
  screenshots?: string[];
  totalUsage?: ThreadTokenUsage;
}
