'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAgent } from '@/hooks/use-agent';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Settings, Send, Loader2, User, Bot, History, Plus, ChevronsUp, ChevronsDown } from 'lucide-react';
import clsx from 'clsx';
import { SidePanelHeader } from '@/components/layouts/side-panel-header';
import { SidePanelLayout } from '@/components/layouts/side-panel-layout';
import { MarkdownRenderer } from './markdown-renderer';

export function ChatInterface({ onSettings, onHistory }: { onSettings: () => void; onHistory: () => void }) {
  const { messages, isLoading, sendMessage, startNewThread } = useAgent();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(false);
  const isAutoScrolling = useRef(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = useCallback(() => {
    isAutoScrolling.current = true;
    shouldAutoScroll.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      isAutoScrolling.current = false;
    }, 500);
  }, []);

  const scrollToTop = useCallback(() => {
    isAutoScrolling.current = true;
    shouldAutoScroll.current = false;
    messagesTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      isAutoScrolling.current = false;
    }, 500);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isScrollable = scrollHeight > clientHeight;
    const isAtBottom = isScrollable && distanceToBottom <= 80;

    if (!isAutoScrolling.current) {
      shouldAutoScroll.current = isAtBottom;
    }

    setShowScrollTop(scrollTop > 80);
    setShowScrollBottom(isScrollable && distanceToBottom > 80);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      scrollToBottom();
    } else {
      handleScroll();
    }
  }, [messages, isLoading, scrollToBottom, handleScroll]);

  const handleSend = () => {
    const content = inputRef.current?.value.trim();
    if (content) {
      sendMessage(content);
      if (inputRef.current) inputRef.current.value = '';
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <SidePanelLayout>
      <SidePanelHeader
        title='Browser Agent'
        leftActions={
          <>
            <Button size='icon' variant='ghost' onClick={onHistory} title='History'>
              <History className='w-4 h-4' />
            </Button>
            <Button size='icon' variant='ghost' onClick={startNewThread} title='New Chat'>
              <Plus className='w-4 h-4' />
            </Button>
          </>
        }
        rightActions={
          <Button size='icon' variant='ghost' onClick={onSettings} title='Settings'>
            <Settings className='w-4 h-4' />
          </Button>
        }
      />

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

          {messages.map((msg, idx) => {
            if (msg.role === 'user') {
              return (
                <div key={idx} className='flex justify-end mb-4'>
                  <div className='bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] text-sm whitespace-pre-wrap break-words'>
                    {msg.content}
                  </div>
                </div>
              );
            }

            if (msg.type === 'image') {
              return (
                <div key={idx} className='flex justify-start mb-4'>
                  <button
                    className='block rounded-lg overflow-hidden border shadow-sm hover:opacity-90 transition-opacity cursor-zoom-in max-w-[85%] text-left'
                    onClick={() => chrome.tabs.create({ url: msg.content })}
                    title='クリックで原寸表示'
                    type='button'
                  >
                    <img alt='Screenshot' className='max-w-full block' src={msg.content} />
                  </button>
                </div>
              );
            }

            if (msg.role === 'reasoning') {
              return (
                <div key={idx} className='flex justify-start mb-4 w-full'>
                  <Accordion type='single' collapsible className='w-full max-w-[95%]'>
                    <AccordionItem value={`reasoning-${idx}`} className='border rounded-md bg-muted/30 px-3'>
                      <AccordionTrigger className='py-2 text-xs text-muted-foreground hover:no-underline'>
                        <span className='flex items-center gap-2'>
                          <Bot className='w-3 h-3' />
                          Thinking Process
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className='text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono'>
                        {msg.content}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              );
            }

            if (msg.role === 'tool') {
              return (
                <div key={idx} className='flex justify-start mb-4 w-full'>
                  <Accordion type='single' collapsible className='w-full max-w-[95%]'>
                    <AccordionItem value={`tool-${idx}`} className='border rounded-md bg-muted/30 px-3'>
                      <AccordionTrigger className='py-2 text-xs text-muted-foreground hover:no-underline'>
                        <span className='flex items-center gap-2'>
                          <Settings className='w-3 h-3' />
                          {msg.type === 'tool_result' ? `Tool Result: ${msg.name}` : `Tool Use: ${msg.name}`}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className='text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono'>
                        {msg.content}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              );
            }

            return (
              <div key={idx} className='flex justify-start mb-4 w-full p-4'>
                <div
                  className={clsx(
                    'text-sm w-full max-w-[95%]',
                    msg.role === 'error'
                      ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 whitespace-pre-wrap'
                      : 'text-foreground'
                  )}
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {msg.role === 'error' ? msg.content : <MarkdownRenderer content={msg.content} />}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className='flex justify-start mb-4 w-full'>
              <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                <Loader2 className='w-4 h-4 animate-spin' />
                Agent is thinking...
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
      <div className='shrink-0 px-3 py-2 border-t bg-background z-10'>
        <div className='flex gap-2 items-end'>
          <Textarea
            ref={inputRef}
            className='flex-1 min-h-[36px] max-h-[120px] resize-none text-sm'
            placeholder='Type a message...'
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          <Button size='icon' onClick={handleSend} disabled={isLoading} className='h-8 w-8'>
            <Send className='w-4 h-4' />
          </Button>
        </div>
      </div>
    </SidePanelLayout>
  );
}
