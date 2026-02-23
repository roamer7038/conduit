import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for a remote MCP server connection.
 */
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
  /** Whether this server is enabled */
  enabled: boolean;
}

/** Storage key for MCP server configurations */
export const MCP_SERVERS_STORAGE_KEY = 'mcpServers';

/**
 * Retrieve all saved MCP server configurations from chrome.storage.
 */
export async function getMcpServers(): Promise<McpServerConfig[]> {
  const data = await chrome.storage.local.get(MCP_SERVERS_STORAGE_KEY);
  const servers = data[MCP_SERVERS_STORAGE_KEY];
  return Array.isArray(servers) ? (servers as McpServerConfig[]) : [];
}

/**
 * Overwrite the entire MCP server configuration list.
 */
export async function saveMcpServers(servers: McpServerConfig[]): Promise<void> {
  await chrome.storage.local.set({ [MCP_SERVERS_STORAGE_KEY]: servers });
}

/**
 * Add a new MCP server configuration. Generates an ID automatically.
 */
export async function addMcpServer(server: Omit<McpServerConfig, 'id'>): Promise<McpServerConfig> {
  const servers = await getMcpServers();
  const newServer: McpServerConfig = { ...server, id: uuidv4() };
  servers.push(newServer);
  await saveMcpServers(servers);
  return newServer;
}

/**
 * Update an existing MCP server configuration by ID.
 */
export async function updateMcpServer(id: string, updates: Partial<Omit<McpServerConfig, 'id'>>): Promise<void> {
  const servers = await getMcpServers();
  const index = servers.findIndex((s) => s.id === id);
  if (index === -1) throw new Error(`MCP server not found: ${id}`);
  servers[index] = { ...servers[index], ...updates };
  await saveMcpServers(servers);
}

/**
 * Delete an MCP server configuration by ID.
 */
export async function deleteMcpServer(id: string): Promise<void> {
  const servers = await getMcpServers();
  await saveMcpServers(servers.filter((s) => s.id !== id));
}
