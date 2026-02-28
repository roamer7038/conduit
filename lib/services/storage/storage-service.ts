// lib/services/storage/storage-service.ts
/// <reference types="chrome"/>
import { STORAGE_KEYS } from './storage-keys';
import type { LlmProviderConfig, AgentSettingsConfig } from '@/lib/types/agent';
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

  // LLM Providers
  static async getLlmProviders(): Promise<LlmProviderConfig[]> {
    try {
      const data = await this.get<LlmProviderConfig[]>(STORAGE_KEYS.LLM_PROVIDERS);
      if (!data) return [];

      // Decrypt apiKeys
      return Promise.all(
        data.map(async (provider) => {
          if (provider.apiKey) {
            const decryptedKey = await CryptoService.decrypt(provider.apiKey);
            return { ...provider, apiKey: decryptedKey };
          }
          return provider;
        })
      );
    } catch (error) {
      console.error('[StorageService] Failed to get LLM providers:', error);
      throw new StorageError('Failed to get LLM providers', error);
    }
  }

  static async saveLlmProviders(providers: LlmProviderConfig[]): Promise<void> {
    try {
      // Encrypt apiKeys
      const encryptedProviders = await Promise.all(
        providers.map(async (provider) => {
          if (provider.apiKey) {
            const encryptedKey = await CryptoService.encrypt(provider.apiKey);
            return { ...provider, apiKey: encryptedKey };
          }
          return provider;
        })
      );
      await this.set(STORAGE_KEYS.LLM_PROVIDERS, encryptedProviders);
    } catch (error) {
      console.error('[StorageService] Failed to save LLM providers:', error);
      throw new StorageError('Failed to save LLM providers', error);
    }
  }

  // Agent Settings Configuration
  static async getAgentConfig(): Promise<AgentSettingsConfig | null> {
    try {
      const config = await this.get<AgentSettingsConfig>(STORAGE_KEYS.AGENT_CONFIG);
      return config || null;
    } catch (error) {
      console.error('[StorageService] Failed to get Agent Config:', error);
      throw new StorageError('Failed to get Agent Config', error);
    }
  }

  static async saveAgentConfig(config: AgentSettingsConfig): Promise<void> {
    try {
      await this.set(STORAGE_KEYS.AGENT_CONFIG, config);
    } catch (error) {
      console.error('[StorageService] Failed to save Agent Config:', error);
      throw new StorageError('Failed to save Agent Config', error);
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
