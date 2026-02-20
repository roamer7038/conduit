import { useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { SettingsInterface } from '@/components/SettingsInterface';

function App() {
  const [view, setView] = useState<'chat' | 'settings'>('chat');

  return (
    <div className='w-[400px] h-[600px] bg-background'>
      {view === 'chat' ? (
        <ChatInterface onSettings={() => setView('settings')} />
      ) : (
        <SettingsInterface onBack={() => setView('chat')} />
      )}
    </div>
  );
}

export default App;
