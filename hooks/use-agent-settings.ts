import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '@/lib/services/storage/storage-service';
import { getAllToolNames } from '@/lib/agent/tools/tool-meta';
import type { AgentSettingsConfig } from '@/lib/types/agent';
import { DEFAULT_AGENT_ID } from '@/lib/types/agent';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/agent/default-system-prompt';

/**
 * Hook for managing agent settings.
 * Accepts an optional `agentId` to manage a specific agent's config.
 * Defaults to the active agent (or 'default').
 */
export function useAgentSettings(agentId?: string) {
  const resolvedAgentId = agentId || DEFAULT_AGENT_ID;

  const [config, setConfig] = useState<AgentSettingsConfig>({
    agentId: resolvedAgentId,
    agentName: 'Default Agent',
    providerId: '',
    modelName: '',
    enabledTools: [],
    enabledMcpServers: [],
    disabledMcpTools: [],
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const loadConfig = useCallback(async () => {
    const savedConfig = await StorageService.getAgentConfig(resolvedAgentId);
    if (savedConfig) {
      setConfig(savedConfig);
    } else {
      // Setup defaults if first time
      const defaultTools = getAllToolNames();
      const defaultConfig: AgentSettingsConfig = {
        agentId: resolvedAgentId,
        agentName: resolvedAgentId === DEFAULT_AGENT_ID ? 'Default Agent' : resolvedAgentId,
        providerId: '',
        modelName: '',
        enabledTools: defaultTools,
        enabledMcpServers: [],
        disabledMcpTools: [],
        systemPrompt: DEFAULT_SYSTEM_PROMPT
      };
      setConfig(defaultConfig);
    }
    setIsLoaded(true);
  }, [resolvedAgentId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateConfig = async (updates: Partial<AgentSettingsConfig>): Promise<void> => {
    setConfig((prev) => {
      const nextConfig = { ...prev, ...updates };
      StorageService.saveAgentConfig(nextConfig).catch(console.error);
      return nextConfig;
    });
  };

  const setProviderAndModel = (providerId: string, modelName: string): void => {
    updateConfig({ providerId, modelName });
  };

  const toggleTool = (toolName: string, enabled: boolean): void => {
    setConfig((prev) => {
      const toolSet = new Set(prev.enabledTools);
      if (enabled) {
        toolSet.add(toolName);
      } else {
        toolSet.delete(toolName);
      }
      const newTools = Array.from(toolSet);
      updateConfig({ enabledTools: newTools });
      return prev;
    });
  };

  const toggleMcpServer = (serverId: string, enabled: boolean): void => {
    setConfig((prev) => {
      const serverSet = new Set(prev.enabledMcpServers);
      if (enabled) {
        serverSet.add(serverId);
      } else {
        serverSet.delete(serverId);
      }
      const newServers = Array.from(serverSet);
      updateConfig({ enabledMcpServers: newServers });
      return prev;
    });
  };

  const toggleMcpTool = (toolName: string, enabled: boolean): void => {
    setConfig((prev) => {
      const disabledSet = new Set(prev.disabledMcpTools || []);
      if (enabled) {
        disabledSet.delete(toolName);
      } else {
        disabledSet.add(toolName);
      }
      const newDisabled = Array.from(disabledSet);
      updateConfig({ disabledMcpTools: newDisabled });
      return prev;
    });
  };

  const setSystemPrompt = (prompt: string): void => {
    updateConfig({ systemPrompt: prompt });
  };

  return {
    config,
    isLoaded,
    updateConfig,
    setProviderAndModel,
    toggleTool,
    toggleMcpServer,
    toggleMcpTool,
    setSystemPrompt
  };
}
