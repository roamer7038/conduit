// entrypoints/background/handlers/model-handler.ts
/// <reference types="chrome"/>
import { clearModelCache } from '@/lib/agent/model-cache';
import { StorageService } from '@/lib/services/storage/storage-service';
import type { FetchModelsResponse } from '@/lib/services/message/message-types';

export async function handleFetchModels(): Promise<FetchModelsResponse> {
  const config = await StorageService.getLLMConfig();

  if (!config.apiKey) {
    throw new Error('API Key is not configured');
  }

  const url = `${config.baseUrl || 'https://api.openai.com/v1'}/models`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid response format from API');
  }

  // Extract model IDs and sort alphabetically
  const models = data.data
    .map((m: any) => m.id)
    .filter((id: string) => typeof id === 'string')
    .sort();

  return { models };
}

export async function handleClearModelCache(): Promise<{ success: true }> {
  await clearModelCache();
  return { success: true };
}
