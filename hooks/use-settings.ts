// hooks/use-settings.ts
import { useState, useEffect } from 'react';
import { StorageService } from '@/lib/services/storage/storage-service';
import { getAllToolNames } from '@/lib/agent/tools/tool-meta';
import type { LLMConfig } from '@/lib/types/agent';

export function useSettings() {
  // LLM設定の状態管理
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    apiKey: '',
    baseUrl: '',
    modelName: ''
  });
  const [llmStatus, setLlmStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // ツール設定の状態管理
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
  const [toolStatus, setToolStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // 設定の読み込み
  useEffect(() => {
    const loadSettings = async () => {
      const config = await StorageService.getLLMConfig();
      setLlmConfig(config);

      const toolNames = await StorageService.getEnabledTools();
      setEnabledTools(new Set(toolNames.length > 0 ? toolNames : getAllToolNames()));
    };
    loadSettings();
  }, []);

  // LLM設定の保存
  const saveLlmConfig = async () => {
    setLlmStatus('saving');
    await StorageService.saveLLMConfig(llmConfig);
    setTimeout(() => setLlmStatus('saved'), 500);
    setTimeout(() => setLlmStatus('idle'), 2000);
  };

  // ツール設定の保存
  const saveToolSettings = async () => {
    setToolStatus('saving');
    await StorageService.saveEnabledTools(Array.from(enabledTools));
    setTimeout(() => setToolStatus('saved'), 500);
    setTimeout(() => setToolStatus('idle'), 2000);
  };

  // ツールのトグル
  const handleToolToggle = (toolName: string, checked: boolean) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (checked) next.add(toolName);
      else next.delete(toolName);
      return next;
    });
  };

  return {
    llmConfig,
    setLlmConfig,
    llmStatus,
    saveLlmConfig,
    enabledTools,
    handleToolToggle,
    toolStatus,
    saveToolSettings
  };
}
