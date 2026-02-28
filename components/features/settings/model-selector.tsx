'use client';

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
import { Cpu } from 'lucide-react';
import type { LlmProviderConfig } from '@/lib/types/agent';
import { useModelSelection } from '@/hooks/use-model-selection';

interface ModelSelectorProps {
  providerId: string;
  modelName: string;
  providers: LlmProviderConfig[];
  onProviderChange: (providerId: string) => void;
  onModelChange: (providerId: string, modelName: string) => void;
}

export function ModelSelector({
  providerId,
  modelName,
  providers,
  onProviderChange,
  onModelChange
}: ModelSelectorProps) {
  const currentProvider = providers.find((p) => p.id === providerId);
  const { availableModels, modelsLoading, handleRefreshModels } = useModelSelection(providerId);

  const [inputValue, setInputValue] = useState(modelName || '');

  useEffect(() => {
    setInputValue(modelName || '');
  }, [modelName]);

  const filteredModels = useMemo(() => {
    if (!inputValue) return availableModels;
    const lower = inputValue.toLowerCase();
    return availableModels.filter((m) => m.toLowerCase().includes(lower));
  }, [availableModels, inputValue]);

  const onProviderSelect = (newProviderId: string): void => {
    onProviderChange(newProviderId);
  };

  const onModelSelect = (newModelName: string): void => {
    onModelChange(providerId, newModelName);
    setInputValue(newModelName);
  };

  const comboboxAnchor = useComboboxAnchor();

  return (
    <div>
      <h2 className='text-lg font-semibold tracking-tight flex items-center gap-2 mb-4'>
        <Cpu className='w-5 h-5' />
        モデル設定
      </h2>
      <Card>
        <div className='p-4 space-y-4'>
          <div className='space-y-2'>
            <Label>利用するプロバイダ</Label>
            <Select value={providerId || ''} onValueChange={onProviderSelect}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='プロバイダを選択' />
              </SelectTrigger>
              <SelectContent>
                {providers.length === 0 && (
                  <SelectItem disabled value='none'>
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
                <button className='text-xs text-blue-500 hover:underline' type='button' onClick={handleRefreshModels}>
                  モデルリストを更新
                </button>
              )}
            </div>

            <Combobox
              disabled={!currentProvider || modelsLoading}
              inputValue={inputValue}
              value={modelName || ''}
              onInputValueChange={(newVal) => {
                setInputValue(newVal || '');
              }}
              onValueChange={(val) => {
                if (typeof val === 'string' && val.trim() !== '') {
                  onModelSelect(val);
                } else if (val && typeof val === 'object' && 'value' in val) {
                  onModelSelect((val as any).value as string);
                }
              }}
            >
              <div ref={comboboxAnchor}>
                <ComboboxInput
                  className='w-full bg-background [&_input]:text-sm'
                  placeholder={
                    modelsLoading
                      ? 'Loading models...'
                      : currentProvider
                        ? 'モデルを検索・選択...'
                        : 'プロバイダを選択してください'
                  }
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
  );
}
