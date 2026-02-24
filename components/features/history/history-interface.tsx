import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { SidePanelHeader } from '@/components/layouts/side-panel-header';
import { SidePanelLayout } from '@/components/layouts/side-panel-layout';
import { MessageBus } from '@/lib/services/message/message-bus';

interface Thread {
  id: string;
  updatedAt: number;
  preview: string;
}

export function HistoryInterface({
  onBack,
  onSelectThread
}: {
  onBack: () => void;
  onSelectThread: (threadId: string) => void;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadThreads = async () => {
    setIsLoading(true);
    try {
      const threads = await MessageBus.getThreads();
      setThreads(threads);
    } catch (error) {
      console.error('Failed to load threads', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const handleDelete = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      await MessageBus.deleteThread(threadId);
      loadThreads();
    }
  };

  return (
    <SidePanelLayout>
      <SidePanelHeader
        title='History'
        leftActions={
          <Button className='h-8 w-8' size='icon' variant='ghost' onClick={onBack} title='Back'>
            <ArrowLeft className='w-4 h-4' />
          </Button>
        }
      />

      <div className='flex-1 overflow-y-auto p-4'>
        {isLoading ? (
          <div className='flex justify-center p-8'>
            <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
          </div>
        ) : threads.length === 0 ? (
          <div className='text-center text-muted-foreground mt-10'>
            <p>No conversation history found.</p>
          </div>
        ) : (
          <div className='space-y-2'>
            {threads.map((thread) => (
              <div
                key={thread.id}
                className='cursor-pointer hover:bg-muted/50 transition-colors border rounded-md p-3 flex flex-col gap-1'
                onClick={() => onSelectThread(thread.id)}
              >
                <div className='flex justify-between items-center'>
                  <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    <MessageSquare className='w-3 h-3' />
                    {format(new Date(thread.updatedAt), 'MMM d, h:mm a')}
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 -mr-2 text-muted-foreground hover:text-destructive'
                    onClick={(e) => handleDelete(thread.id, e)}
                  >
                    <Trash2 className='w-3 h-3' />
                  </Button>
                </div>
                <p className='text-sm line-clamp-2 text-foreground/90'>{thread.preview}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidePanelLayout>
  );
}
