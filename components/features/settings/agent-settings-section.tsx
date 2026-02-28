import { useState, useMemo, useEffect } from 'react';
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
import { Puzzle, Server, Cpu } from 'lucide-react';
import type { LlmProviderConfig, AgentSettingsConfig } from '@/lib/types/agent';
import type { McpServerConfig } from '@/lib/types/settings';
import { getAllToolNames, BROWSER_TOOL_META } from '@/lib/agent/tools/tool-meta';
import { useModelSelection } from '@/hooks/use-model-selection';

interface AgentSettingsSectionProps {
  agentConfig: AgentSettingsConfig;
  providers: LlmProviderConfig[];
  mcpServers: McpServerConfig[];
  setProviderAndModel: (providerId: string, modelName: string) => void;
  toggleTool: (toolName: string, enabled: boolean) => void;
  toggleMcpServer: (serverId: string, enabled: boolean) => void;
}

export function AgentSettingsSection({
  agentConfig,
  providers,
  mcpServers,
  setProviderAndModel,
  toggleTool,
  toggleMcpServer
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

  return (
    <div className='space-y-8'>
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
              mcpServers.map((server) => (
                <div key={server.id} className='flex items-center justify-between p-4 bg-card text-card-foreground'>
                  <div className='space-y-1'>
                    <Label htmlFor={`mcp-agent-${server.id}`} className='text-sm font-medium flex items-center gap-2'>
                      {server.name}
                      <Badge variant='outline' className='text-[10px]'>
                        {server.transport.toUpperCase()}
                      </Badge>
                    </Label>
                    <p className='text-xs text-muted-foreground truncate'>{server.url}</p>
                  </div>
                  <Switch
                    id={`mcp-agent-${server.id}`}
                    checked={agentConfig.enabledMcpServers.includes(server.id)}
                    onCheckedChange={(checked) => toggleMcpServer(server.id, checked)}
                  />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
