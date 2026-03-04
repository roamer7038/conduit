import { useState, useEffect, useCallback } from 'react';
import { AgentConfigRepository } from '@/lib/services/storage/repositories/agent-config-repository';
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
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    enabledMiddlewares: [],
    middlewareSettings: {},
    temperature: 0.7,
    topP: 1.0
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const loadConfig = useCallback(async () => {
    let resolvedAgentId = agentId;
    if (!resolvedAgentId) {
      resolvedAgentId = (await AgentConfigRepository.getActiveId()) || DEFAULT_AGENT_ID;
      await AgentConfigRepository.setActiveId(resolvedAgentId);
    }
    const savedConfig = await AgentConfigRepository.getById(resolvedAgentId);
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
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        enabledMiddlewares: [],
        middlewareSettings: {},
        temperature: 0.7,
        topP: 1.0
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
      // React state update is synchronous within the functional update conceptually,
      // but we should trigger the storage save outside or carefully.
      // ensure consistency, we save the fully computed nextConfig.
      AgentConfigRepository.save(nextConfig).catch((err) => {
        console.error('[useAgentSettings] Failed to save config:', err);
      });
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
      const nextConfig = { ...prev, enabledTools: newTools };
      AgentConfigRepository.save(nextConfig).catch(console.error);
      return nextConfig;
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
      const nextConfig = { ...prev, enabledMcpServers: newServers };
      AgentConfigRepository.save(nextConfig).catch(console.error);
      return nextConfig;
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
      const nextConfig = { ...prev, disabledMcpTools: newDisabled };
      AgentConfigRepository.save(nextConfig).catch(console.error);
      return nextConfig;
    });
  };

  const setSystemPrompt = (prompt: string): void => {
    updateConfig({ systemPrompt: prompt });
  };

  const toggleMiddleware = (middlewareName: string, enabled: boolean): void => {
    setConfig((prev) => {
      const middlewareSet = new Set(prev.enabledMiddlewares || []);
      if (enabled) {
        middlewareSet.add(middlewareName);
      } else {
        middlewareSet.delete(middlewareName);
      }
      const newMiddlewares = Array.from(middlewareSet);
      const nextConfig = { ...prev, enabledMiddlewares: newMiddlewares };
      AgentConfigRepository.save(nextConfig).catch(console.error);
      return nextConfig;
    });
  };

  const updateMiddlewareSettings = (settings: NonNullable<AgentSettingsConfig['middlewareSettings']>): void => {
    setConfig((prev) => {
      const newSettings = {
        ...prev.middlewareSettings,
        ...settings
      };
      const nextConfig = { ...prev, middlewareSettings: newSettings };
      AgentConfigRepository.save(nextConfig).catch(console.error);
      return nextConfig;
    });
  };

  const setRecursionLimit = (value: number | undefined): void => {
    updateConfig({ recursionLimit: value });
  };

  const setModelParams = (temperature: number, topP: number): void => {
    updateConfig({ temperature, topP });
  };

  return {
    config,
    isLoaded,
    updateConfig,
    setProviderAndModel,
    toggleTool,
    toggleMcpServer,
    toggleMcpTool,
    setSystemPrompt,
    toggleMiddleware,
    updateMiddlewareSettings,
    setRecursionLimit,
    setModelParams
  };
}
