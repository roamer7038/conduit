'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Wifi, WifiOff, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty
} from '@/components/ui/combobox';
import { getCachedModels, saveCacheWithMeta, clearModelCache } from '@/lib/agent/model-cache';
import { BROWSER_TOOL_META, TOOL_SETTINGS_STORAGE_KEY, getAllToolNames } from '@/lib/agent/tools/tool-meta';
import {
  McpServerConfig,
  getMcpServers,
  addMcpServer,
  updateMcpServer,
  deleteMcpServer,
  saveMcpServers
} from '@/lib/agent/tools/mcp-types';
import { SidePanelHeader } from '@/components/side-panel-header';
import { SidePanelLayout } from '@/components/side-panel-layout';

const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'ナビゲーション',
  content: 'コンテンツ取得',
  interaction: 'ページ操作',
  screenshot: 'スクリーンショット',
  download: 'ダウンロード',
  tab: 'タブ管理'
};

interface HeaderEntry {
  key: string;
  value: string;
}

interface McpFormState {
  name: string;
  url: string;
  transport: 'sse' | 'http';
  headers: HeaderEntry[];
}

const EMPTY_FORM: McpFormState = {
  name: '',
  url: '',
  transport: 'http',
  headers: []
};

function toFormState(server: McpServerConfig): McpFormState {
  return {
    name: server.name,
    url: server.url,
    transport: server.transport,
    headers: Object.entries(server.headers).map(([key, value]) => ({ key, value }))
  };
}

function headersToRecord(headers: HeaderEntry[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const h of headers) {
    const key = h.key.trim();
    if (key) record[key] = h.value;
  }
  return record;
}

