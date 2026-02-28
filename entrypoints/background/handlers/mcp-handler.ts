// entrypoints/background/handlers/mcp-handler.ts
import { testMcpConnection } from '@/lib/agent/tools/mcp';
import { StorageService } from '@/lib/services/storage/storage-service';
import type { McpServerConfig, TestResult } from '@/lib/types/settings';
import type { McpToolInfo } from '@/lib/types/agent';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';

export async function handleTestMcpConnection(server: McpServerConfig): Promise<TestResult> {
  try {
    const result = await testMcpConnection(server);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch the list of tools exposed by a specific MCP server.
 * Connects temporarily, discovers tools, then disconnects.
 */
export async function handleFetchMcpTools(serverId: string): Promise<{ tools: McpToolInfo[] }> {
  const servers = await StorageService.getMcpServers();
  const server = servers.find((s) => s.id === serverId);
  if (!server) {
    throw new Error(`MCP server not found: ${serverId}`);
  }

  const entry: { transport?: 'http' | 'sse'; url: string; headers?: Record<string, string> } = {
    url: server.url
  };

  if (server.transport === 'sse') {
    entry.transport = 'sse';
  }

  if (Object.keys(server.headers).length > 0) {
    entry.headers = server.headers;
  }

  const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    onConnectionError: 'throw',
    mcpServers: {
      [server.name]: entry
    }
  });

  try {
    const tools = await client.getTools();
    const toolInfos: McpToolInfo[] = tools.map((t) => ({
      name: t.name,
      description: t.description || '',
      serverName: server.name
    }));
    await client.close();
    return { tools: toolInfos };
  } catch (error: unknown) {
    try {
      await client.close();
    } catch {
      // ignore close errors
    }
    throw error;
  }
}
