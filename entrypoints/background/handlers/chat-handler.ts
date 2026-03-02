// entrypoints/background/handlers/chat-handler.ts
/// <reference types="chrome"/>
import { v4 as uuidv4 } from 'uuid';
import { SystemMessage } from '@langchain/core/messages';
import type { ChatMessageResponse } from '@/lib/types/message';
import type { ThreadTokenUsage } from '@/lib/types/message';
import { StorageService } from '@/lib/services/storage/storage-service';
import { mapRawMessages } from '@/lib/agent/message-mapper';
import type { MappedMessage } from '@/lib/agent/message-mapper';
import type { AgentExecutorType, ChatRequestMessage } from '@/lib/types/agent';

const DEFAULT_RECURSION_LIMIT = 100;

/**
 * Extracts and sums token usage from all AI messages in the thread.
 */
function getCumulativeTokenUsage(messages: MappedMessage[]): ThreadTokenUsage {
  const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  for (const msg of messages) {
    if (msg.type === 'ai' && msg.usage_metadata) {
      usage.inputTokens += msg.usage_metadata.input_tokens;
      usage.outputTokens += msg.usage_metadata.output_tokens;
      usage.totalTokens += msg.usage_metadata.total_tokens;
    }
  }

  return usage;
}

export async function handleChatMessage(
  request: ChatRequestMessage,
  agentExecutor: AgentExecutorType,
  port?: chrome.runtime.Port
): Promise<ChatMessageResponse | void> {
  const { message, threadId } = request;
  const config = { configurable: { thread_id: threadId || uuidv4() } };

  // Load recursionLimit from agent settings
  const agentSettings = await StorageService.getActiveAgentConfig();
  const recursionLimit = agentSettings?.recursionLimit || DEFAULT_RECURSION_LIMIT;

  // Save as active thread
  await StorageService.setLastActiveThreadId(config.configurable.thread_id);

  if (port) {
    port.postMessage({ type: 'stream_start', threadId: config.configurable.thread_id });

    try {
      const eventStream = await agentExecutor.streamEvents(
        { messages: [message] },
        { version: 'v2', recursionLimit, ...config }
      );

      for await (const { event, name, data } of eventStream) {
        if (event === 'on_chat_model_stream' && data.chunk) {
          port.postMessage({
            type: 'stream_chunk',
            chunk: {
              content: data.chunk.content || '',
              tool_call_chunks: data.chunk.tool_call_chunks || [],
              additional_kwargs: data.chunk.additional_kwargs || {}
            }
          });
        } else if (event === 'on_tool_start') {
          port.postMessage({
            type: 'tool_start',
            name: name,
            input: data.input
          });
        } else if (event === 'on_tool_end') {
          port.postMessage({
            type: 'tool_end',
            name: name,
            output: data.output
          });
        }
      }

      // Retrieve screenshot data URL if captured during this turn
      const screenshotDataUrl = await StorageService.getLastScreenshotDataUrl();
      if (screenshotDataUrl) {
        // Save screenshot to thread
        await StorageService.saveScreenshot(config.configurable.thread_id, screenshotDataUrl);
        await StorageService.removeLastScreenshotDataUrl();
      }

      // We need the final state to return everything structured properly.
      const currentState = await agentExecutor.getState(config);
      const stateValues = (currentState as Record<string, unknown>).values || {};
      const rawMessages = (stateValues as Record<string, unknown>).messages || [];
      const messages = mapRawMessages(rawMessages as unknown[]);
      const totalUsage = getCumulativeTokenUsage(messages);

      const screenshots = await StorageService.getScreenshots(config.configurable.thread_id);

      port.postMessage({
        type: 'stream_end',
        response: {
          response: messages.length > 0 ? messages[messages.length - 1].content : '',
          messages,
          screenshots,
          threadId: config.configurable.thread_id,
          screenshotDataUrl: screenshotDataUrl || undefined,
          totalUsage
        }
      });
    } catch (error: unknown) {
      const errorMessage = (error instanceof Error ? error.message : String(error)) || 'Stream failed';
      console.error('Streaming error:', error);
      port.postMessage({ type: 'error', error: errorMessage });
      try {
        await agentExecutor.updateState(config, {
          messages: [new SystemMessage({ content: `[Error] ${errorMessage}` })]
        });
      } catch (e) {
        console.error('Failed to update state with error:', e);
      }
    }
    return;
  }

  // Execute agent (legacy fallback)
  const result = await agentExecutor.invoke({ messages: [message] }, { recursionLimit, ...config });

  // Get last message
  const lastMessage = result.messages[result.messages.length - 1];

  // Retrieve screenshot data URL if captured during this turn
  const screenshotDataUrl = await StorageService.getLastScreenshotDataUrl();
  if (screenshotDataUrl) {
    // Save screenshot to thread
    await StorageService.saveScreenshot(config.configurable.thread_id, screenshotDataUrl);
    await StorageService.removeLastScreenshotDataUrl();
  }

  // Generate mapped messages
  const rawMessages = result.messages || [];
  const messages = mapRawMessages(rawMessages);
  const totalUsage = getCumulativeTokenUsage(messages);

  const screenshots = await StorageService.getScreenshots(config.configurable.thread_id);

  return {
    response: lastMessage.content,
    messages,
    screenshots,
    threadId: config.configurable.thread_id,
    screenshotDataUrl: screenshotDataUrl || undefined,
    totalUsage
  };
}