export function SettingsInterface({ onBack }: { onBack: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set(getAllToolNames()));
  const [llmStatus, setLlmStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [toolStatus, setToolStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // MCP state
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [mcpForm, setMcpForm] = useState<McpFormState>(EMPTY_FORM);
  const [mcpSaving, setMcpSaving] = useState(false);
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Load settings
  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'baseUrl', 'modelName', TOOL_SETTINGS_STORAGE_KEY]).then((data) => {
      if (data.apiKey) setApiKey(data.apiKey as string);
      if (data.baseUrl) setBaseUrl(data.baseUrl as string);
      if (data.modelName) setModelName(data.modelName as string);
      if (Array.isArray(data[TOOL_SETTINGS_STORAGE_KEY])) {
        setEnabledTools(new Set(data[TOOL_SETTINGS_STORAGE_KEY] as string[]));
      }
    });
    loadMcpServers();
  }, []);

  const loadMcpServers = useCallback(async () => {
    const servers = await getMcpServers();
    setMcpServers(servers);
  }, []);

  // Tool toggle handlers
  const handleToolToggle = (toolName: string, checked: boolean) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (checked) next.add(toolName);
      else next.delete(toolName);
      return next;
    });
  };

  const handleSaveLlm = async () => {
    setLlmStatus('saving');
    await chrome.storage.local.set({ apiKey, baseUrl, modelName });
    setTimeout(() => setLlmStatus('saved'), 500);
    setTimeout(() => setLlmStatus('idle'), 2000);
  };

  const handleSaveTools = async () => {
    setToolStatus('saving');
    await chrome.storage.local.set({ [TOOL_SETTINGS_STORAGE_KEY]: Array.from(enabledTools) });
    setTimeout(() => setToolStatus('saved'), 500);
    setTimeout(() => setToolStatus('idle'), 2000);
  };

  // MCP handlers
  const openAddDialog = () => {
    setEditingServerId(null);
    setMcpForm({ ...EMPTY_FORM });
    setMcpDialogOpen(true);
  };

  const openEditDialog = (server: McpServerConfig) => {
    setEditingServerId(server.id);
    setMcpForm(toFormState(server));
    setMcpDialogOpen(true);
  };

  const handleMcpFormSave = async () => {
    const { name, url, transport, headers } = mcpForm;
    if (!name.trim() || !url.trim()) return;

    setMcpSaving(true);
    try {
      const headerRecord = headersToRecord(headers);
      if (editingServerId) {
        await updateMcpServer(editingServerId, {
          name: name.trim(),
          url: url.trim(),
          transport,
          headers: headerRecord
        });
      } else {
        await addMcpServer({ name: name.trim(), url: url.trim(), transport, headers: headerRecord, enabled: true });
      }
      await loadMcpServers();
      setMcpDialogOpen(false);
    } finally {
      setMcpSaving(false);
    }
  };

  const handleDeleteServer = async (id: string) => {
    await deleteMcpServer(id);
    await loadMcpServers();
  };

  const handleToggleServer = async (id: string, enabled: boolean) => {
    await updateMcpServer(id, { enabled });
    await loadMcpServers();
  };

  const handleTestConnection = async (server: McpServerConfig) => {
    setTestingServerId(server.id);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[server.id];
      return next;
    });

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'test_mcp_connection',
        server
      });
      setTestResults((prev) => ({
        ...prev,
        [server.id]: {
          success: result.success,
          message: result.success ? `接続成功（ツール: ${result.toolCount}個）` : `接続失敗: ${result.error}`
        }
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setTestResults((prev) => ({
        ...prev,
        [server.id]: { success: false, message: `エラー: ${message}` }
      }));
    } finally {
      setTestingServerId(null);
    }
  };

  // Header form helpers
  const addHeaderRow = () => {
    setMcpForm((prev) => ({ ...prev, headers: [...prev.headers, { key: '', value: '' }] }));
  };

  const updateHeaderRow = (index: number, field: 'key' | 'value', val: string) => {
    setMcpForm((prev) => {
      const headers = [...prev.headers];
      headers[index] = { ...headers[index], [field]: val };
      return { ...prev, headers };
    });
  };

  const removeHeaderRow = (index: number) => {
    setMcpForm((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index)
    }));
  };

  // Group tools by category
  const categories = Array.from(new Set(BROWSER_TOOL_META.map((t) => t.category)));

  return (
    <SidePanelLayout>
      <SidePanelHeader
        title='Settings'
        leftActions={
          <Button className='h-8 w-8' size='icon' variant='ghost' onClick={onBack} title='Back'>
            <ArrowLeft className='w-4 h-4' />
          </Button>
        }
      />

      <div className='flex-1 flex flex-col gap-4 p-4 overflow-y-auto'>
        {/* LLM Settings */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Configuration</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='baseUrl'>Base URL</Label>
              <Input
                id='baseUrl'
                placeholder='https://api.openai.com/v1'
                type='text'
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className='text-xs text-muted-foreground'>
                For OpenAI Compatible providers (e.g. LocalAI, vLLM). Leave empty for default OpenAI.
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='apiKey'>OpenAI API Key</Label>
              <Input
                id='apiKey'
                placeholder='sk-...'
                type='password'
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='modelName'>Model Name</Label>
              <Input
                id='modelName'
                placeholder='gpt-5'
                type='text'
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
              <p className='text-xs text-muted-foreground'>Default: gpt-5</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className='w-full' disabled={llmStatus === 'saving'} onClick={handleSaveLlm}>
              {llmStatus === 'saving' && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {llmStatus === 'saved' ? 'Saved!' : 'Save LLM Settings'}
            </Button>
          </CardFooter>
        </Card>

        {/* MCP Server Settings */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle>外部MCPサーバー</CardTitle>
            <Button size='sm' variant='outline' onClick={openAddDialog}>
              <Plus className='w-4 h-4 mr-1' />
              追加
            </Button>
          </CardHeader>
          <CardContent className='space-y-3'>
            {mcpServers.length === 0 ? (
              <p className='text-sm text-muted-foreground text-center py-4'>MCPサーバーが登録されていません</p>
            ) : (
              mcpServers.map((server) => (
                <div key={server.id} className='border rounded-lg p-3 space-y-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <Switch
                        checked={server.enabled}
                        id={`mcp-${server.id}`}
                        onCheckedChange={(checked) => handleToggleServer(server.id, checked)}
                      />
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
                        onClick={() => handleTestConnection(server)}
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
                      <Button size='icon' title='削除' variant='ghost' onClick={() => handleDeleteServer(server.id)}>
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                  {testResults[server.id] && (
                    <p
                      className={`text-xs px-2 py-1 rounded ${
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
                      {testResults[server.id].message}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* MCP Add / Edit Dialog */}
        <Dialog open={mcpDialogOpen} onOpenChange={setMcpDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingServerId ? 'MCPサーバーを編集' : 'MCPサーバーを追加'}</DialogTitle>
              <DialogDescription>リモートMCPサーバーの接続情報を入力してください。</DialogDescription>
            </DialogHeader>

            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='mcp-name'>識別名</Label>
                <Input
                  id='mcp-name'
                  placeholder='my-mcp-server'
                  value={mcpForm.name}
                  onChange={(e) => setMcpForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='mcp-url'>URL</Label>
                <Input
                  id='mcp-url'
                  placeholder='https://example.com/mcp'
                  type='url'
                  value={mcpForm.url}
                  onChange={(e) => setMcpForm((prev) => ({ ...prev, url: e.target.value }))}
                />
              </div>

              <div className='space-y-2'>
                <Label>トランスポート</Label>
                <Select
                  value={mcpForm.transport}
                  onValueChange={(val) => setMcpForm((prev) => ({ ...prev, transport: val as 'sse' | 'http' }))}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='http'>Streamable HTTP（推奨）</SelectItem>
                    <SelectItem value='sse'>SSE</SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-xs text-muted-foreground'>Streamable HTTPはSSEへの自動フォールバックを含みます。</p>
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label>ヘッダー</Label>
                  <Button size='sm' type='button' variant='ghost' onClick={addHeaderRow}>
                    <Plus className='w-3 h-3 mr-1' />
                    追加
                  </Button>
                </div>
                {mcpForm.headers.length === 0 ? (
                  <p className='text-xs text-muted-foreground'>ヘッダーなし</p>
                ) : (
                  mcpForm.headers.map((header, idx) => (
                    <div key={idx} className='flex items-center gap-2'>
                      <Input
                        className='flex-1'
                        placeholder='Key'
                        value={header.key}
                        onChange={(e) => updateHeaderRow(idx, 'key', e.target.value)}
                      />
                      <Input
                        className='flex-1'
                        placeholder='Value'
                        value={header.value}
                        onChange={(e) => updateHeaderRow(idx, 'value', e.target.value)}
                      />
                      <Button size='icon' type='button' variant='ghost' onClick={() => removeHeaderRow(idx)}>
                        <X className='w-4 h-4' />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' onClick={() => setMcpDialogOpen(false)}>
                キャンセル
              </Button>
              <Button disabled={mcpSaving || !mcpForm.name.trim() || !mcpForm.url.trim()} onClick={handleMcpFormSave}>
                {mcpSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {editingServerId ? '更新' : '追加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tool Toggle Settings */}
        <Card>
          <CardHeader>
            <CardTitle>組込みツール</CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            {categories.map((category) => (
              <div key={category}>
                <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3'>
                  {CATEGORY_LABELS[category] ?? category}
                </p>
                <div className='space-y-3'>
                  {BROWSER_TOOL_META.filter((t) => t.category === category).map((tool) => (
                    <div key={tool.name} className='flex items-start gap-3'>
                      <Switch
                        checked={enabledTools.has(tool.name)}
                        id={tool.name}
                        onCheckedChange={(checked) => handleToolToggle(tool.name, checked)}
                      />
                      <div className='flex flex-col gap-0.5'>
                        <Label className='cursor-pointer leading-none' htmlFor={tool.name}>
                          {tool.label}
                        </Label>
                        <p className='text-xs text-muted-foreground'>{tool.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button className='w-full' disabled={toolStatus === 'saving'} onClick={handleSaveTools}>
              {toolStatus === 'saving' && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {toolStatus === 'saved' ? 'Saved!' : 'Save Tool Settings'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </SidePanelLayout>
  );
}
