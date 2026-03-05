import type { MappedMessage } from './message-mapper';
import type { ThreadTokenUsage } from '../types/message';
/**
 * Extracts sequence token usage from the latest AI message in the thread.
 */
export function getLatestTokenUsage(messages: MappedMessage[]): ThreadTokenUsage {
  const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.type === 'ai' && msg.usage_metadata) {
      usage.inputTokens = msg.usage_metadata.input_tokens;
      usage.outputTokens = msg.usage_metadata.output_tokens;
      usage.totalTokens = msg.usage_metadata.total_tokens;
      break;
    }
  }

  return usage;
}
