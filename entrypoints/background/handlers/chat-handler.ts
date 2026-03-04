// entrypoints/background/handlers/chat-handler.ts
/// <reference types="chrome"/>
import { v4 as uuidv4 } from 'uuid';
import { SystemMessage } from '@langchain/core/messages';
import type { ChatMessageResponse } from '@/lib/types/message';
import type { ThreadTokenUsage } from '@/lib/types/message';
import { AgentConfigRepository } from '@/lib/services/storage/repositories/agent-config-repository';
import { ThreadRepository } from '@/lib/services/storage/repositories/thread-repository';
import { ScreenshotRepository } from '@/lib/services/storage/repositories/screenshot-repository';
import { mapRawMessages } from '@/lib/agent/message-mapper';
import type { MappedMessage } from '@/lib/agent/message-mapper';
import type { AgentExecutorType, ChatRequestMessage } from '@/lib/types/agent';

export const activeStreams = new Map<string, { abortController: AbortController; port: chrome.runtime.Port | null }>();

const DEFAULT_RECURSION_LIMIT = 100;

/**
 * Extracts token usage from the latest AI message in the thread.
 */
function getLatestTokenUsage(messages: MappedMessage[]): ThreadTokenUsage {
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

export async function handleChatMessage(
  request: ChatRequestMessage,
  agentExecutor: AgentExecutorType,
  port?: chrome.runtime.Port
): Promise<ChatMessageResponse | void> {
  const { message, threadId } = request;
  const config = { configurable: { thread_id: threadId || uuidv4() } };
  const actualThreadId = config.configurable.thread_id;

  // Load recursionLimit from agent settings
  const agentSettings = await AgentConfigRepository.getActiveConfig();
  const recursionLimit = agentSettings?.recursionLimit || DEFAULT_RECURSION_LIMIT;

  // Update last active thread ID globally
  if (actualThreadId) {
    await ThreadRepository.setLastActiveId(actualThreadId);
  }

  if (port) {
    const abortController = new AbortController();
    activeStreams.set(actualThreadId, { abortController, port });

    const getActivePort = () => activeStreams.get(actualThreadId)?.port;

    getActivePort()?.postMessage({ type: 'stream_start', threadId: actualThreadId });

    try {
      const eventStream = await agentExecutor.streamEvents(
        { messages: [message] },
        { version: 'v2', recursionLimit, signal: abortController.signal, ...config }
      );

      for await (const { event, name, data } of eventStream) {
        if (event === 'on_chain_start' && name) {
          console.group(`[LangGraph Step] 🟢 Node Start: ${name}`);
        } else if (event === 'on_chain_end' && name) {
          console.log(`[LangGraph Step] 🔴 Node End: ${name}`);
          console.groupEnd();
        } else if (event === 'on_chat_model_stream' && data.chunk) {
          getActivePort()?.postMessage({
            type: 'stream_chunk',
            chunk: {
              content: data.chunk.content || '',
              tool_call_chunks: data.chunk.tool_call_chunks || [],
              additional_kwargs: data.chunk.additional_kwargs || {}
            }
          });
        } else if (event === 'on_tool_start') {
          console.log(`[LangGraph Step] 🛠️ Tool Start: ${name}`, data.input);
          getActivePort()?.postMessage({
            type: 'tool_start',
            name: name,
            input: data.input
          });
        } else if (event === 'on_tool_end') {
          console.log(`[LangGraph Step] ✅ Tool End: ${name}`);
          getActivePort()?.postMessage({
            type: 'tool_end',
            name: name,
            output: data.output
          });
        }
      }

      // Retrieve screenshot data URL if captured during this turn
      const screenshotDataUrl = await ScreenshotRepository.getLastDataUrl();
      if (screenshotDataUrl && actualThreadId) {
        // Create context attachment format
        await ScreenshotRepository.saveForThread(actualThreadId, screenshotDataUrl);
        await ScreenshotRepository.removeLastDataUrl();
      }

      // We need the final state to return everything structured properly.
      const currentState = await agentExecutor.getState(config);
      const stateValues = (currentState as Record<string, unknown>).values || {};
      const rawMessages = (stateValues as Record<string, unknown>).messages || [];
      const messages = mapRawMessages(rawMessages as unknown[]);
      const totalUsage = getLatestTokenUsage(messages);

      const screenshots = await ScreenshotRepository.getForThread(actualThreadId);

      getActivePort()?.postMessage({
        type: 'stream_end',
        response: {
          response: messages.length > 0 ? messages[messages.length - 1].content : '',
          messages,
          screenshots,
          threadId: actualThreadId,
          totalUsage
        }
      });
    } catch (error: unknown) {
      if ((error as any).name === 'AbortError') {
        console.log('Stream aborted by user');
        getActivePort()?.postMessage({ type: 'stream_abort' });
      } else {
        const errorMessage = (error instanceof Error ? error.message : String(error)) || 'Stream failed';
        console.error('Streaming error:', error);
        getActivePort()?.postMessage({ type: 'error', error: errorMessage });
        try {
          await agentExecutor.updateState(config, {
            messages: [new SystemMessage({ content: `[Error] ${errorMessage}` })]
          });
        } catch (e) {
          console.error('Failed to update state with error:', e);
        }
      }
    } finally {
      activeStreams.delete(actualThreadId);
    }
    return;
  }

  // Execute agent (legacy fallback)
  const result = await agentExecutor.invoke({ messages: [message] }, { recursionLimit, ...config });

  // Get last message
  const lastMessage = result.messages[result.messages.length - 1];

  // Retrieve screenshot data URL if captured during this turn
  const screenshotDataUrl = await ScreenshotRepository.getLastDataUrl();
  let screenshotsToProcess: string[] = [];
  if (screenshotDataUrl) {
    await ScreenshotRepository.saveForThread(actualThreadId, screenshotDataUrl);
    await ScreenshotRepository.removeLastDataUrl();
  }

  // Generate mapped messages
  const rawMessages = result.messages || [];
  const messages = mapRawMessages(rawMessages);
  const totalUsage = getLatestTokenUsage(messages);

  const screenshots = await ScreenshotRepository.getForThread(actualThreadId);

  return {
    response: lastMessage.content,
    messages,
    screenshots,
    threadId: actualThreadId,
    totalUsage
  };
}
