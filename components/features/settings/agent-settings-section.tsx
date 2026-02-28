import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  useComboboxAnchor
} from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Puzzle, Server, Cpu, Loader2, MessageSquareText, Pencil } from 'lucide-react';
import type { LlmProviderConfig, AgentSettingsConfig, McpToolInfo } from '@/lib/types/agent';
import type { McpServerConfig } from '@/lib/types/settings';
import { getAllToolNames, BROWSER_TOOL_META } from '@/lib/agent/tools/tool-meta';
import { useModelSelection } from '@/hooks/use-model-selection';
import { MessageBus } from '@/lib/services/message/message-bus';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface AgentSettingsSectionProps {
  agentConfig: AgentSettingsConfig;
  providers: LlmProviderConfig[];
  mcpServers: McpServerConfig[];
  setProviderAndModel: (providerId: string, modelName: string) => void;
  setSystemPrompt: (prompt: string) => void;
  toggleTool: (toolName: string, enabled: boolean) => void;
  toggleMcpServer: (serverId: string, enabled: boolean) => void;
  toggleMcpTool: (toolName: string, enabled: boolean) => void;
}

export function AgentSettingsSection({
  agentConfig,
  providers,
  mcpServers,
  setProviderAndModel,
  setSystemPrompt,
  toggleTool,
  toggleMcpServer,
  toggleMcpTool
}: AgentSettingsSectionProps) {
  const currentProvider = providers.find((p) => p.id === agentConfig.providerId);

  // Use model selection hook scoped to the selected provider
  const { availableModels, modelsLoading, handleRefreshModels } = useModelSelection(agentConfig.providerId);
  const allToolNames = getAllToolNames();

  const [inputValue, setInputValue] = useState(agentConfig.modelName || '');

  // Keep the input value in sync when the underlying model configuration changes
  useEffect(() => {
    setInputValue(agentConfig.modelName || '');
  }, [agentConfig.modelName]);

  const filteredModels = useMemo(() => {
    if (!inputValue) return availableModels;
    const lower = inputValue.toLowerCase();
    return availableModels.filter((m) => m.toLowerCase().includes(lower));
  }, [availableModels, inputValue]);

  const onProviderSelect = (newProviderId: string) => {
    // When changing provider, clear the model selection to avoid invalid state.
    setProviderAndModel(newProviderId, '');
  };

  const onModelSelect = (newModelName: string) => {
    setProviderAndModel(agentConfig.providerId, newModelName);
    setInputValue(newModelName);
  };

  const comboboxAnchor = useComboboxAnchor();

  // --- MCP Tool Discovery ---
  const [mcpToolsByServer, setMcpToolsByServer] = useState<Record<string, McpToolInfo[]>>({});
  const [mcpToolsLoading, setMcpToolsLoading] = useState<Record<string, boolean>>({});

  const fetchToolsForServer = useCallback(
    async (serverId: string) => {
      if (mcpToolsByServer[serverId] || mcpToolsLoading[serverId]) return;
      setMcpToolsLoading((prev) => ({ ...prev, [serverId]: true }));
      try {
        const tools = await MessageBus.fetchMcpTools(serverId);
        setMcpToolsByServer((prev) => ({ ...prev, [serverId]: tools }));
      } catch (error) {
        console.error(`Failed to fetch MCP tools for server ${serverId}:`, error);
        setMcpToolsByServer((prev) => ({ ...prev, [serverId]: [] }));
      } finally {
        setMcpToolsLoading((prev) => ({ ...prev, [serverId]: false }));
      }
    },
    [mcpToolsByServer, mcpToolsLoading]
  );

  // Auto-fetch tools when a server is enabled
  useEffect(() => {
    for (const serverId of agentConfig.enabledMcpServers) {
      if (!mcpToolsByServer[serverId] && !mcpToolsLoading[serverId]) {
        fetchToolsForServer(serverId);
      }
    }
  }, [agentConfig.enabledMcpServers, fetchToolsForServer, mcpToolsByServer, mcpToolsLoading]);

  // --- System Prompt Modal ---
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(agentConfig.systemPrompt || '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalSystemPrompt(agentConfig.systemPrompt || '');
  }, [agentConfig.systemPrompt]);

  const handleSystemPromptChange = (value: string) => {
    setLocalSystemPrompt(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSystemPrompt(value);
    }, 500);
  };

  const promptPreview = agentConfig.systemPrompt
    ? agentConfig.systemPrompt.length > 80
      ? agentConfig.systemPrompt.slice(0, 80) + '...'
      : agentConfig.systemPrompt
    : null;

  return (
    <div className='space-y-8'>
      {/* システムプロンプト */}
      <div>
        <h2 className='text-lg font-semibold tracking-tight flex items-center gap-2 mb-4'>
          <MessageSquareText className='w-5 h-5' />
          システムプロンプト
        </h2>
        <Card className='cursor-pointer hover:bg-accent/50 transition-colors' onClick={() => setPromptDialogOpen(true)}>
          <div className='p-4 flex items-center justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              {promptPreview ? (
                <p className='text-sm text-foreground truncate'>{promptPreview}</p>
              ) : (
                <p className='text-sm text-muted-foreground italic'>未設定 — クリックして編集</p>
              )}
            </div>
            <Pencil className='w-4 h-4 text-muted-foreground shrink-0' />
          </div>
        </Card>

        <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
          <DialogContent className='sm:max-w-2xl max-h-[80vh] flex flex-col'>
            <DialogHeader>
              <DialogTitle>システムプロンプトの編集</DialogTitle>
              <DialogDescription>エージェントの動作を制御するシステムプロンプトを入力してください。</DialogDescription>
            </DialogHeader>
            <div className='flex-1 min-h-0'>
              <Textarea
                className='h-[50vh] text-sm font-mono resize-none overflow-y-auto'
                placeholder='エージェントに対するシステムプロンプトを入力...'
                value={localSystemPrompt}
                onChange={(e) => handleSystemPromptChange(e.target.value)}
              />
            </div>
            <p className='text-xs text-muted-foreground'>変更は自動保存されます。</p>
          </DialogContent>
        </Dialog>
      </div>

      {/* モデル設定 */}
      <div>
        <h2 className='text-lg font-semibold tracking-tight flex items-center gap-2 mb-4'>
          <Cpu className='w-5 h-5' />
          モデル設定
        </h2>
        <Card>
          <div className='p-4 space-y-4'>
            <div className='space-y-2'>
              <Label>利用するプロバイダ</Label>
              <Select value={agentConfig.providerId || ''} onValueChange={onProviderSelect}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='プロバイダを選択' />
                </SelectTrigger>
                <SelectContent>
                  {providers.length === 0 && (
                    <SelectItem value='none' disabled>
                      プロバイダが未登録です
                    </SelectItem>
                  )}
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label>利用するモデル</Label>
                {currentProvider && (
                  <button type='button' onClick={handleRefreshModels} className='text-xs text-blue-500 hover:underline'>
                    モデルリストを更新
                  </button>
                )}
              </div>

              <Combobox
                disabled={!currentProvider || modelsLoading}
                value={agentConfig.modelName || ''}
                onValueChange={(val) => {
                  if (typeof val === 'string' && val.trim() !== '') {
                    onModelSelect(val);
                  } else if (val && typeof val === 'object' && 'value' in val) {
                    onModelSelect((val as any).value as string);
                  }
                }}
                inputValue={inputValue}
                onInputValueChange={(newVal) => {
                  setInputValue(newVal || '');
                }}
              >
                <div ref={comboboxAnchor}>
                  <ComboboxInput
                    placeholder={
                      modelsLoading
                        ? 'Loading models...'
                        : currentProvider
                          ? 'モデルを検索・選択...'
                          : 'プロバイダを選択してください'
                    }
                    className='w-full bg-background [&_input]:text-sm'
                  />
                </div>
                {!modelsLoading && currentProvider && (
                  <ComboboxContent anchor={comboboxAnchor.current} className='w-[var(--anchor-width)]'>
                    {filteredModels.length === 0 ? (
                      <ComboboxEmpty>モデルが見つかりません</ComboboxEmpty>
                    ) : (
                      <ComboboxList>
                        {filteredModels.slice(0, 100).map((model) => (
                          <ComboboxItem key={model} value={model}>
                            {model}
                          </ComboboxItem>
                        ))}
                        {filteredModels.length > 100 && (
                          <div className='p-2 text-xs text-center text-muted-foreground border-t bg-muted/20'>
                            さらに {filteredModels.length - 100} 件のモデルが隠れています...
                          </div>
                        )}
                      </ComboboxList>
                    )}
                  </ComboboxContent>
                )}
              </Combobox>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className='text-lg font-semibold tracking-tight flex items-center gap-2 mb-4'>
          <Puzzle className='w-5 h-5' />
          ブラウザ操作ツール
        </h2>
        <Card className='py-2'>
          <div className='divide-y'>
            {BROWSER_TOOL_META.map((tool) => (
              <div key={tool.name} className='flex items-center justify-between p-4 bg-card text-card-foreground'>
                <div className='space-y-1'>
                  <Label htmlFor={`tool-${tool.name}`} className='text-sm font-medium'>
                    {tool.label} <span className='text-xs text-muted-foreground font-normal'>({tool.name})</span>
                  </Label>
                  <p className='text-xs text-muted-foreground'>{tool.description}</p>
                </div>
                <Switch
                  id={`tool-${tool.name}`}
                  checked={agentConfig.enabledTools.includes(tool.name)}
                  onCheckedChange={(checked) => toggleTool(tool.name, checked)}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <h2 className='text-lg font-semibold tracking-tight flex items-center gap-2 mb-4'>
          <Server className='w-5 h-5' />
          MCPツール連携
        </h2>
        <Card className='py-2'>
          <div className='divide-y'>
            {mcpServers.length === 0 ? (
              <p className='text-sm text-muted-foreground p-4'>
                MCPサーバが登録されていません。「MCPサーバ」設定から追加してください。
              </p>
            ) : (
              mcpServers.map((server) => {
                const isEnabled = agentConfig.enabledMcpServers.includes(server.id);
                const serverTools = mcpToolsByServer[server.id];
                const isToolsLoading = mcpToolsLoading[server.id];
                const disabledMcpTools = agentConfig.disabledMcpTools || [];

                return (
                  <div key={server.id} className='bg-card text-card-foreground'>
                    <div className='flex items-center justify-between p-4'>
                      <div className='space-y-1'>
                        <Label
                          htmlFor={`mcp-agent-${server.id}`}
                          className='text-sm font-medium flex items-center gap-2'
                        >
                          {server.name}
                          <Badge variant='outline' className='text-[10px]'>
                            {server.transport.toUpperCase()}
                          </Badge>
                        </Label>
                        <p className='text-xs text-muted-foreground truncate'>{server.url}</p>
                      </div>
                      <Switch
                        id={`mcp-agent-${server.id}`}
                        checked={isEnabled}
                        onCheckedChange={(checked) => toggleMcpServer(server.id, checked)}
                      />
                    </div>

                    {isEnabled && (
                      <div className='px-4 pb-4'>
                        {isToolsLoading ? (
                          <div className='flex items-center gap-2 text-xs text-muted-foreground py-2'>
                            <Loader2 className='w-3 h-3 animate-spin' />
                            ツールを取得中...
                          </div>
                        ) : serverTools && serverTools.length > 0 ? (
                          <Accordion type='single' collapsible>
                            <AccordionItem value={`mcp-tools-${server.id}`} className='border rounded-md'>
                              <AccordionTrigger className='px-3 py-2 text-xs text-muted-foreground hover:no-underline'>
                                ツール一覧（{serverTools.length}個）
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className='divide-y'>
                                  {serverTools.map((tool) => (
                                    <div key={tool.name} className='flex items-center justify-between px-3 py-2'>
                                      <div className='space-y-0.5 min-w-0 flex-1 mr-3'>
                                        <p className='text-xs font-medium truncate'>{tool.name}</p>
                                        {tool.description && (
                                          <p className='text-[11px] text-muted-foreground line-clamp-2'>
                                            {tool.description}
                                          </p>
                                        )}
                                      </div>
                                      <Switch
                                        checked={!disabledMcpTools.includes(tool.name)}
                                        onCheckedChange={(checked) => toggleMcpTool(tool.name, checked)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ) : serverTools && serverTools.length === 0 ? (
                          <p className='text-xs text-muted-foreground py-2'>このサーバにはツールがありません。</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
