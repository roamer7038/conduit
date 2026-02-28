import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '@/lib/services/storage/storage-service';
import { getAllToolNames } from '@/lib/agent/tools/tool-meta';
import type { AgentSettingsConfig } from '@/lib/types/agent';

const DEFAULT_CONFIG: AgentSettingsConfig = {
  providerId: '',
  modelName: '',
  enabledTools: [],
  enabledMcpServers: [],
  disabledMcpTools: []
};

export function useAgentSettings() {
  const [config, setConfig] = useState<AgentSettingsConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadConfig = useCallback(async () => {
    const savedConfig = await StorageService.getAgentConfig();
    if (savedConfig) {
      // If enabledTools is empty, maybe default to all built-in tools for new users?
      // Since we dropped backward compatibility, we can assume empty means empty.
      // But let's keep all tools enabled by default if no setting exists at all.
      setConfig(savedConfig);
    } else {
      // Setup defaults if first time
      const defaultTools = getAllToolNames();
      setConfig({ ...DEFAULT_CONFIG, enabledTools: defaultTools });
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Method to update any part of the config and auto-save
  const updateConfig = async (updates: Partial<AgentSettingsConfig>) => {
    setConfig((prev) => {
      const nextConfig = { ...prev, ...updates };
      // Fire and forget auto-save
      StorageService.saveAgentConfig(nextConfig).catch(console.error);
      return nextConfig;
    });
  };

  const setProviderAndModel = (providerId: string, modelName: string) => {
    updateConfig({ providerId, modelName });
  };

  const toggleTool = (toolName: string, enabled: boolean) => {
    setConfig((prev) => {
      const toolSet = new Set(prev.enabledTools);
      if (enabled) {
        toolSet.add(toolName);
      } else {
        toolSet.delete(toolName);
      }
      const newTools = Array.from(toolSet);
      updateConfig({ enabledTools: newTools });
      // updateConfig already calls setConfig, let's just use updateConfig and return prev to avoid double-render if it matters.
      // Actually updateConfig's setConfig call is async, so we'll just do it there.
      return prev;
    });
  };

  const toggleMcpServer = (serverId: string, enabled: boolean) => {
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

  const toggleMcpTool = (toolName: string, enabled: boolean) => {
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

  return {
    config,
    isLoaded,
    updateConfig,
    setProviderAndModel,
    toggleTool,
    toggleMcpServer,
    toggleMcpTool
  };
}
