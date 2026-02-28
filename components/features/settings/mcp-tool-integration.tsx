'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Server, Loader2 } from 'lucide-react';
import type { McpServerConfig, McpToolInfo } from '@/lib/types/agent';
import { MessageBus } from '@/lib/services/message/message-bus';

interface McpToolIntegrationProps {
  mcpServers: McpServerConfig[];
  enabledMcpServers: string[];
  disabledMcpTools: string[];
  onToggleServer: (serverId: string, enabled: boolean) => void;
  onToggleTool: (toolName: string, enabled: boolean) => void;
}

export function McpToolIntegration({
  mcpServers,
  enabledMcpServers,
  disabledMcpTools,
  onToggleServer,
  onToggleTool
}: McpToolIntegrationProps) {
  const [toolsByServer, setToolsByServer] = useState<Record<string, McpToolInfo[]>>({});
  const [toolsLoading, setToolsLoading] = useState<Record<string, boolean>>({});

  const fetchToolsForServer = useCallback(
    async (serverId: string) => {
      if (toolsByServer[serverId] || toolsLoading[serverId]) return;
      setToolsLoading((prev) => ({ ...prev, [serverId]: true }));
      try {
        const tools = await MessageBus.fetchMcpTools(serverId);
        setToolsByServer((prev) => ({ ...prev, [serverId]: tools }));
      } catch (error) {
        console.error(`Failed to fetch MCP tools for server ${serverId}:`, error);
        setToolsByServer((prev) => ({ ...prev, [serverId]: [] }));
      } finally {
        setToolsLoading((prev) => ({ ...prev, [serverId]: false }));
      }
    },
    [toolsByServer, toolsLoading]
  );

  useEffect(() => {
    for (const serverId of enabledMcpServers) {
      if (!toolsByServer[serverId] && !toolsLoading[serverId]) {
        fetchToolsForServer(serverId);
      }
    }
  }, [enabledMcpServers, fetchToolsForServer, toolsByServer, toolsLoading]);

  return (
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
              const isEnabled = enabledMcpServers.includes(server.id);
              const serverTools = toolsByServer[server.id];
              const isToolsLoading = toolsLoading[server.id];

              return (
                <div key={server.id} className='bg-card text-card-foreground'>
                  <div className='flex items-center justify-between p-4'>
                    <div className='space-y-1'>
                      <Label className='text-sm font-medium flex items-center gap-2' htmlFor={`mcp-agent-${server.id}`}>
                        {server.name}
                        <Badge className='text-[10px]' variant='outline'>
                          {server.transport.toUpperCase()}
                        </Badge>
                      </Label>
                      <p className='text-xs text-muted-foreground truncate'>{server.url}</p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      id={`mcp-agent-${server.id}`}
                      onCheckedChange={(checked) => onToggleServer(server.id, checked)}
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
                        <Accordion collapsible type='single'>
                          <AccordionItem className='border rounded-md' value={`mcp-tools-${server.id}`}>
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
                                      onCheckedChange={(checked) => onToggleTool(tool.name, checked)}
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
  );
}
