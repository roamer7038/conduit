/// <reference types="chrome"/>

export class StorageError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class BaseStorage {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return (result[key] as T) ?? null;
    } catch (error) {
      console.error(`[BaseStorage] Failed to get key "${key}":`, error);
      throw new StorageError(`Failed to get ${key}`, error);
    }
  }

  static async set(key: string, value: any): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`[BaseStorage] Failed to set key "${key}":`, error);
      throw new StorageError(`Failed to set ${key}`, error);
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`[BaseStorage] Failed to remove key "${key}":`, error);
      throw new StorageError(`Failed to remove ${key}`, error);
    }
  }
}
