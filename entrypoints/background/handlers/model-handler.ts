// entrypoints/background/handlers/model-handler.ts
/// <reference types="chrome"/>
import { clearModelCache } from '@/lib/agent/model-cache';
import type { FetchModelsResponse } from '@/lib/services/message/message-types';
import type { LlmProviderConfig } from '@/lib/types/agent';

export async function handleFetchModels(provider: LlmProviderConfig): Promise<FetchModelsResponse> {
  if (!provider.apiKey) {
    throw new Error('API Key is not configured for this provider');
  }

  let baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  const url = `${baseUrl}/models`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
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
