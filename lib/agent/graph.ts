import { createAgent } from 'langchain';
import { DynamicStructuredTool } from '@langchain/core/tools';

import { ChromeStorageCheckpointer } from './checkpointer';
import { createBrowserTools } from './tools/browser';
import { createMcpTools } from './tools/mcp';
import { getMcpServers } from './tools/mcp-types';
import { LLMFactory } from './llm';
import { getAllToolNames, TOOL_SETTINGS_STORAGE_KEY } from './tools/tool-meta';

export interface AgentConfig {
  apiKey: string;
  baseUrl?: string;
  modelName?: string;
}

/** Keeps a reference to the active MCP client so it can be closed on re-init */
let activeMcpClient: { close(): Promise<void> } | null = null;

export async function createLangGraphAgent(config: AgentConfig) {
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

  const stored = await chrome.storage.local.get([TOOL_SETTINGS_STORAGE_KEY]);
  const enabledNames: string[] = Array.isArray(stored[TOOL_SETTINGS_STORAGE_KEY])
    ? stored[TOOL_SETTINGS_STORAGE_KEY]
    : getAllToolNames();

  const browserTools = allBrowserTools.filter((t) => enabledNames.includes(t.name));

  // 3. Initialize Remote MCP Tools
  const mcpServers = await getMcpServers();
  const { tools: mcpTools, client: mcpClient } = await createMcpTools(mcpServers);
  activeMcpClient = mcpClient;

  if (mcpTools.length > 0) {
    console.log(`Loaded ${mcpTools.length} MCP tool(s) from remote server(s).`);
  }

  // 4. Combine all tools
  const tools: DynamicStructuredTool[] = [...browserTools, ...mcpTools];

  // 5. Initialize Checkpointer
  const checkpointer = new ChromeStorageCheckpointer();

  // 6. Create Agent
  return createAgent({
    model,
    tools,
    checkpointer
  });
}
