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
  tool_calls: any[];
  additional_kwargs: Record<string, any>;
}

/**
 * Converts raw LangChain messages into a serializable format.
 *
 * This was previously duplicated across chat-handler.ts and thread-handler.ts.
 */
export function mapRawMessages(rawMessages: any[]): MappedMessage[] {
  return rawMessages.map((m: any) => ({
    type: (typeof m.getType === 'function' ? m.getType() : m.type) || (m.id?.includes('Human') ? 'human' : 'ai'),
    content: m.content,
    id: m.id,
    name: m.name,
    tool_calls: m.tool_calls || [],
    additional_kwargs: m.additional_kwargs || {}
  }));
}
