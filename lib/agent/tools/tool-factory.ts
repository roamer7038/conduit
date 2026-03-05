import { createBrowserTools } from './browser/index';
import { createMcpTools } from './mcp';
import { getAllToolNames } from './tool-meta';
import { McpServerRepository } from '../../services/storage/repositories/mcp-server-repository';
import type { AgentSettingsConfig } from '../../types/agent';
import type { DynamicStructuredTool } from '@langchain/core/tools';

export class ToolFactory {
  private static activeMcpClient: { close(): Promise<void> } | null = null;

  static async createTools(agentSettings: AgentSettingsConfig | null): Promise<{
    browserTools: DynamicStructuredTool[];
    mcpTools: DynamicStructuredTool[];
    allTools: DynamicStructuredTool[];
  }> {
    if (this.activeMcpClient) {
      try {
        await this.activeMcpClient.close();
      } catch {
        // ignore
      }
      this.activeMcpClient = null;
    }

    const allBrowserTools = createBrowserTools();
    const enabledBrowserTools = agentSettings?.enabledTools || getAllToolNames();
    const browserTools = allBrowserTools.filter((t) => enabledBrowserTools.includes(t.name));

    console.log(`[Agent Setup] Filtered Browser Tools: ${browserTools.length} enabled`);

    const enabledMcpServers = agentSettings?.enabledMcpServers || [];
    const disabledMcpTools = agentSettings?.disabledMcpTools || [];

    let filteredMcpTools: DynamicStructuredTool[] = [];
    try {
      const mcpServers = await McpServerRepository.getAll();
      const { tools: mcpTools, client: mcpClient } = await createMcpTools(mcpServers, enabledMcpServers);
      this.activeMcpClient = mcpClient;

      if (mcpTools.length > 0) {
        console.log(`[Agent Setup] Loaded ${mcpTools.length} MCP tool(s) from remote server(s).`);
      }

      filteredMcpTools = mcpTools.filter((t) => !disabledMcpTools.includes(t.name));
      console.log(`[Agent Setup] Active MCP Tools: ${filteredMcpTools.length} enabled`);
    } catch (err) {
      console.error('[Agent Setup] Failed to load MCP tools', err);
    }

    return {
      browserTools,
      mcpTools: filteredMcpTools,
      allTools: [...browserTools, ...filteredMcpTools]
    };
  }
}
