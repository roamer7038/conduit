import { createAgent } from 'langchain';
import { ChromeStorageCheckpointer } from './checkpointer';
import { createBrowserTools } from './tools/browser';
import { initializeMcpClient } from './tools/mcp';
import { LLMFactory } from './llm';

export interface AgentConfig {
  apiKey: string;
  baseUrl?: string;
  modelName?: string;
}

export async function createLangGraphAgent(config: AgentConfig) {
  // 1. Initialize LLM
  const model = LLMFactory.createModel({
    provider: 'openai',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl, // Pass baseUrl
    modelName: config.modelName || 'gpt-5'
  });

  // 2. Initialize Tools
  const browserTools = createBrowserTools();

  const tools = [...browserTools];

  // 3. Initialize Checkpointer
  const checkpointer = new ChromeStorageCheckpointer();

  // 4. Create Agent
  return createAgent({
    model,
    tools,
    checkpointer
  });
}
