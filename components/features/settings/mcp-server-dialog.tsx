'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import type { McpServerConfig } from '@/lib/types/agent';

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

interface McpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingServer: McpServerConfig | null;
  onSave: (data: {
    name: string;
    url: string;
    transport: 'sse' | 'http';
    headers: Record<string, string>;
  }) => Promise<void>;
}

export function McpServerDialog({ open, onOpenChange, editingServer, onSave }: McpServerDialogProps) {
  const [formState, setFormState] = useState<McpFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingServer) {
        setFormState(toFormState(editingServer));
      } else {
        setFormState({ ...EMPTY_FORM });
      }
    }
  }, [open, editingServer]);

  const addHeaderRow = () => {
    setFormState((prev) => ({ ...prev, headers: [...prev.headers, { key: '', value: '' }] }));
  };

  const updateHeaderRow = (index: number, field: 'key' | 'value', val: string) => {
    setFormState((prev) => {
      const headers = [...prev.headers];
      headers[index] = { ...headers[index], [field]: val };
      return { ...prev, headers };
    });
  };

  const removeHeaderRow = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    const { name, url, transport, headers } = formState;
    if (!name.trim() || !url.trim()) return;

    setSaving(true);
    try {
      const headerRecord = headersToRecord(headers);
      await onSave({
        name: name.trim(),
        url: url.trim(),
        transport,
        headers: headerRecord
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingServer ? 'MCPサーバを編集' : 'MCPサーバを追加'}</DialogTitle>
          <DialogDescription>リモートMCPサーバの接続情報を入力してください。</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='mcp-name'>識別名</Label>
            <Input
              id='mcp-name'
              placeholder='my-mcp-server'
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='mcp-url'>URL</Label>
            <Input
              id='mcp-url'
              placeholder='https://example.com/mcp'
              type='url'
              value={formState.url}
              onChange={(e) => setFormState((prev) => ({ ...prev, url: e.target.value }))}
            />
          </div>

          <div className='space-y-2'>
            <Label>トランスポート</Label>
            <Select
              value={formState.transport}
              onValueChange={(val) => setFormState((prev) => ({ ...prev, transport: val as 'sse' | 'http' }))}
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
              <Label>ヘッダ</Label>
              <Button size='sm' type='button' variant='ghost' onClick={addHeaderRow}>
                <Plus className='w-3 h-3 mr-1' />
                追加
              </Button>
            </div>
            {formState.headers.length === 0 ? (
              <p className='text-xs text-muted-foreground'>ヘッダなし</p>
            ) : (
              formState.headers.map((header, idx) => (
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
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button disabled={saving || !formState.name.trim() || !formState.url.trim()} onClick={handleSave}>
            {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {editingServer ? '更新' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
