import { createAgent } from 'langchain';
import { ChromeStorageCheckpointer } from '../checkpointer';
import { LLMFactory } from '../llm';
import { getAgentMiddlewares } from '../middlewares';
import { ToolFactory } from '../tools/tool-factory';
import { DEFAULT_SYSTEM_PROMPT } from '../default-system-prompt';

import { AgentConfigRepository } from '../../services/storage/repositories/agent-config-repository';
import type { GraphAgentConfig } from '../../types/agent';

export async function createLangGraphAgent(config: GraphAgentConfig) {
  const model = LLMFactory.createModel({
    provider: config.providerType || 'openai',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    modelName: config.modelName || 'gpt-5',
    temperature: config.temperature,
    topP: config.topP
  });

  const agentSettings = await AgentConfigRepository.getActiveConfig();

  // Initialize Tools via ToolFactory
  const { allTools, mcpTools } = await ToolFactory.createTools(agentSettings);
  console.log(`[Agent Setup] Model: ${config.modelName || 'gpt-5'}`);

  // Initialize Checkpointer
  const checkpointer = new ChromeStorageCheckpointer();

  // Initialize Middlewares
  const mcpToolNames = mcpTools.map((t) => t.name);
  const middleware = getAgentMiddlewares(model, agentSettings, mcpToolNames);
  const enabledMiddlewares = agentSettings?.enabledMiddlewares || [];
  console.log(`[Agent Setup] Active Middlewares (${middleware.length}): ${enabledMiddlewares.join(', ') || 'None'}`);

  // Create Agent
  const systemPrompt = agentSettings?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  return createAgent({
    model,
    tools: allTools,
    middleware,
    checkpointer,
    ...(systemPrompt ? { systemPrompt } : {})
  });
}
