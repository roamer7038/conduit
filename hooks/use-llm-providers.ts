import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '@/lib/services/storage/storage-service';
import type { LlmProviderConfig } from '@/lib/types/agent';

export function useLlmProviders() {
  const [providers, setProviders] = useState<LlmProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const providerList = await StorageService.getLlmProviders();
      setProviders(providerList);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const addProvider = async (provider: Omit<LlmProviderConfig, 'id'>) => {
    const newProvider: LlmProviderConfig = { ...provider, id: uuidv4() };
    const updated = [...providers, newProvider];
    await StorageService.saveLlmProviders(updated);
    await loadProviders();
    return newProvider;
  };

  const updateProvider = async (id: string, updates: Partial<LlmProviderConfig>) => {
    const updated = providers.map((p) => (p.id === id ? { ...p, ...updates } : p));
    await StorageService.saveLlmProviders(updated);
    await loadProviders();
  };

  const deleteProvider = async (id: string) => {
    const updated = providers.filter((p) => p.id !== id);
    await StorageService.saveLlmProviders(updated);
    await loadProviders();
  };

  return {
    providers,
    isLoading,
    loadProviders,
    addProvider,
    updateProvider,
    deleteProvider
  };
}
