import { createAgent } from 'langchain';
import { DynamicStructuredTool } from '@langchain/core/tools';

import { ChromeStorageCheckpointer } from '../checkpointer';
import { createBrowserTools } from '../tools/browser/index';
import { createMcpTools } from '../tools/mcp';
import { getMcpServers } from '../tools/mcp-types';
import { LLMFactory } from '../llm';
import { getAllToolNames, TOOL_SETTINGS_STORAGE_KEY } from '../tools/tool-meta';

import { StorageService } from '../../services/storage/storage-service';
import type { AgentSettingsConfig } from '../../types/agent';

export interface GraphAgentConfig {
  apiKey: string;
  baseUrl?: string;
  modelName: string;
}

/** Keeps a reference to the active MCP client so it can be closed on re-init */
let activeMcpClient: { close(): Promise<void> } | null = null;

export async function createLangGraphAgent(config: GraphAgentConfig) {
  // Close previous MCP client if any
  if (activeMcpClient) {
    try {
      await activeMcpClient.close();
    } catch {
      // ignore
    }
    activeMcpClient = null;
  }

  // 1. Initialize LLM
  const model = LLMFactory.createModel({
    provider: 'openai',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    modelName: config.modelName || 'gpt-5'
  });

  // 2. Initialize Built-in Browser Tools — filter by user preferences
  const allBrowserTools = createBrowserTools();

  // Get agent settings to know which tools are enabled
  const agentSettings = await StorageService.getAgentConfig();
  const enabledBrowserTools = agentSettings?.enabledTools || getAllToolNames();
  const enabledMcpServers = agentSettings?.enabledMcpServers || [];
  const disabledMcpTools = agentSettings?.disabledMcpTools || [];

  const browserTools = allBrowserTools.filter((t) => enabledBrowserTools.includes(t.name));

  // 3. Initialize Remote MCP Tools
  const mcpServers = await getMcpServers();
  const { tools: mcpTools, client: mcpClient } = await createMcpTools(mcpServers, enabledMcpServers);
  activeMcpClient = mcpClient;

  if (mcpTools.length > 0) {
    console.log(`Loaded ${mcpTools.length} MCP tool(s) from remote server(s).`);
  }

  // 4. Combine all tools (filter out disabled MCP tools)
  const filteredMcpTools = mcpTools.filter((t) => !disabledMcpTools.includes(t.name));
  const tools: DynamicStructuredTool[] = [...browserTools, ...filteredMcpTools];

  // 5. Initialize Checkpointer
  const checkpointer = new ChromeStorageCheckpointer();

  // 6. Create Agent
  const systemPrompt = agentSettings?.systemPrompt || undefined;
  return createAgent({
    model,
    tools,
    checkpointer,
    ...(systemPrompt ? { systemPrompt } : {})
  });
}
