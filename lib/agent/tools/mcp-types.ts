// lib/agent/tools/mcp-types.ts
// Re-export McpServerConfig from the canonical location
export type { McpServerConfig } from '../../types/agent';

/** Storage key for MCP server configurations */
export const MCP_SERVERS_STORAGE_KEY = 'mcpServers';
