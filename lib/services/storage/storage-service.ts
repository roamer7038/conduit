// lib/services/storage/storage-service.ts
/// <reference types="chrome"/>
import { STORAGE_KEYS } from './storage-keys';
import type { LLMConfig } from '@/lib/types/agent';
import type { McpServerConfig } from '@/lib/types/settings';
import { CryptoService } from '../crypto/crypto-service';

export class StorageError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageService {
  // Generic methods
  static async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return (result[key] as T) ?? null;
    } catch (error) {
      console.error(`[StorageService] Failed to get key "${key}":`, error);
      throw new StorageError(`Failed to get ${key}`, error);
    }
  }

  static async set(key: string, value: any): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`[StorageService] Failed to set key "${key}":`, error);
      throw new StorageError(`Failed to set ${key}`, error);
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`[StorageService] Failed to remove key "${key}":`, error);
      throw new StorageError(`Failed to remove ${key}`, error);
    }
  }

  // LLM Configuration
  static async getLLMConfig(): Promise<LLMConfig> {
    try {
      const data = await chrome.storage.local.get([
        STORAGE_KEYS.API_KEY,
        STORAGE_KEYS.BASE_URL,
        STORAGE_KEYS.MODEL_NAME
      ]);

      // APIキーを復号化
      let apiKey = (data[STORAGE_KEYS.API_KEY] as string) || '';
      if (apiKey) {
        apiKey = await CryptoService.decrypt(apiKey);
      }

      return {
        apiKey,
        baseUrl: (data[STORAGE_KEYS.BASE_URL] as string) || undefined,
        modelName: (data[STORAGE_KEYS.MODEL_NAME] as string) || undefined
      };
    } catch (error) {
      console.error('[StorageService] Failed to get LLM config:', error);
      throw new StorageError('Failed to get LLM config', error);
    }
  }

  static async saveLLMConfig(config: Partial<LLMConfig>): Promise<void> {
    try {
      const updates: Record<string, string | undefined> = {};
      if ('apiKey' in config && config.apiKey !== undefined) {
        // APIキーを暗号化
        updates[STORAGE_KEYS.API_KEY] = await CryptoService.encrypt(config.apiKey);
      }
      if ('baseUrl' in config) {
        updates[STORAGE_KEYS.BASE_URL] = config.baseUrl ?? '';
      }
      if ('modelName' in config) {
        updates[STORAGE_KEYS.MODEL_NAME] = config.modelName ?? '';
      }
      await chrome.storage.local.set(updates);
    } catch (error) {
      console.error('[StorageService] Failed to save LLM config:', error);
      throw new StorageError('Failed to save LLM config', error);
    }
  }

  // Thread Management
  static async getLastActiveThreadId(): Promise<string | null> {
    try {
      return this.get<string>(STORAGE_KEYS.LAST_ACTIVE_THREAD_ID);
    } catch (error) {
      console.error('[StorageService] Failed to get last active thread ID:', error);
      throw new StorageError('Failed to get last active thread ID', error);
    }
  }

  static async setLastActiveThreadId(threadId: string): Promise<void> {
    try {
      await this.set(STORAGE_KEYS.LAST_ACTIVE_THREAD_ID, threadId);
    } catch (error) {
      console.error('[StorageService] Failed to set last active thread ID:', error);
      throw new StorageError('Failed to set last active thread ID', error);
    }
  }

  static async removeLastActiveThreadId(): Promise<void> {
    try {
      await this.remove(STORAGE_KEYS.LAST_ACTIVE_THREAD_ID);
    } catch (error) {
      console.error('[StorageService] Failed to remove last active thread ID:', error);
      throw new StorageError('Failed to remove last active thread ID', error);
    }
  }

  // MCP Configuration
  static async getMcpServers(): Promise<McpServerConfig[]> {
    try {
      const servers = await this.get<McpServerConfig[]>(STORAGE_KEYS.MCP_SERVERS);
      if (!servers || servers.length === 0) {
        return [];
      }
      // ヘッダを復号化
      return this.decryptMcpHeaders(servers);
    } catch (error) {
      console.error('[StorageService] Failed to get MCP servers:', error);
      throw new StorageError('Failed to get MCP servers', error);
    }
  }

  static async saveMcpServers(servers: McpServerConfig[]): Promise<void> {
    try {
      // ヘッダを暗号化
      const serversWithEncryptedHeaders = await this.encryptMcpHeaders(servers);
      await this.set(STORAGE_KEYS.MCP_SERVERS, serversWithEncryptedHeaders);
    } catch (error) {
      console.error('[StorageService] Failed to save MCP servers:', error);
      throw new StorageError('Failed to save MCP servers', error);
    }
  }

  // Tool Settings
  static async getEnabledTools(): Promise<string[]> {
    try {
      const tools = await this.get<string[]>(STORAGE_KEYS.ENABLED_TOOLS);
      return tools || [];
    } catch (error) {
      console.error('[StorageService] Failed to get enabled tools:', error);
      throw new StorageError('Failed to get enabled tools', error);
    }
  }

  static async saveEnabledTools(tools: string[]): Promise<void> {
    try {
      await this.set(STORAGE_KEYS.ENABLED_TOOLS, tools);
    } catch (error) {
      console.error('[StorageService] Failed to save enabled tools:', error);
      throw new StorageError('Failed to save enabled tools', error);
    }
  }

  // Screenshot Management
  static async saveScreenshot(threadId: string, dataUrl: string): Promise<void> {
    try {
      // TODO: This has a race condition. Consider using individual keys per screenshot
      // (e.g., screenshots_${threadId}_${timestamp}) to avoid concurrent write issues.
      const key = `${STORAGE_KEYS.SCREENSHOTS_PREFIX}${threadId}`;
      const existing = await this.get<string[]>(key);
      const screenshots = existing || [];
      await this.set(key, [...screenshots, dataUrl]);
    } catch (error) {
      console.error('[StorageService] Failed to save screenshot:', error);
      throw new StorageError('Failed to save screenshot', error);
    }
  }

  static async getScreenshots(threadId: string): Promise<string[]> {
    try {
      const key = `${STORAGE_KEYS.SCREENSHOTS_PREFIX}${threadId}`;
      const screenshots = await this.get<string[]>(key);
      return screenshots || [];
    } catch (error) {
      console.error('[StorageService] Failed to get screenshots:', error);
      throw new StorageError('Failed to get screenshots', error);
    }
  }

  static async removeScreenshots(threadId: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.SCREENSHOTS_PREFIX}${threadId}`;
      await this.remove(key);
    } catch (error) {
      console.error('[StorageService] Failed to remove screenshots:', error);
      throw new StorageError('Failed to remove screenshots', error);
    }
  }

  static async setLastScreenshotDataUrl(dataUrl: string): Promise<void> {
    try {
      await this.set(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL, dataUrl);
    } catch (error) {
      console.error('[StorageService] Failed to set last screenshot data URL:', error);
      throw new StorageError('Failed to set last screenshot data URL', error);
    }
  }

  static async getLastScreenshotDataUrl(): Promise<string | null> {
    try {
      return this.get<string>(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL);
    } catch (error) {
      console.error('[StorageService] Failed to get last screenshot data URL:', error);
      throw new StorageError('Failed to get last screenshot data URL', error);
    }
  }

  static async removeLastScreenshotDataUrl(): Promise<void> {
    try {
      await this.remove(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL);
    } catch (error) {
      console.error('[StorageService] Failed to remove last screenshot data URL:', error);
      throw new StorageError('Failed to remove last screenshot data URL', error);
    }
  }

  // Private helper methods for MCP header encryption
  private static async encryptMcpHeaders(servers: McpServerConfig[]): Promise<McpServerConfig[]> {
    return Promise.all(
      servers.map(async (server) => {
        if (server.headers) {
          const encryptedHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(server.headers)) {
            // 空文字列はそのまま保存
            if (value === '') {
              encryptedHeaders[key] = '';
              continue;
            }
            encryptedHeaders[key] = await CryptoService.encrypt(value);
          }
          return { ...server, headers: encryptedHeaders };
        }
        return server;
      })
    );
  }

  private static async decryptMcpHeaders(servers: McpServerConfig[]): Promise<McpServerConfig[]> {
    return Promise.all(
      servers.map(async (server) => {
        if (server.headers) {
          const decryptedHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(server.headers)) {
            // 空文字列はそのまま
            if (value === '') {
              decryptedHeaders[key] = '';
              continue;
            }
            decryptedHeaders[key] = await CryptoService.decrypt(value);
          }
          return { ...server, headers: decryptedHeaders };
        }
        return server;
      })
    );
  }
}
