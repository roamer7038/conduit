import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Database, Server } from 'lucide-react';
import { SidePanelHeader } from '@/components/layouts/side-panel-header';
import { SidePanelLayout } from '@/components/layouts/side-panel-layout';
import { useLlmProviders } from '@/hooks/use-llm-providers';
import { useAgentSettings } from '@/hooks/use-agent-settings';
import { useMcpServers } from '@/hooks/use-mcp-servers';
import { LlmProviderSection } from './llm-provider-section';
import { AgentSettingsSection } from './agent-settings-section';
import { McpServerSection } from './mcp-server-section';
import { cn } from '@/lib/utils';

type SettingsPage = 'menu' | 'provider' | 'mcp' | 'agent';

export function SettingsInterface({ onBack }: { onBack: () => void }) {
  const [activePage, setActivePage] = useState<SettingsPage>('menu');

  const { providers, addProvider, updateProvider, deleteProvider } = useLlmProviders();
  const { config: agentConfig, setProviderAndModel, toggleTool, toggleMcpServer } = useAgentSettings();
  const mcpServerProps = useMcpServers();

  const renderMenuContent = () => (
    <div className='flex flex-col gap-3 p-4'>
      <Button
        variant='outline'
        className='h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-accent'
        onClick={() => setActivePage('provider')}
      >
        <Database className='w-6 h-6' />
        <span className='font-medium'>LLMプロバイダ</span>
        <span className='text-xs text-muted-foreground font-normal'>モデルのAPIキーやURLの設定</span>
      </Button>

      <Button
        variant='outline'
        className='h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-accent'
        onClick={() => setActivePage('mcp')}
      >
        <Server className='w-6 h-6' />
        <span className='font-medium'>MCPサーバ</span>
        <span className='text-xs text-muted-foreground font-normal'>外部ツールの接続先設定</span>
      </Button>

      <Button
        variant='outline'
        className='h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-accent'
        onClick={() => setActivePage('agent')}
      >
        <Settings className='w-6 h-6' />
        <span className='font-medium'>エージェント設定</span>
        <span className='text-xs text-muted-foreground font-normal'>使用モデルとツールの選択</span>
      </Button>
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case 'menu':
        return renderMenuContent();
      case 'provider':
        return (
          <div className='p-4'>
            <LlmProviderSection
              providers={providers}
              addProvider={addProvider}
              updateProvider={updateProvider}
              deleteProvider={deleteProvider}
            />
          </div>
        );
      case 'mcp':
        return (
          <div className='p-4'>
            <McpServerSection {...mcpServerProps} />
          </div>
        );
      case 'agent':
        return (
          <div className='p-4'>
            <AgentSettingsSection
              agentConfig={agentConfig}
              providers={providers}
              mcpServers={mcpServerProps.servers}
              setProviderAndModel={setProviderAndModel}
              toggleTool={toggleTool}
              toggleMcpServer={toggleMcpServer}
            />
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (activePage) {
      case 'menu':
        return 'Settings';
      case 'provider':
        return 'LLMプロバイダ';
      case 'mcp':
        return 'MCPサーバ';
      case 'agent':
        return 'エージェント設定';
    }
  };

  const handleBack = () => {
    if (activePage === 'menu') {
      onBack();
    } else {
      setActivePage('menu');
    }
  };

  return (
    <SidePanelLayout>
      <SidePanelHeader
        title={getTitle()}
        leftActions={
          <Button className='h-8 w-8' size='icon' variant='ghost' onClick={handleBack} title='Back'>
            <ArrowLeft className='w-4 h-4' />
          </Button>
        }
      />
      <div className='flex-1 overflow-y-auto bg-background'>{renderContent()}</div>
    </SidePanelLayout>
  );
}
