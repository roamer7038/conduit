'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAgent } from '@/lib/hooks/useAgent';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Settings, Send, Loader2, User, Bot, History, Plus, ChevronsUp, ChevronsDown } from 'lucide-react';
import clsx from 'clsx';

export function ChatInterface({ onSettings, onHistory }: { onSettings: () => void; onHistory: () => void }) {
  const { messages, isLoading, sendMessage, startNewThread } = useAgent();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToTop = useCallback(() => {
    messagesTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setShowScrollTop(scrollTop > 80);
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 80);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = () => {
    const content = inputRef.current?.value.trim();
    if (content) {
      sendMessage(content);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className='flex flex-col h-full bg-background text-foreground overflow-hidden'>
      {/* Header（固定） */}
      <div className='flex items-center justify-between px-4 border-b h-14 shrink-0 bg-background z-10'>
        <div className='flex gap-1'>
          <Button variant='ghost' size='icon' onClick={onHistory} title='History'>
            <History className='w-5 h-5' />
          </Button>
          <Button variant='ghost' size='icon' onClick={startNewThread} title='New Chat'>
            <Plus className='w-5 h-5' />
          </Button>
        </div>
        <h1 className='text-base font-bold truncate text-center flex-1'>Browser Agent</h1>
        <Button variant='ghost' size='icon' onClick={onSettings} title='Settings'>
          <Settings className='w-5 h-5' />
        </Button>
      </div>

      {/* Messages（スクロール可能エリア） */}
      <div ref={scrollContainerRef} className='flex-1 overflow-y-auto px-4 py-4' onScroll={handleScroll}>
        <div ref={messagesTopRef} />

        <div className='space-y-4'>
          {messages.length === 0 && (
            <div className='text-center text-muted-foreground mt-10'>
              <p>Hi! I&apos;m your browser agent.</p>
              <p className='text-sm'>How can I help you today?</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={clsx('flex gap-3 max-w-[90%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto')}
            >
              <Avatar className='w-8 h-8 shrink-0'>
                <AvatarFallback>
                  {msg.role === 'user' ? <User className='w-4 h-4' /> : <Bot className='w-4 h-4' />}
                </AvatarFallback>
              </Avatar>
              {msg.type === 'image' ? (
                <button
                  className='block rounded-lg overflow-hidden border shadow-sm hover:opacity-90 transition-opacity cursor-zoom-in max-w-full text-left'
                  onClick={() => chrome.tabs.create({ url: msg.content })}
                  title='クリックで原寸表示'
                  type='button'
                >
                  <img alt='Screenshot' className='max-w-full block' src={msg.content} />
                </button>
              ) : (
                <div
                  className={clsx(
                    'rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : msg.role === 'error'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-muted text-foreground'
                  )}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className='flex gap-3 mr-auto max-w-[90%]'>
              <Avatar className='w-8 h-8 shrink-0'>
                <AvatarFallback>
                  <Bot className='w-4 h-4' />
                </AvatarFallback>
              </Avatar>
              <div className='bg-muted rounded-lg p-3'>
                <Loader2 className='w-4 h-4 animate-spin' />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* スクロールジャンプボタン */}
        {(showScrollTop || showScrollBottom) && (
          <div className='fixed bottom-24 right-4 flex flex-col gap-1.5 z-20'>
            {showScrollTop && (
              <Button
                size='icon'
                variant='secondary'
                className='h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100'
                onClick={scrollToTop}
                title='先頭へ'
              >
                <ChevronsUp className='w-4 h-4' />
              </Button>
            )}
            {showScrollBottom && (
              <Button
                size='icon'
                variant='secondary'
                className='h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100'
                onClick={scrollToBottom}
                title='末尾へ'
              >
                <ChevronsDown className='w-4 h-4' />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Input エリア（固定） */}
      <div className='shrink-0 px-4 py-3 border-t bg-background z-10'>
        <div className='flex gap-2 items-end'>
          <Textarea
            ref={inputRef}
            className='flex-1 min-h-[40px] max-h-[120px] resize-none'
            placeholder='Type a message...'
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          <Button size='icon' onClick={handleSend} disabled={isLoading} className='h-9 w-9 mb-1'>
            <Send className='w-4 h-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
