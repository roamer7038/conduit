// entrypoints/background/handlers/thread-handler.ts
/// <reference types="chrome"/>
import { ChromeStorageCheckpointer } from '@/lib/agent/checkpointer';
import { StorageService } from '@/lib/services/storage/storage-service';
import type { Thread, ThreadHistory } from '@/lib/types/message';

export async function handleGetThreads(): Promise<{ threads: Thread[] }> {
  const checkpointer = new ChromeStorageCheckpointer();
  const threads = await checkpointer.getAllThreads();
  return { threads };
}

export async function handleGetThreadHistory(threadId: string, agentExecutor: any): Promise<ThreadHistory> {
  const config = { configurable: { thread_id: threadId } };
  const state = await agentExecutor.getState(config);

  // Extract messages from state
  const rawMessages = state.values.messages || [];
  const messages = rawMessages.map((m: any) => ({
    type: (typeof m.getType === 'function' ? m.getType() : m.type) || (m.id?.includes('Human') ? 'human' : 'ai'),
    content: m.content,
    id: m.id,
    name: m.name,
    tool_calls: m.tool_calls || [],
    additional_kwargs: m.additional_kwargs || {}
  }));

  // Get screenshots for this thread
  const screenshots = await StorageService.getScreenshots(threadId);

  return { messages, screenshots };
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
