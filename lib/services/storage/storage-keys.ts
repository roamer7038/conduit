// lib/services/storage/storage-keys.ts
export const STORAGE_KEYS = {
  // Providers and Agent Config
  LLM_PROVIDERS: 'llmProviders',
  AGENT_CONFIG: 'agentConfig',

  // Thread Management
  LAST_ACTIVE_THREAD_ID: 'lastActiveThreadId',

  // MCP Configuration
  MCP_SERVERS: 'mcpServers',

  // Checkpointer
  CHECKPOINT_PREFIX: 'checkpoint:',

  // Screenshots
  SCREENSHOTS_PREFIX: 'screenshots_',
  LAST_SCREENSHOT_DATA_URL: 'lastScreenshotDataUrl'
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
