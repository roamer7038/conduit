// lib/utils/model-cache.ts
export interface ModelListCacheMeta {
  apiKeyHash: string;
  baseUrl: string;
  timestamp: number;
}

/**
 * Hash API key using SHA-256
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Get cached models if cache is valid
 */
export async function getCachedModels(apiKey: string, baseUrl: string): Promise<string[] | null> {
  const data = await chrome.storage.local.get(['modelListCache', 'modelListCacheMeta']);

  if (!data.modelListCache || !data.modelListCacheMeta) {
    return null;
  }

  const meta = data.modelListCacheMeta as ModelListCacheMeta;
  const currentHash = await hashApiKey(apiKey);

  // Validate cache: check if API key and base URL match
  if (meta.apiKeyHash !== currentHash || meta.baseUrl !== baseUrl) {
    return null;
  }

  return data.modelListCache as string[];
}

/**
 * Save models to cache with metadata
 */
export async function saveCacheWithMeta(models: string[], apiKey: string, baseUrl: string): Promise<void> {
  const apiKeyHash = await hashApiKey(apiKey);
  const timestamp = Date.now();

  await chrome.storage.local.set({
    modelListCache: models,
    modelListCacheMeta: {
      apiKeyHash,
      baseUrl,
      timestamp
    }
  });
}

/**
 * Clear model cache
 */
export async function clearModelCache(): Promise<void> {
  await chrome.storage.local.remove(['modelListCache', 'modelListCacheMeta']);
}
