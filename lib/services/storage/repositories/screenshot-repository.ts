import { v4 as uuidv4 } from 'uuid';
import { BaseStorage, StorageError } from '../core/base-storage';
import { STORAGE_KEYS } from '../storage-keys';

export class ScreenshotRepository {
  /** Prefix for individual screenshot items */
  private static readonly SCREENSHOT_ITEM_PREFIX = `${STORAGE_KEYS.SCREENSHOTS_PREFIX}item_`;

  static async saveForThread(threadId: string, dataUrl: string): Promise<void> {
    try {
      // Save each screenshot under a unique key containing the threadId
      const screenshotId = uuidv4();
      const key = `${ScreenshotRepository.SCREENSHOT_ITEM_PREFIX}${threadId}_${Date.now()}_${screenshotId}`;
      await BaseStorage.set(key, dataUrl);
    } catch (error) {
      throw new StorageError('Failed to save screenshot', error);
    }
  }

  static async getForThread(threadId: string): Promise<string[]> {
    try {
      // Retrieve all keys
      const allData = await chrome.storage.local.get(null);
      const targetPrefix = `${ScreenshotRepository.SCREENSHOT_ITEM_PREFIX}${threadId}_`;

      const matches = Object.entries(allData)
        .filter(([key]) => key.startsWith(targetPrefix))
        // Sort by key name which contains the timestamp, ensuring chronological order
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([, dataUrl]) => dataUrl as string);

      return matches;
    } catch (error) {
      throw new StorageError('Failed to get screenshots', error);
    }
  }

  static async removeForThread(threadId: string): Promise<void> {
    try {
      const allData = await chrome.storage.local.get(null);
      const targetPrefix = `${ScreenshotRepository.SCREENSHOT_ITEM_PREFIX}${threadId}_`;

      const keysToRemove = Object.keys(allData).filter((key) => key.startsWith(targetPrefix));

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }

      // Also attempt to remove from legacy array format if it existed
      await BaseStorage.remove(`${STORAGE_KEYS.SCREENSHOTS_PREFIX}${threadId}`);
    } catch (error) {
      throw new StorageError('Failed to remove screenshots', error);
    }
  }

  static async cleanupOrphaned(activeThreadIds: string[]): Promise<void> {
    try {
      const allData = await chrome.storage.local.get(null);
      const allKeys = Object.keys(allData);
      const keysToRemove: string[] = [];

      for (const key of allKeys) {
        // Individual screenshot items
        if (key.startsWith(ScreenshotRepository.SCREENSHOT_ITEM_PREFIX)) {
          const parts = key.split('_');
          // The threadId is expected to be the second part after the prefix, e.g., "screenshots_item_threadId_timestamp_uuid"
          // So, parts[1] would be "item", parts[2] would be "threadId"
          // Let's adjust the parsing based on the actual key format:
          // SCREENSHOT_ITEM_PREFIX is "screenshots_item_"
          // Key format: "screenshots_item_threadId_timestamp_uuid"
          // So, after splitting by '_', the threadId should be at index 2 if the prefix itself contains one underscore,
          // or index 1 if the prefix is just "screenshots_item" and the first underscore is after that.
          // Given `SCREENSHOT_ITEM_PREFIX` is `STORAGE_KEYS.SCREENSHOTS_PREFIX}item_`, which is `screenshots_item_`,
          // and the key is `${ScreenshotRepository.SCREENSHOT_ITEM_PREFIX}${threadId}_${Date.now()}_${screenshotId}`,
          // a key would look like `screenshots_item_threadId_1678901234567_uuid`.
          // Splitting by '_' would give: ["screenshots", "item", "threadId", "1678901234567", "uuid"]
          // So, the threadId is at index 2.
          if (parts.length > 2) {
            // Ensure there are enough parts
            const threadId = parts[2];
            if (threadId && !activeThreadIds.includes(threadId)) {
              keysToRemove.push(key);
            }
          }
        }
        // Legacy array screenshots
        else if (
          key.startsWith(STORAGE_KEYS.SCREENSHOTS_PREFIX) &&
          !key.startsWith(ScreenshotRepository.SCREENSHOT_ITEM_PREFIX)
        ) {
          // This handles keys like "screenshots_threadId"
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
  }

  static async setLastDataUrl(dataUrl: string): Promise<void> {
    try {
      await BaseStorage.set(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL, dataUrl);
    } catch (error) {
      throw new StorageError('Failed to set last screenshot data URL', error);
    }
  }

  static async getLastDataUrl(): Promise<string | null> {
    try {
      return await BaseStorage.get<string>(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL);
    } catch (error) {
      throw new StorageError('Failed to get last screenshot data URL', error);
    }
  }

  static async removeLastDataUrl(): Promise<void> {
    try {
      await BaseStorage.remove(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL);
    } catch (error) {
      throw new StorageError('Failed to remove last screenshot data URL', error);
    }
  }
}
