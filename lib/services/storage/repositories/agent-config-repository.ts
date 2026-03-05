import { BaseStorage, StorageError } from '../core/base-storage';
import { STORAGE_KEYS } from '../storage-keys';
import { AgentSettingsConfigSchema, type AgentSettingsConfig } from '@/lib/types/agent';
import { z } from 'zod';
import type { IAgentConfigRepository } from '../interfaces';

export const AgentConfigRepository: IAgentConfigRepository = {
  getAll: async (): Promise<AgentSettingsConfig[]> => {
    try {
      const configs = await BaseStorage.get<unknown>(STORAGE_KEYS.AGENT_CONFIGS);
      if (!configs) return [];

      const parsed = z.array(AgentSettingsConfigSchema).safeParse(configs);
      if (!parsed.success) {
        console.warn('Invalid Agent Configs found in storage, reverting to empty array', parsed.error);
        return [];
      }
      return parsed.data;
    } catch (error) {
      throw new StorageError('Failed to get Agent Configs', error);
    }
  },

  getById: async (agentId: string): Promise<AgentSettingsConfig | null> => {
    try {
      const configs = await AgentConfigRepository.getAll();
      return configs.find((c) => c.agentId === agentId) || null;
    } catch (error) {
      throw new StorageError('Failed to get Agent Config by ID', error);
    }
  },

  getActiveId: async (): Promise<string | null> => {
    try {
      return await BaseStorage.get<string>(STORAGE_KEYS.ACTIVE_AGENT_ID);
    } catch (error) {
      throw new StorageError('Failed to get active agent ID', error);
    }
  },

  setActiveId: async (agentId: string): Promise<void> => {
    try {
      await BaseStorage.set(STORAGE_KEYS.ACTIVE_AGENT_ID, agentId);
    } catch (error) {
      throw new StorageError('Failed to set active agent ID', error);
    }
  },

  getActiveConfig: async (): Promise<AgentSettingsConfig | null> => {
    try {
      const activeId = await AgentConfigRepository.getActiveId();
      const configs = await AgentConfigRepository.getAll();
      if (activeId) {
        const found = configs.find((c) => c.agentId === activeId);
        if (found) return found;
      }
      return configs.find((c) => c.agentId === 'default') || configs[0] || null;
    } catch (error) {
      throw new StorageError('Failed to get active Agent Config', error);
    }
  },

  save: async (config: AgentSettingsConfig): Promise<void> => {
    try {
      const configs = await AgentConfigRepository.getAll();
      const idx = configs.findIndex((c) => c.agentId === config.agentId);
      if (idx >= 0) {
        configs[idx] = config;
      } else {
        configs.push(config);
      }
      await BaseStorage.set(STORAGE_KEYS.AGENT_CONFIGS, configs);
    } catch (error) {
      throw new StorageError('Failed to save Agent Config', error);
    }
  },

  delete: async (agentId: string): Promise<void> => {
    try {
      const configs = await AgentConfigRepository.getAll();
      await BaseStorage.set(
        STORAGE_KEYS.AGENT_CONFIGS,
        configs.filter((c) => c.agentId !== agentId)
      );
    } catch (error) {
      throw new StorageError('Failed to delete Agent Config', error);
    }
  }
};
