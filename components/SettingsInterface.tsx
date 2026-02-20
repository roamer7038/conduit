'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { BROWSER_TOOL_META, TOOL_SETTINGS_STORAGE_KEY, getAllToolNames } from '@/lib/agent/tools/tool-meta';

const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'ナビゲーション',
  content: 'コンテンツ取得',
  interaction: 'ページ操作',
  screenshot: 'スクリーンショット',
  download: 'ダウンロード',
  tab: 'タブ管理'
};

export function SettingsInterface({ onBack }: { onBack: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set(getAllToolNames()));
  const [llmStatus, setLlmStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [toolStatus, setToolStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'baseUrl', 'modelName', TOOL_SETTINGS_STORAGE_KEY]).then((data) => {
      if (data.apiKey) setApiKey(data.apiKey as string);
      if (data.baseUrl) setBaseUrl(data.baseUrl as string);
      if (data.modelName) setModelName(data.modelName as string);
      if (Array.isArray(data[TOOL_SETTINGS_STORAGE_KEY])) {
        setEnabledTools(new Set(data[TOOL_SETTINGS_STORAGE_KEY] as string[]));
      }
    });
  }, []);

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

  // Group tools by category
  const categories = Array.from(new Set(BROWSER_TOOL_META.map((t) => t.category)));

  return (
    <div className='flex flex-col h-full bg-background text-foreground overflow-y-auto'>
      <div className='flex items-center gap-2 p-4 border-b'>
        <Button className='h-8 w-8' size='icon' variant='ghost' onClick={onBack}>
          <ArrowLeft className='w-4 h-4' />
        </Button>
        <h2 className='text-xl font-bold'>Settings</h2>
      </div>

      <div className='flex flex-col gap-4 p-4'>
        {/* LLM Settings */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Configuration</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='baseUrl'>Base URL (Optional)</Label>
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
              <Label htmlFor='modelName'>Model Name (Optional)</Label>
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
            <Button disabled={llmStatus === 'saving'} className='w-full' onClick={handleSaveLlm}>
              {llmStatus === 'saving' && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {llmStatus === 'saved' ? 'Saved!' : 'Save LLM Settings'}
            </Button>
          </CardFooter>
        </Card>

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
            <Button disabled={toolStatus === 'saving'} className='w-full' onClick={handleSaveTools}>
              {toolStatus === 'saving' && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {toolStatus === 'saved' ? 'Saved!' : 'Save Tool Settings'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
