import { createAgent } from 'langchain';
import { DynamicStructuredTool } from '@langchain/core/tools';

import { ChromeStorageCheckpointer } from '../checkpointer';
import { createBrowserTools } from '../tools/browser/index';
import { createMcpTools } from '../tools/mcp';
import { LLMFactory } from '../llm';
import { getAgentMiddlewares } from '../middlewares';
import { getAllToolNames } from '../tools/tool-meta';
import { DEFAULT_SYSTEM_PROMPT } from '../default-system-prompt';

import { AgentConfigRepository } from '../../services/storage/repositories/agent-config-repository';
import { McpServerRepository } from '../../services/storage/repositories/mcp-server-repository';
import type { AgentSettingsConfig, GraphAgentConfig } from '../../types/agent';

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

  const model = LLMFactory.createModel({
    provider: config.providerType || 'openai',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    modelName: config.modelName || 'gpt-5',
    temperature: config.temperature,
    topP: config.topP
  });

  // 2. Initialize Built-in Browser Tools — filter by user preferences
  const allBrowserTools = createBrowserTools();

  // Get agent settings to know which tools are enabled
  const agentSettings = await AgentConfigRepository.getActiveConfig();
  const enabledBrowserTools = agentSettings?.enabledTools || getAllToolNames();
  const enabledMcpServers = agentSettings?.enabledMcpServers || [];
  const disabledMcpTools = agentSettings?.disabledMcpTools || [];

  const browserTools = allBrowserTools.filter((t) => enabledBrowserTools.includes(t.name));

  console.log(`[Agent Setup] Model: ${config.modelName || 'gpt-5'}`);
  console.log(`[Agent Setup] Filtered Browser Tools: ${browserTools.length} enabled`);

  let formattedTools: DynamicStructuredTool[] = [];
  const mcpServers = await McpServerRepository.getAll();
  const { tools: mcpTools, client: mcpClient } = await createMcpTools(mcpServers, enabledMcpServers);
  activeMcpClient = mcpClient;

  if (mcpTools.length > 0) {
    console.log(`[Agent Setup] Loaded ${mcpTools.length} MCP tool(s) from remote server(s).`);
  }

  // 4. Combine all tools (filter out disabled MCP tools)
  const filteredMcpTools = mcpTools.filter((t) => !disabledMcpTools.includes(t.name));
  console.log(`[Agent Setup] Active MCP Tools: ${filteredMcpTools.length} enabled`);
  const tools: DynamicStructuredTool[] = [...browserTools, ...filteredMcpTools];

  // 5. Initialize Checkpointer
  const checkpointer = new ChromeStorageCheckpointer();

  // 6. Initialize Middlewares
  const mcpToolNames = filteredMcpTools.map((t) => t.name);
  const middleware = getAgentMiddlewares(model, agentSettings, mcpToolNames);
  const enabledMiddlewares = agentSettings?.enabledMiddlewares || [];
  console.log(`[Agent Setup] Active Middlewares (${middleware.length}): ${enabledMiddlewares.join(', ') || 'None'}`);

  // 7. Create Agent
  const systemPrompt = agentSettings?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  return createAgent({
    model,
    tools,
    middleware,
    checkpointer,
    ...(systemPrompt ? { systemPrompt } : {})
  });
}
