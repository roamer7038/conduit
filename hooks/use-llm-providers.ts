import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LlmProviderRepository } from '@/lib/services/storage/repositories/llm-provider-repository';
import type { LlmProviderConfig } from '@/lib/types/agent';
export function useLlmProviders() {
  const [providers, setProviders] = useState<LlmProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const providerList = await LlmProviderRepository.getAll();
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
    await LlmProviderRepository.saveAll(updated);
    setProviders(updated);
    return newProvider;
  };

  const updateProvider = async (id: string, updates: Partial<LlmProviderConfig>) => {
    const updated = providers.map((p) => (p.id === id ? { ...p, ...updates } : p));
    await LlmProviderRepository.saveAll(updated);
    setProviders(updated);
  };

  const deleteProvider = async (id: string) => {
    const updated = providers.filter((p) => p.id !== id);
    await LlmProviderRepository.saveAll(updated);
    setProviders(updated);
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
