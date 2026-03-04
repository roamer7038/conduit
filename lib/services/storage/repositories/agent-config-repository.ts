import { BaseStorage, StorageError } from '../core/base-storage';
import { STORAGE_KEYS } from '../storage-keys';
import type { AgentSettingsConfig } from '@/lib/types/agent';

export class AgentConfigRepository {
  static async getAll(): Promise<AgentSettingsConfig[]> {
    try {
      const configs = await BaseStorage.get<AgentSettingsConfig[]>(STORAGE_KEYS.AGENT_CONFIGS);
      return configs || [];
    } catch (error) {
      throw new StorageError('Failed to get Agent Configs', error);
    }
  }

  static async getById(agentId: string): Promise<AgentSettingsConfig | null> {
    try {
      const configs = await AgentConfigRepository.getAll();
      return configs.find((c) => c.agentId === agentId) || null;
    } catch (error) {
      throw new StorageError('Failed to get Agent Config by ID', error);
    }
  }

  static async getActiveId(): Promise<string | null> {
    try {
      return await BaseStorage.get<string>(STORAGE_KEYS.ACTIVE_AGENT_ID);
    } catch (error) {
      throw new StorageError('Failed to get active agent ID', error);
    }
  }

  static async setActiveId(agentId: string): Promise<void> {
    try {
      await BaseStorage.set(STORAGE_KEYS.ACTIVE_AGENT_ID, agentId);
    } catch (error) {
      throw new StorageError('Failed to set active agent ID', error);
    }
  }

  static async getActiveConfig(): Promise<AgentSettingsConfig | null> {
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
  }

  static async save(config: AgentSettingsConfig): Promise<void> {
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
  }

  static async delete(agentId: string): Promise<void> {
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
}
