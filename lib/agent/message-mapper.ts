// lib/agent/message-mapper.ts

/**
 * Mapped message structure used by background handlers.
 * Represents a LangChain message in a serializable format
 * suitable for sending over Chrome messaging.
 */
export interface MappedMessage {
  type: string;
  content: string;
  id?: string;
  name?: string;
  tool_calls: unknown[];
  additional_kwargs: Record<string, unknown>;
  usage_metadata?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * Converts raw LangChain messages into a serializable format.
 *
 * This was previously duplicated across chat-handler.ts and thread-handler.ts.
 */
export function mapRawMessages(rawMessages: unknown[]): MappedMessage[] {
  return (rawMessages as Record<string, unknown>[]).map((m) => {
    const getType = m.getType;
    const type =
      (typeof getType === 'function' ? (getType as () => string)() : m.type) ||
      (m.id?.toString().includes('Human') ? 'human' : 'ai');
    return {
      type: type as string,
      content: m.content as string,
      id: m.id as string | undefined,
      name: m.name as string | undefined,
      tool_calls: (m.tool_calls as unknown[]) || [],
      additional_kwargs: (m.additional_kwargs as Record<string, unknown>) || {},
      usage_metadata: m.usage_metadata as MappedMessage['usage_metadata'] | undefined
    };
  });
}
