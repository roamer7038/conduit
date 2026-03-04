import { BaseStorage, StorageError } from '../core/base-storage';
import { STORAGE_KEYS } from '../storage-keys';
import type { McpServerConfig } from '@/lib/types/agent';
import { CryptoService } from '../../crypto/crypto-service';

export class McpServerRepository {
  static async getAll(): Promise<McpServerConfig[]> {
    try {
      const servers = await BaseStorage.get<McpServerConfig[]>(STORAGE_KEYS.MCP_SERVERS);
      if (!servers || servers.length === 0) {
        return [];
      }
      return McpServerRepository.decryptHeaders(servers);
    } catch (error) {
      throw new StorageError('Failed to get MCP servers', error);
    }
  }

  static async saveAll(servers: McpServerConfig[]): Promise<void> {
    try {
      const serversWithEncryptedHeaders = await McpServerRepository.encryptHeaders(servers);
      await BaseStorage.set(STORAGE_KEYS.MCP_SERVERS, serversWithEncryptedHeaders);
    } catch (error) {
      throw new StorageError('Failed to save MCP servers', error);
    }
  }

  private static async encryptHeaders(servers: McpServerConfig[]): Promise<McpServerConfig[]> {
    return Promise.all(
      servers.map(async (server) => {
        if (server.headers) {
          const encryptedHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(server.headers)) {
            if (value === '') {
              encryptedHeaders[key] = '';
              continue;
            }
            encryptedHeaders[key] = await CryptoService.encrypt(value);
          }
          return { ...server, headers: encryptedHeaders };
        }
        return server;
      })
    );
  }

  private static async decryptHeaders(servers: McpServerConfig[]): Promise<McpServerConfig[]> {
    return Promise.all(
      servers.map(async (server) => {
        if (server.headers) {
          const decryptedHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(server.headers)) {
            if (value === '') {
              decryptedHeaders[key] = '';
              continue;
            }
            decryptedHeaders[key] = await CryptoService.decrypt(value);
          }
          return { ...server, headers: decryptedHeaders };
        }
        return server;
      })
    );
  }
}
