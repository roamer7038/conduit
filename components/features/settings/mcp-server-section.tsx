'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Pencil, Trash2, Wifi, WifiOff, Server } from 'lucide-react';
import { McpServerDialog } from './mcp-server-dialog';
import type { McpServerConfig, TestResult } from '@/lib/types/agent';

interface McpServerSectionProps {
  servers: McpServerConfig[];
  testResults: Record<string, TestResult>;
  testingServerId: string | null;
  addServer: (server: Omit<McpServerConfig, 'id'>) => Promise<void>;
  updateServer: (id: string, updates: Partial<McpServerConfig>) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  testConnection: (server: McpServerConfig) => Promise<void>;
}

export function McpServerSection({
  servers,
  testResults,
  testingServerId,
  addServer,
  updateServer,
  deleteServer,
  testConnection
}: McpServerSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null);

  const openAddDialog = () => {
    setEditingServer(null);
    setDialogOpen(true);
  };

  const openEditDialog = (server: McpServerConfig) => {
    setEditingServer(server);
    setDialogOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    url: string;
    transport: 'sse' | 'http';
    headers: Record<string, string>;
  }) => {
    if (editingServer) {
      await updateServer(editingServer.id, data);
    } else {
      await addServer({ ...data });
    }
  };

  const formatTestResult = (result: TestResult): string => {
    if (result.success) {
      return `接続成功（ツール: ${result.toolCount}個）`;
    }
    return `接続失敗: ${result.error}`;
  };

  return (
    <>
      <div className='space-y-4'>
        <div className='flex justify-between items-center mb-4'>
          <div>
            <h2 className='text-lg font-semibold tracking-tight flex items-center gap-2'>
              <Server className='w-5 h-5' />
              外部MCPサーバ
            </h2>
            <p className='text-sm text-muted-foreground'>外部ツールの接続先設定</p>
          </div>
          <Button size='sm' onClick={openAddDialog}>
            <Plus className='w-4 h-4 mr-2' />
            追加
          </Button>
        </div>
        <Card className='py-2'>
          <div className='divide-y'>
            {servers.length === 0 ? (
              <p className='text-sm text-muted-foreground text-center py-4'>MCPサーバが登録されていません</p>
            ) : (
              servers.map((server) => (
                <div key={server.id} className='p-4 space-y-2 bg-card text-card-foreground'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <div className='min-w-0'>
                        <p className='text-sm font-medium truncate'>{server.name}</p>
                        <p className='text-xs text-muted-foreground truncate'>{server.url}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-1 shrink-0'>
                      <Button
                        disabled={testingServerId === server.id}
                        size='icon'
                        title='疎通確認'
                        variant='ghost'
                        onClick={() => testConnection(server)}
                      >
                        {testingServerId === server.id ? (
                          <Loader2 className='w-4 h-4 animate-spin' />
                        ) : (
                          <Wifi className='w-4 h-4' />
                        )}
                      </Button>
                      <Button size='icon' title='編集' variant='ghost' onClick={() => openEditDialog(server)}>
                        <Pencil className='w-4 h-4' />
                      </Button>
                      <Button size='icon' title='削除' variant='ghost' onClick={() => deleteServer(server.id)}>
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                  {testResults[server.id] && (
                    <p
                      className={`text-xs px-2 py-1 rounded w-fit ${
                        testResults[server.id].success
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {testResults[server.id].success ? (
                        <Wifi className='w-3 h-3 inline mr-1' />
                      ) : (
                        <WifiOff className='w-3 h-3 inline mr-1' />
                      )}
                      {formatTestResult(testResults[server.id])}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <McpServerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingServer={editingServer}
        onSave={handleSave}
      />
    </>
  );
}
