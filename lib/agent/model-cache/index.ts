// lib/agent/model-cache.ts

// Cache keys as constants
const CACHE_KEYS = {
  MODEL_LIST: 'modelListCache',
  META: 'modelListCacheMeta'
} as const;

// Cache expiry time: 24 hours
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

interface ModelListCacheMeta {
  apiKeyHash: string;
  baseUrl: string;
  timestamp: number;
}

/**
 * Type guard for ModelListCacheMeta
 */
function isModelListCacheMeta(obj: any): obj is ModelListCacheMeta {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.apiKeyHash === 'string' &&
    typeof obj.baseUrl === 'string' &&
    typeof obj.timestamp === 'number'
  );
}

/**
 * Hash API key using SHA-256
 */
async function hashApiKey(apiKey: string): Promise<string> {
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
  try {
    const data = await chrome.storage.local.get([CACHE_KEYS.MODEL_LIST, CACHE_KEYS.META]);

    if (!data[CACHE_KEYS.MODEL_LIST] || !data[CACHE_KEYS.META]) {
      return null;
    }

    // Type guard validation
    const metaData = data[CACHE_KEYS.META];
    if (!isModelListCacheMeta(metaData)) {
      return null;
    }

    // Check cache expiry
    const isExpired = Date.now() - metaData.timestamp > CACHE_EXPIRY_MS;
    if (isExpired) {
      return null;
    }

    const currentHash = await hashApiKey(apiKey);

    // Validate cache: check if API key and base URL match
    if (metaData.apiKeyHash !== currentHash || metaData.baseUrl !== baseUrl) {
      return null;
    }

    // Validate model list is an array
    if (!Array.isArray(data[CACHE_KEYS.MODEL_LIST])) {
      return null;
    }

    return data[CACHE_KEYS.MODEL_LIST] as string[];
  } catch (error) {
    console.error('Failed to get cached models:', error);
    return null;
  }
}

/**
 * Save models to cache with metadata
 */
export async function saveCacheWithMeta(models: string[], apiKey: string, baseUrl: string): Promise<void> {
  try {
    const apiKeyHash = await hashApiKey(apiKey);
    const timestamp = Date.now();

    await chrome.storage.local.set({
      [CACHE_KEYS.MODEL_LIST]: models,
      [CACHE_KEYS.META]: {
        apiKeyHash,
        baseUrl,
        timestamp
      }
    });
  } catch (error) {
    console.error('Failed to save cache:', error);
    throw error;
  }
}

/**
 * Clear model cache
 */
export async function clearModelCache(): Promise<void> {
  try {
    await chrome.storage.local.remove([CACHE_KEYS.MODEL_LIST, CACHE_KEYS.META]);
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
}
