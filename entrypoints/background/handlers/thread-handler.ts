// entrypoints/background/handlers/thread-handler.ts
/// <reference types="chrome"/>
import { ChromeStorageCheckpointer } from '@/lib/agent/checkpointer';
import { StorageService } from '@/lib/services/storage/storage-service';
import { mapRawMessages } from '@/lib/agent/message-mapper';
import type { MappedMessage } from '@/lib/agent/message-mapper';
import type { Thread, ThreadHistory } from '@/lib/types/message';
import type { AgentExecutorType } from '@/lib/types/agent';

export async function handleGetThreads(): Promise<{ threads: Thread[] }> {
  const checkpointer = new ChromeStorageCheckpointer();
  const threads = await checkpointer.getAllThreads();
  return { threads };
}

export async function handleGetThreadHistory(
  threadId: string,
  agentExecutor: AgentExecutorType
): Promise<ThreadHistory> {
  const config = { configurable: { thread_id: threadId } };
  const state = await agentExecutor.getState(config);

  // Extract messages from state safely as ReturnType<createAgent> might obscure the values property.
  const stateValues = (state as Record<string, unknown>).values || {};
  const rawMessages = ((stateValues as Record<string, unknown>).messages || []) as unknown[];
  const messages = mapRawMessages(rawMessages);

  // Extract token usage from the latest AI message
  let totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as MappedMessage;
    if (msg.type === 'ai' && msg.usage_metadata) {
      totalUsage = {
        inputTokens: msg.usage_metadata.input_tokens,
        outputTokens: msg.usage_metadata.output_tokens,
        totalTokens: msg.usage_metadata.total_tokens
      };
      break;
    }
  }

  // Get screenshots for this thread
  const screenshots = await StorageService.getScreenshots(threadId);

  return { messages, screenshots, totalUsage };
}

export async function handleDeleteThread(threadId: string): Promise<{ success: true }> {
  const checkpointer = new ChromeStorageCheckpointer();
  await checkpointer.deleteThread(threadId);

  // If deleting active thread, clear it
  const lastActiveThreadId = await StorageService.getLastActiveThreadId();
  if (lastActiveThreadId === threadId) {
    await StorageService.removeLastActiveThreadId();
  }

  // Remove screenshots
  await StorageService.removeScreenshots(threadId);

  return { success: true };
}
