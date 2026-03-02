import { summarizationMiddleware, todoListMiddleware, toolCallLimitMiddleware } from 'langchain';
import type { AgentMiddleware } from 'langchain';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AgentSettingsConfig } from '../../types/agent';

const DEFAULT_RUN_LIMIT = 20;

export function getAgentMiddlewares(
  model: BaseChatModel,
  agentSettings: AgentSettingsConfig | null,
  mcpToolNames: string[] = []
): AgentMiddleware[] {
  const middlewares: AgentMiddleware[] = [];

  if (!agentSettings || !agentSettings.enabledMiddlewares) {
    return middlewares;
  }

  const { enabledMiddlewares, middlewareSettings } = agentSettings;

  if (enabledMiddlewares.includes('SummarizationMiddleware')) {
    const sumSettings = middlewareSettings?.summarization || {};
    middlewares.push(
      summarizationMiddleware({
        model,
        trigger: {
          tokens: sumSettings.maxTokens || 100000
        }
      })
    );
  }

  if (enabledMiddlewares.includes('TodoListMiddleware')) {
    middlewares.push(todoListMiddleware());
  }

  if (enabledMiddlewares.includes('ToolCallLimitMiddleware') && mcpToolNames.length > 0) {
    const runLimit = middlewareSettings?.toolCallLimit?.runLimit || DEFAULT_RUN_LIMIT;
    for (const toolName of mcpToolNames) {
      middlewares.push(toolCallLimitMiddleware({ toolName, runLimit, exitBehavior: 'continue' }));
    }
  }

  return middlewares;
}
