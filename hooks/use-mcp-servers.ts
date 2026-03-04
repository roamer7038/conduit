// hooks/use-mcp-servers.ts
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { McpServerRepository } from '@/lib/services/storage/repositories/mcp-server-repository';
import { MessageBus } from '@/lib/services/message/message-bus';
import type { McpServerConfig, TestResult } from '@/lib/types/agent';

export function useMcpServers() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Added based on instruction's implied usage

  // サーバー一覧の読み込み
  const loadServers = useCallback(async () => {
    setIsLoading(true);
    const serverList = await McpServerRepository.getAll();
    setServers(serverList);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // サーバーの追加
  const addServer = async (server: Omit<McpServerConfig, 'id'>) => {
    const newServer: McpServerConfig = { ...server, id: uuidv4() };
    const updated = [...servers, newServer]; // Corrected to use newServer
    await McpServerRepository.saveAll(updated);
    setServers(updated);
  };

  // サーバーの更新
  const updateServer = async (id: string, updates: Partial<McpServerConfig>) => {
    const updated = servers.map((s) => (s.id === id ? { ...s, ...updates } : s));
    await McpServerRepository.saveAll(updated);
    setServers(updated);
  };

  // サーバーの削除
  const deleteServer = async (id: string) => {
    const updated = servers.filter((s) => s.id !== id);
    await McpServerRepository.saveAll(updated);
    setServers(updated);
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
