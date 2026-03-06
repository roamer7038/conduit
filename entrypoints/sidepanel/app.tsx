import { useState } from 'react';
import { ChatInterface } from '@/components/features/chat/chat-interface';
import { SettingsInterface } from '@/components/features/settings/setting-interface';
import { HistoryInterface } from '@/components/features/history/history-interface';
import { ThreadRepository } from '@/lib/services/storage/repositories/thread-repository';

function App() {
  const [view, setView] = useState<'chat' | 'settings' | 'history'>('chat');

  const handleSelectThread = async (threadId: string) => {
    await ThreadRepository.setLastActiveId(threadId);
    setView('chat');
  };

  return (
    <div className='w-full h-screen bg-background overflow-hidden'>
      {view === 'chat' ? (
        <ChatInterface onSettings={() => setView('settings')} onHistory={() => setView('history')} />
      ) : view === 'settings' ? (
        <SettingsInterface onBack={() => setView('chat')} />
      ) : (
        <HistoryInterface onBack={() => setView('chat')} onSelectThread={handleSelectThread} />
      )}
    </div>
  );
}

export default App;
