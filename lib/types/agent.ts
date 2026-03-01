import { createAgent } from 'langchain';
import type { BaseMessage } from '@langchain/core/messages';

export type AgentExecutorType = ReturnType<typeof createAgent>;

export interface ChatRequestMessage {
  message: BaseMessage | Record<string, unknown> | string;
  threadId?: string;
}

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
  agentId: string;
  agentName: string;
  providerId: string;
  modelName: string;
  enabledTools: string[];
  enabledMcpServers: string[];
  disabledMcpTools: string[];
  systemPrompt?: string;
}

/** Default agent identifier used when no specific agent is specified. */
export const DEFAULT_AGENT_ID = 'default';

/** Lightweight tool info returned from MCP server discovery. */
export interface McpToolInfo {
  name: string;
  description: string;
  serverName: string;
}

/** Configuration for a remote MCP server connection. */
export interface McpServerConfig {
  /** Unique identifier */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Server endpoint URL */
  url: string;
  /** Transport type: 'http' = Streamable HTTP (auto-fallback to SSE), 'sse' = SSE only */
  transport: 'sse' | 'http';
  /** Custom HTTP headers (e.g. for authentication) */
  headers: Record<string, string>;
}

/** Result of an MCP server connection test. */
export interface TestResult {
  success: boolean;
  toolCount?: number;
  error?: string;
}

/** Configuration passed to createLangGraphAgent. */
export interface GraphAgentConfig {
  apiKey: string;
  baseUrl?: string;
  modelName: string;
}
