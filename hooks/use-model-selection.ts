// hooks/use-model-selection.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { StorageService } from '@/lib/services/storage/storage-service';
import { MessageBus } from '@/lib/services/message/message-bus';
import { getCachedModels, saveCacheWithMeta } from '@/lib/agent/model-cache';

export function useModelSelection(providerId?: string) {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const fetchModels = useCallback(
    async (forceRefresh = false) => {
      setModelsLoading(true);
      try {
        const agentConfig = await StorageService.getActiveAgentConfig();
        const providers = await StorageService.getLlmProviders();

        // We now need to look at the providerId passed, normally we take it from param, or from Agent Settings
        // If we are configuring the agent settings, we pass the providerId.
        const targetProviderId = providerId || agentConfig?.providerId;

        if (!targetProviderId) {
          // Only show toast if forcefully asked, otherwise fail silently for clean UI
          if (forceRefresh) toast.error('エージェント設定でLLMプロバイダが選択されていません。');
          setAvailableModels([]);
          return;
        }

        const activeProvider = providers.find((p) => p.id === targetProviderId);
        if (!activeProvider?.apiKey) {
          toast.error('選択されたLLMプロバイダのAPI Keyが設定されていません。');
          setAvailableModels([]);
          return;
        }

        // キャッシュチェック
        if (!forceRefresh) {
          const cached = await getCachedModels(activeProvider.apiKey, activeProvider.baseUrl || '');
          if (cached) {
            setAvailableModels(cached);
            setModelsLoading(false);
            return;
          }
        }

        // APIから取得 (background script now handles the provider fetching natively from storage,
        // but since we updated it to receive the provider by parameter, we need to pass it or change messagebus API.
        // Wait, we updated background.js to fetch the Provider by getting AgentConfig directly.
        const models = await MessageBus.fetchModels();

        // キャッシュに保存
        await saveCacheWithMeta(models, activeProvider.apiKey, activeProvider.baseUrl || '');
        setAvailableModels(models);
      } catch (error: any) {
        toast.error(`モデルリストの取得に失敗しました: ${error.message}`);
        setAvailableModels([]);
      } finally {
        setModelsLoading(false);
      }
    },
    [providerId]
  );

  useEffect(() => {
    fetchModels(false);
  }, [fetchModels]);

  const handleRefreshModels = useCallback(async () => {
    await MessageBus.clearModelCache();
    await fetchModels(true);
  }, [fetchModels]);

  return {
    availableModels,
    modelsLoading,
    fetchModels,
    handleRefreshModels
  };
}
