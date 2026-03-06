import { z } from 'zod';

// Token Usage Schemas
export const TokenUsageMetadataSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  total_tokens: z.number()
});

export const ThreadTokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number()
});

// Message Schema
export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'error', 'tool', 'reasoning', 'system']),
  content: z.string(),
  type: z.enum(['text', 'image', 'tool_call', 'tool_result', 'reasoning', 'system']).optional(),
  name: z.string().optional(),
  usageMetadata: TokenUsageMetadataSchema.optional()
});
