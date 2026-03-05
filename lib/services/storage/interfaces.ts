import type { AgentSettingsConfig, McpServerConfig } from '@/lib/types/agent';

export interface IThreadRepository {
  getLastActiveId(): Promise<string | null>;
  setLastActiveId(threadId: string): Promise<void>;
  removeLastActiveId(): Promise<void>;
}

export interface IAgentConfigRepository {
  getAll(): Promise<AgentSettingsConfig[]>;
  getById(agentId: string): Promise<AgentSettingsConfig | null>;
  getActiveId(): Promise<string | null>;
  setActiveId(agentId: string): Promise<void>;
  getActiveConfig(): Promise<AgentSettingsConfig | null>;
  save(config: AgentSettingsConfig): Promise<void>;
  delete(agentId: string): Promise<void>;
}

export interface IMcpServerRepository {
  getAll(): Promise<McpServerConfig[]>;
  saveAll(servers: McpServerConfig[]): Promise<void>;
}

export interface IScreenshotRepository {
  saveForThread(threadId: string, dataUrl: string): Promise<void>;
  getForThread(threadId: string): Promise<string[]>;
  removeForThread(threadId: string): Promise<void>;
  cleanupOrphaned(activeThreadIds: string[]): Promise<void>;
  setLastDataUrl(dataUrl: string): Promise<void>;
  getLastDataUrl(): Promise<string | null>;
  removeLastDataUrl(): Promise<void>;
}
