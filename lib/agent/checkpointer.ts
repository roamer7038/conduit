/// <reference types="chrome"/>
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  Checkpoint,
  CheckpointMetadata,
  CheckpointTuple,
  CheckpointListOptions,
  ChannelVersions,
  PendingWrite
} from '@langchain/langgraph-checkpoint';

export class ChromeStorageCheckpointer extends BaseCheckpointSaver {
  constructor() {
    super();
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return undefined;

    const key = `checkpoint:${threadId}`;
    const result = await chrome.storage.local.get(key);
    const stored = result[key] as any;

    if (!stored) return undefined;

    return {
      config,
      checkpoint: stored.checkpoint,
      metadata: stored.metadata,
      parentConfig: stored.parentConfig,
      pendingWrites: stored.pendingWrites
    };
  }

  async *list(config: RunnableConfig, options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;

    const tuple = await this.getTuple(config);
    if (tuple) {
      yield tuple;
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    const key = `checkpoint:${threadId}`;
    await chrome.storage.local.set({
      [key]: {
        checkpoint,
        metadata,
        parentConfig: config // Store parent config to restore context
        // New versions are implicitly part of checkpoint
      }
    });

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_id: checkpoint.id
      }
    };
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    // Optional: Implement if needed for advanced features
    // For now, no-op to satisfy abstract method
  }

  async deleteThread(threadId: string): Promise<void> {
    const key = `checkpoint:${threadId}`;
    await chrome.storage.local.remove(key);
  }

  async getAllThreads(): Promise<{ id: string; updatedAt: number; preview: string }[]> {
    const allData = await chrome.storage.local.get(null);
    const threads: { id: string; updatedAt: number; preview: string }[] = [];

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('checkpoint:')) {
        const threadId = key.replace('checkpoint:', '');
        const data = value as any;
        // Try to get the last message preview and timestamp
        // This depends on how the checkpoint stores state.
        // We'll try to extract it from the checkpoint data if possible,
        // or just use a default.
        // LangGraph snapshots usually have .ts (timestamp)

        let preview = 'No messages';
        // Attempt to find the last human or ai message in the checkpoint state
        // This is a simplification; actual state structure depends strictly on the graph definition.
        // Assuming 'messages' key in state.
        const messages = data.checkpoint?.channel_values?.messages;
        if (Array.isArray(messages) && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          if (typeof lastMsg.content === 'string') {
            preview = lastMsg.content;
          } else if (Array.isArray(lastMsg.content)) {
            preview = lastMsg.content.map((c: any) => c.text || '').join('');
          }
        }

        threads.push({
          id: threadId,
          updatedAt: data.checkpoint?.ts ? new Date(data.checkpoint.ts).getTime() : Date.now(),
          preview: preview.slice(0, 100) + (preview.length > 100 ? '...' : '')
        });
      }
    }

    return threads.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
