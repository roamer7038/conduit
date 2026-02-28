// lib/types/agent.ts
export interface AgentConfig {
  apiKey: string;
  baseUrl?: string;
  modelName?: string;
}

export interface LlmProviderConfig {
  id: string; // e.g. "openai", "openrouter", "ollama", or a custom UUID
  name: string; // User-facing name
  providerType: 'openai' | 'openai-compatible' | string;
  baseUrl?: string;
  apiKey: string;
}

export interface AgentSettingsConfig {
  providerId: string;
  modelName: string;
  enabledTools: string[];
  enabledMcpServers: string[];
  disabledMcpTools: string[];
  systemPrompt?: string;
}

/** Lightweight tool info returned from MCP server discovery. */
export interface McpToolInfo {
  name: string;
  description: string;
  serverName: string;
}
