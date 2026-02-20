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
}
