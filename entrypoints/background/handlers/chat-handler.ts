// entrypoints/background/handlers/chat-handler.ts
/// <reference types="chrome"/>
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessageResponse } from '@/lib/types/message';
import { StorageService } from '@/lib/services/storage/storage-service';

export async function handleChatMessage(
  request: { message: any; threadId?: string },
  agentExecutor: any
): Promise<ChatMessageResponse> {
  const { message, threadId } = request;
  const config = { configurable: { thread_id: threadId || uuidv4() } };

  // Save as active thread
  await StorageService.setLastActiveThreadId(config.configurable.thread_id);

  // Execute agent
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
  const messages = rawMessages.map((m: any) => ({
    type: (typeof m.getType === 'function' ? m.getType() : m.type) || (m.id?.includes('Human') ? 'human' : 'ai'),
    content: m.content,
    id: m.id,
    name: m.name,
    tool_calls: m.tool_calls || [],
    additional_kwargs: m.additional_kwargs || {}
  }));

  const screenshots = await StorageService.getScreenshots(config.configurable.thread_id);

  return {
    response: lastMessage.content,
    messages,
    screenshots,
    threadId: config.configurable.thread_id,
    screenshotDataUrl: screenshotDataUrl || undefined
  };
}
