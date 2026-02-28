'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquareText, Pencil, RotateCcw } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/agent/default-system-prompt';

interface SystemPromptEditorProps {
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
}

export function SystemPromptEditor({ systemPrompt, onSystemPromptChange }: SystemPromptEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(systemPrompt || '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalPrompt(systemPrompt || '');
  }, [systemPrompt]);

  const handleChange = (value: string): void => {
    setLocalPrompt(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSystemPromptChange(value);
    }, 500);
  };

  const preview = systemPrompt ? (systemPrompt.length > 80 ? systemPrompt.slice(0, 80) + '...' : systemPrompt) : null;

  return (
    <div>
      <h2 className='text-lg font-semibold tracking-tight flex items-center gap-2 mb-4'>
        <MessageSquareText className='w-5 h-5' />
        システムプロンプト
      </h2>
      <Card className='cursor-pointer hover:bg-accent/50 transition-colors' onClick={() => setDialogOpen(true)}>
        <div className='p-4 flex items-center justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            {preview ? (
              <p className='text-sm text-foreground truncate'>{preview}</p>
            ) : (
              <p className='text-sm text-muted-foreground italic'>デフォルト設定 — クリックして編集</p>
            )}
          </div>
          <Pencil className='w-4 h-4 text-muted-foreground shrink-0' />
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-2xl max-h-[80vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle>システムプロンプトの編集</DialogTitle>
            <DialogDescription>エージェントの動作を制御するシステムプロンプトを入力してください。</DialogDescription>
          </DialogHeader>
          <div className='flex-1 min-h-0'>
            <Textarea
              className='h-[50vh] text-sm font-mono resize-none overflow-y-auto'
              placeholder='エージェントに対するシステムプロンプトを入力...'
              value={localPrompt}
              onChange={(e) => handleChange(e.target.value)}
            />
          </div>
          <div className='flex items-center justify-between mt-2'>
            <p className='text-xs text-muted-foreground'>変更は自動保存されます。</p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleChange(DEFAULT_SYSTEM_PROMPT)}
              className='gap-2 text-muted-foreground hover:text-foreground'
              title='デフォルトのプロンプトに戻す'
            >
              <RotateCcw className='w-4 h-4' />
              デフォルトに戻す
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
