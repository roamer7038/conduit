// lib/services/storage/storage-service.ts
/// <reference types="chrome"/>
import { STORAGE_KEYS } from './storage-keys';
import type { LLMConfig } from '@/lib/types/agent';
import type { McpServerConfig } from '@/lib/types/settings';

export class StorageService {
  // Generic methods
  static async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T) ?? null;
  }

  static async set(key: string, value: any): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }

  static async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }

  // LLM Configuration
  static async getLLMConfig(): Promise<LLMConfig> {
    const data = await chrome.storage.local.get([STORAGE_KEYS.API_KEY, STORAGE_KEYS.BASE_URL, STORAGE_KEYS.MODEL_NAME]);

    return {
      apiKey: (data[STORAGE_KEYS.API_KEY] as string) || '',
      baseUrl: (data[STORAGE_KEYS.BASE_URL] as string) || '',
      modelName: (data[STORAGE_KEYS.MODEL_NAME] as string) || ''
    };
  }

  static async saveLLMConfig(config: Partial<LLMConfig>): Promise<void> {
    const updates: Record<string, any> = {};
    if (config.apiKey !== undefined) updates[STORAGE_KEYS.API_KEY] = config.apiKey;
    if (config.baseUrl !== undefined) updates[STORAGE_KEYS.BASE_URL] = config.baseUrl;
    if (config.modelName !== undefined) updates[STORAGE_KEYS.MODEL_NAME] = config.modelName;
    await chrome.storage.local.set(updates);
  }

  // Thread Management
  static async getLastActiveThreadId(): Promise<string | null> {
    return this.get<string>(STORAGE_KEYS.LAST_ACTIVE_THREAD_ID);
  }

  static async setLastActiveThreadId(threadId: string): Promise<void> {
    await this.set(STORAGE_KEYS.LAST_ACTIVE_THREAD_ID, threadId);
  }

  static async removeLastActiveThreadId(): Promise<void> {
    await this.remove(STORAGE_KEYS.LAST_ACTIVE_THREAD_ID);
  }

  // MCP Configuration
  static async getMcpServers(): Promise<McpServerConfig[]> {
    const servers = await this.get<McpServerConfig[]>(STORAGE_KEYS.MCP_SERVERS);
    return servers || [];
  }

  static async saveMcpServers(servers: McpServerConfig[]): Promise<void> {
    await this.set(STORAGE_KEYS.MCP_SERVERS, servers);
  }

  // Tool Settings
  static async getEnabledTools(): Promise<string[]> {
    const tools = await this.get<string[]>(STORAGE_KEYS.ENABLED_TOOLS);
    return tools || [];
  }

  static async saveEnabledTools(tools: string[]): Promise<void> {
    await this.set(STORAGE_KEYS.ENABLED_TOOLS, tools);
  }

  // Screenshot Management
  static async saveScreenshot(threadId: string, dataUrl: string): Promise<void> {
    const key = `${STORAGE_KEYS.SCREENSHOTS_PREFIX}${threadId}`;
    const existing = await this.get<string[]>(key);
    const screenshots = existing || [];
    await this.set(key, [...screenshots, dataUrl]);
  }

  static async getScreenshots(threadId: string): Promise<string[]> {
    const key = `${STORAGE_KEYS.SCREENSHOTS_PREFIX}${threadId}`;
    const screenshots = await this.get<string[]>(key);
    return screenshots || [];
  }

  static async removeScreenshots(threadId: string): Promise<void> {
    const key = `${STORAGE_KEYS.SCREENSHOTS_PREFIX}${threadId}`;
    await this.remove(key);
  }

  static async setLastScreenshotDataUrl(dataUrl: string): Promise<void> {
    await this.set(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL, dataUrl);
  }

  static async getLastScreenshotDataUrl(): Promise<string | null> {
    return this.get<string>(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL);
  }

  static async removeLastScreenshotDataUrl(): Promise<void> {
    await this.remove(STORAGE_KEYS.LAST_SCREENSHOT_DATA_URL);
  }
}
