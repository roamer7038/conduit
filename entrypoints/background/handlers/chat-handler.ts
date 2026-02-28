// entrypoints/background/handlers/chat-handler.ts
/// <reference types="chrome"/>
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessageResponse } from '@/lib/types/message';
import { StorageService } from '@/lib/services/storage/storage-service';
import { mapRawMessages } from '@/lib/agent/message-mapper';

export async function handleChatMessage(
  request: { message: any; threadId?: string },
  agentExecutor: any,
  port?: chrome.runtime.Port
): Promise<ChatMessageResponse | void> {
  const { message, threadId } = request;
  const config = { configurable: { thread_id: threadId || uuidv4() } };

  // Save as active thread
  await StorageService.setLastActiveThreadId(config.configurable.thread_id);

  if (port) {
    port.postMessage({ type: 'stream_start', threadId: config.configurable.thread_id });

    try {
      const eventStream = await agentExecutor.streamEvents({ messages: [message] }, { version: 'v2', ...config });

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
      const rawMessages = currentState.values?.messages || [];
      const messages = mapRawMessages(rawMessages);

      const screenshots = await StorageService.getScreenshots(config.configurable.thread_id);

      port.postMessage({
        type: 'stream_end',
        response: {
          response: messages.length > 0 ? messages[messages.length - 1].content : '',
          messages,
          screenshots,
          threadId: config.configurable.thread_id,
          screenshotDataUrl: screenshotDataUrl || undefined
        }
      });
    } catch (error: any) {
      console.error('Streaming error:', error);
      port.postMessage({ type: 'error', error: error.message || 'Stream failed' });
    }
    return;
  }

  // Execute agent (legacy fallback)
  const result = await agentExecutor.invoke({ messages: [message] }, config);

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

  const screenshots = await StorageService.getScreenshots(config.configurable.thread_id);

  return {
    response: lastMessage.content,
    messages,
    screenshots,
    threadId: config.configurable.thread_id,
    screenshotDataUrl: screenshotDataUrl || undefined
  };
}
