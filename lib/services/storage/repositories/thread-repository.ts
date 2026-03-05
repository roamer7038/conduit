import { BaseStorage, StorageError } from '../core/base-storage';
import { STORAGE_KEYS } from '../storage-keys';
import type { IThreadRepository } from '../interfaces';

export const ThreadRepository: IThreadRepository = {
  getLastActiveId: async (): Promise<string | null> => {
    try {
      return await BaseStorage.get<string>(STORAGE_KEYS.LAST_ACTIVE_THREAD_ID);
    } catch (error) {
      throw new StorageError('Failed to get last active thread ID', error);
    }
  },

  setLastActiveId: async (threadId: string): Promise<void> => {
    try {
      await BaseStorage.set(STORAGE_KEYS.LAST_ACTIVE_THREAD_ID, threadId);
    } catch (error) {
      throw new StorageError('Failed to set last active thread ID', error);
    }
  },

  removeLastActiveId: async (): Promise<void> => {
    try {
      await BaseStorage.remove(STORAGE_KEYS.LAST_ACTIVE_THREAD_ID);
    } catch (error) {
      throw new StorageError('Failed to remove last active thread ID', error);
    }
  }
};
