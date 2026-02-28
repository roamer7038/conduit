// hooks/use-mcp-servers.ts
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '@/lib/services/storage/storage-service';
import { MessageBus } from '@/lib/services/message/message-bus';
import type { McpServerConfig, TestResult } from '@/lib/types/agent';

export function useMcpServers() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testingServerId, setTestingServerId] = useState<string | null>(null);

  // サーバー一覧の読み込み
  const loadServers = useCallback(async () => {
    const serverList = await StorageService.getMcpServers();
    setServers(serverList);
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // サーバーの追加
  const addServer = async (server: Omit<McpServerConfig, 'id'>) => {
    const newServer: McpServerConfig = { ...server, id: uuidv4() };
    const updated = [...servers, newServer];
    await StorageService.saveMcpServers(updated);
    await loadServers();
  };

  // サーバーの更新
  const updateServer = async (id: string, updates: Partial<McpServerConfig>) => {
    const updated = servers.map((s) => (s.id === id ? { ...s, ...updates } : s));
    await StorageService.saveMcpServers(updated);
    await loadServers();
  };

  // サーバーの削除
  const deleteServer = async (id: string) => {
    const updated = servers.filter((s) => s.id !== id);
    await StorageService.saveMcpServers(updated);
    await loadServers();
  };

  // 接続テスト
  const testConnection = async (server: McpServerConfig) => {
    setTestingServerId(server.id);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[server.id];
      return next;
    });

    try {
      const result = await MessageBus.testMcpConnection(server);
      setTestResults((prev) => ({
        ...prev,
        [server.id]: result
      }));
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        [server.id]: { success: false, error: error.message }
      }));
    } finally {
      setTestingServerId(null);
    }
  };

  return {
    servers,
    testResults,
    testingServerId,
    loadServers,
    addServer,
    updateServer,
    deleteServer,
    testConnection
  };
}
