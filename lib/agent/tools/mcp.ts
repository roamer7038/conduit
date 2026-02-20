import { MultiServerMCPClient } from '@langchain/mcp-adapters';

export async function initializeMcpClient(serverUrl: string) {
  const client = new MultiServerMCPClient({
    remote_mcp: {
      url: serverUrl,
      transport: 'sse', // User explicitly requested SSE for /mcp endpoint
      automaticSSEFallback: true
    }
  });

  try {
    // Initialize connections to all configured servers
    await client.initializeConnections();

    // Return the tools needed for the agent
    return await client.getTools();
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
    return [];
  }
}
