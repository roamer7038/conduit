import { v4 as uuidv4 } from 'uuid';
import { BaseStorage, StorageError } from '../core/base-storage';
import { STORAGE_KEYS } from '../storage-keys';
import type { IScreenshotRepository } from '../interfaces';

const SCREENSHOT_ITEM_PREFIX = `${STORAGE_KEYS.SCREENSHOTS_PREFIX}item_`;

export const ScreenshotRepository: IScreenshotRepository = {
  saveForThread: async (threadId: string, dataUrl: string): Promise<void> => {
    try {
      const screenshotId = uuidv4();
      const key = `${SCREENSHOT_ITEM_PREFIX}${threadId}_${Date.now()}_${screenshotId}`;
      await BaseStorage.set(key, dataUrl);
    } catch (error) {
      throw new StorageError('Failed to save screenshot', error);
    }
  },

  getForThread: async (threadId: string): Promise<string[]> => {
    try {
      const allData = await chrome.storage.local.get(null);
      const targetPrefix = `${SCREENSHOT_ITEM_PREFIX}${threadId}_`;

      const matches = Object.entries(allData)
        .filter(([key]) => key.startsWith(targetPrefix))
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([, dataUrl]) => dataUrl as string);

      return matches;
    } catch (error) {
      throw new StorageError('Failed to get screenshots', error);
    }
  },

  removeForThread: async (threadId: string): Promise<void> => {
    try {
      const allData = await chrome.storage.local.get(null);
      const targetPrefix = `${SCREENSHOT_ITEM_PREFIX}${threadId}_`;

      const keysToRemove = Object.keys(allData).filter((key) => key.startsWith(targetPrefix));

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }

      await BaseStorage.remove(`${STORAGE_KEYS.SCREENSHOTS_PREFIX}${threadId}`);
    } catch (error) {
      throw new StorageError('Failed to remove screenshots', error);
    }
  },

  cleanupOrphaned: async (activeThreadIds: string[]): Promise<void> => {
    try {
      const allData = await chrome.storage.local.get(null);
      const allKeys = Object.keys(allData);
      const keysToRemove: string[] = [];

      for (const key of allKeys) {
        if (key.startsWith(SCREENSHOT_ITEM_PREFIX)) {
          const parts = key.split('_');
          if (parts.length > 2) {
            const threadId = parts[2];
            if (threadId && !activeThreadIds.includes(threadId)) {
              keysToRemove.push(key);
            }
          }
        } else if (key.startsWith(STORAGE_KEYS.SCREENSHOTS_PREFIX) && !key.startsWith(SCREENSHOT_ITEM_PREFIX)) {
          const threadId = key.replace(STORAGE_KEYS.SCREENSHOTS_PREFIX, '');
          if (threadId && !activeThreadIds.includes(threadId)) {
            keysToRemove.push(key);
          }
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
    } catch (error) {
      throw new StorageError('Failed to cleanup orphaned screenshots', error);
    }
  },

  setLastDataUrl: async (dataUrl: string): Promise<void> => {
    try {
      await BaseStorage.set(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL, dataUrl);
    } catch (error) {
      throw new StorageError('Failed to set last screenshot data URL', error);
    }
  },

  getLastDataUrl: async (): Promise<string | null> => {
    try {
      return await BaseStorage.get<string>(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL);
    } catch (error) {
      throw new StorageError('Failed to get last screenshot data URL', error);
    }
  },

  removeLastDataUrl: async (): Promise<void> => {
    try {
      await BaseStorage.remove(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL);
    } catch (error) {
      throw new StorageError('Failed to remove last screenshot data URL', error);
    }
  }
};
