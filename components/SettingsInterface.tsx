import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';

export function SettingsInterface({ onBack }: { onBack: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'baseUrl', 'modelName']).then((data) => {
      if (data.apiKey) setApiKey(data.apiKey as string);
      if (data.baseUrl) setBaseUrl(data.baseUrl as string);
      if (data.modelName) setModelName(data.modelName as string);
    });
  }, []);

  const handleSave = async () => {
    setStatus('saving');
    // Save to storage
    await chrome.storage.local.set({ apiKey, baseUrl, modelName });
    setTimeout(() => setStatus('saved'), 500);
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className='flex flex-col h-full p-4 bg-background text-foreground'>
      <div className='flex items-center gap-2 mb-6'>
        <Button variant='ghost' size='icon' onClick={onBack} className='h-8 w-8'>
          <ArrowLeft className='w-4 h-4' />
        </Button>
        <h2 className='text-xl font-bold'>Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='mcpUrl'>Base URL (Optional)</Label>
            <Input
              id='baseUrl'
              type='text'
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder='https://api.openai.com/v1'
            />
            <p className='text-xs text-muted-foreground'>
              For OpenAI Compatible providers (e.g. LocalAI, vLLM). Leave empty for default OpenAI.
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='apiKey'>OpenAI API Key</Label>
            <Input
              id='apiKey'
              type='password'
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder='sk-...'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='modelName'>Model Name (Optional)</Label>
            <Input
              id='modelName'
              type='text'
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder='gpt-5'
            />
            <p className='text-xs text-muted-foreground'>Default: gpt-5</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={status === 'saving'} className='w-full'>
            {status === 'saving' && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {status === 'saved' ? 'Saved!' : 'Save Settings'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
