import { BaseStorage, StorageError } from '../core/base-storage';
import { STORAGE_KEYS } from '../storage-keys';
import type { LlmProviderConfig } from '@/lib/types/agent';
import { CryptoService } from '../../crypto/crypto-service';

export class LlmProviderRepository {
  static async getAll(): Promise<LlmProviderConfig[]> {
    try {
      const data = await BaseStorage.get<LlmProviderConfig[]>(STORAGE_KEYS.LLM_PROVIDERS);
      if (!data) return [];

      return Promise.all(
        data.map(async (provider) => {
          if (provider.apiKey) {
            const decryptedKey = await CryptoService.decrypt(provider.apiKey);
            return { ...provider, apiKey: decryptedKey };
          }
          return provider;
        })
      );
    } catch (error) {
      throw new StorageError('Failed to get LLM providers', error);
    }
  }

  static async saveAll(providers: LlmProviderConfig[]): Promise<void> {
    try {
      const encryptedProviders = await Promise.all(
        providers.map(async (provider) => {
          if (provider.apiKey) {
            const encryptedKey = await CryptoService.encrypt(provider.apiKey);
            return { ...provider, apiKey: encryptedKey };
          }
          return provider;
        })
      );
      await BaseStorage.set(STORAGE_KEYS.LLM_PROVIDERS, encryptedProviders);
    } catch (error) {
      throw new StorageError('Failed to save LLM providers', error);
    }
  }
}
