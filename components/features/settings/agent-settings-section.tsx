import { Puzzle } from 'lucide-react';
import type { LlmProviderConfig, AgentSettingsConfig, McpServerConfig } from '@/lib/types/agent';
import { BROWSER_TOOL_META } from '@/lib/agent/tools/tool-meta';
import { SystemPromptEditor } from './system-prompt-editor';
import { ModelSelector } from './model-selector';
import { ToolToggleList } from './tool-toggle-list';
import { McpToolIntegration } from './mcp-tool-integration';

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
  return (
    <div className='space-y-8'>
      <SystemPromptEditor systemPrompt={agentConfig.systemPrompt || ''} onSystemPromptChange={setSystemPrompt} />

      <ModelSelector
        modelName={agentConfig.modelName}
        providerId={agentConfig.providerId}
        providers={providers}
        onModelChange={setProviderAndModel}
        onProviderChange={(newProviderId) => setProviderAndModel(newProviderId, '')}
      />

      <ToolToggleList
        enabledTools={agentConfig.enabledTools}
        icon={<Puzzle className='w-5 h-5' />}
        title='ブラウザ操作ツール'
        tools={BROWSER_TOOL_META}
        onToggle={toggleTool}
      />

      <McpToolIntegration
        disabledMcpTools={agentConfig.disabledMcpTools || []}
        enabledMcpServers={agentConfig.enabledMcpServers}
        mcpServers={mcpServers}
        onToggleServer={toggleMcpServer}
        onToggleTool={toggleMcpTool}
      />
    </div>
  );
}
