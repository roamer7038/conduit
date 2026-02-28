import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Key, Database } from 'lucide-react';
import type { LlmProviderConfig } from '@/lib/types/agent';

interface LlmProviderSectionProps {
  providers: LlmProviderConfig[];
  addProvider: (provider: Omit<LlmProviderConfig, 'id'>) => Promise<LlmProviderConfig>;
  updateProvider: (id: string, updates: Partial<LlmProviderConfig>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
}

export function LlmProviderSection({
  providers,
  addProvider,
  updateProvider,
  deleteProvider
}: LlmProviderSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LlmProviderConfig | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    providerType: 'openai',
    baseUrl: '',
    apiKey: ''
  });

  const openAddDialog = () => {
    setEditingProvider(null);
    setFormData({ name: '', providerType: 'openai', baseUrl: '', apiKey: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (provider: LlmProviderConfig) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      providerType: provider.providerType || 'openai',
      baseUrl: provider.baseUrl || '',
      apiKey: provider.apiKey
    });
    setDialogOpen(true);
  };

  const onSave = async () => {
    const isBaseUrlRequired = formData.providerType === 'openai-compatible';
    if (!formData.name.trim() || !formData.apiKey.trim()) return;
    if (isBaseUrlRequired && !formData.baseUrl.trim()) return;

    const updates: Omit<LlmProviderConfig, 'id'> = {
      name: formData.name.trim(),
      providerType: formData.providerType,
      baseUrl: isBaseUrlRequired ? formData.baseUrl.trim() : undefined,
      apiKey: formData.apiKey.trim()
    };

    if (editingProvider) {
      await updateProvider(editingProvider.id, updates);
    } else {
      await addProvider(updates);
    }
    setDialogOpen(false);
  };

  const isFormValid = () => {
    if (!formData.name.trim() || !formData.apiKey.trim()) return false;
    if (formData.providerType === 'openai-compatible' && !formData.baseUrl.trim()) return false;
    return true;
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center mb-4'>
        <div>
          <h2 className='text-lg font-semibold tracking-tight flex items-center gap-2'>
            <Database className='w-5 h-5' />
            LLMプロバイダ設定
          </h2>
          <p className='text-sm text-muted-foreground'>AIモデルの参照先を設定</p>
        </div>
        <Button onClick={openAddDialog} size='sm'>
          <Plus className='w-4 h-4 mr-2' />
          追加
        </Button>
      </div>

      {providers.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center text-center text-muted-foreground'>
            <p className='text-sm text-muted-foreground text-center py-4'>LLMプロバイダが登録されていません</p>
          </CardContent>
        </Card>
      ) : (
        <Card className='py-2'>
          <div className='divide-y'>
            {providers.map((provider) => (
              <div key={provider.id} className='p-4 flex justify-between items-center bg-card text-card-foreground'>
                <div className='space-y-1 min-w-0 flex-1 pr-4'>
                  <p className='text-sm font-medium truncate'>{provider.name}</p>
                  <p className='text-xs text-muted-foreground truncate'>
                    {provider.providerType === 'openai' ? 'OpenAI' : 'OpenAI互換'}
                    {provider.baseUrl ? ` - ${provider.baseUrl}` : ''}
                  </p>
                  <p className='text-[10px] text-muted-foreground/70 font-mono'>
                    API Key: {provider.apiKey.substring(0, 4)}...{provider.apiKey.substring(provider.apiKey.length - 4)}
                  </p>
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                  <Button variant='ghost' size='icon' onClick={() => openEditDialog(provider)} title='編集'>
                    <Pencil className='w-4 h-4' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => deleteProvider(provider.id)}
                    title='削除'
                    className='text-red-500 hover:text-red-600 focus:ring-red-500'
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'プロバイダを編集' : 'プロバイダを追加'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>プロバイダ名 (表示用)</Label>
              <Input
                placeholder={editingProvider ? editingProvider.name : 'OpenAI'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className='space-y-2'>
              <Label>API種別</Label>
              <Select
                value={formData.providerType}
                onValueChange={(value) => setFormData({ ...formData, providerType: value })}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='API種別を選択' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='openai'>OpenAI</SelectItem>
                  <SelectItem value='openai-compatible'>OpenAI互換</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.providerType === 'openai-compatible' && (
              <div className='space-y-2'>
                <Label>
                  Base URL <span className='text-red-500'>*</span>
                </Label>
                <Input
                  placeholder='https://openrouter.ai/api/v1'
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                />
              </div>
            )}
            <div className='space-y-2'>
              <Label>
                API Key <span className='text-red-500'>*</span>
              </Label>
              <Input
                type='password'
                placeholder='sk-...'
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={onSave} disabled={!isFormValid()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
