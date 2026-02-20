import { useRef, useEffect } from 'react';
import { useAgent } from '@/lib/hooks/useAgent';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Settings, Send, Loader2, User, Bot, History, Plus } from 'lucide-react';
import clsx from 'clsx';

export function ChatInterface({ onSettings, onHistory }: { onSettings: () => void; onHistory: () => void }) {
  const { messages, isLoading, sendMessage, startNewThread } = useAgent();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className='flex flex-col h-full bg-background text-foreground'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b h-16 shrink-0'>
        <div className='flex gap-1 w-20'>
          <Button variant='ghost' size='icon' onClick={onHistory} title='History'>
            <History className='w-5 h-5' />
          </Button>
          <Button variant='ghost' size='icon' onClick={startNewThread} title='New Chat'>
            <Plus className='w-5 h-5' />
          </Button>
        </div>
        <h1 className='text-lg font-bold truncate text-center flex-1'>Browser Agent</h1>
        <div className='w-20 flex justify-end'>
          <Button variant='ghost' size='icon' onClick={onSettings} title='Settings'>
            <Settings className='w-5 h-5' />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className='flex-1 p-4'>
        <div className='space-y-4 pr-4'>
          {messages.length === 0 && (
            <div className='text-center text-muted-foreground mt-10'>
              <p>Hi! I'm your browser agent.</p>
              <p className='text-sm'>How can I help you today?</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={clsx('flex gap-3 max-w-[85%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto')}
            >
              <Avatar className='w-8 h-8'>
                {msg.role === 'user' ? (
                  <AvatarFallback>
                    <User className='w-4 h-4' />
                  </AvatarFallback>
                ) : (
                  <AvatarFallback>
                    <Bot className='w-4 h-4' />
                  </AvatarFallback>
                )}
              </Avatar>
              <div
                className={clsx(
                  'rounded-lg p-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.role === 'error'
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : 'bg-muted text-foreground'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className='flex gap-3 mr-auto max-w-[85%]'>
              <Avatar className='w-8 h-8'>
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
      </ScrollArea>

      {/* Input */}
      <div className='p-4 border-t bg-background'>
        <div className='flex gap-2 items-end'>
          <Textarea
            ref={inputRef}
            className='flex-1 min-h-[40px] max-h-[120px] resize-none'
            placeholder='Type a message...'
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          <Button
            size='icon'
            onClick={handleSend}
            disabled={isLoading}
            className='h-9 w-9 mb-1' // Align with textarea bottom
          >
            <Send className='w-4 h-4' />
          </Button>
        </div>
        <div className='flex justify-start mt-2'></div>
      </div>
    </div>
  );
}
