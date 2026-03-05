import { useEffect } from 'react';
import { useAgentStore } from '@/lib/store/agent-store';

export function useAgent() {
  const messages = useAgentStore((state) => state.messages);
  const isLoading = useAgentStore((state) => state.isLoading);
  const threadId = useAgentStore((state) => state.threadId);
  const tokenUsage = useAgentStore((state) => state.tokenUsage);

  const sendMessage = useAgentStore((state) => state.sendMessage);
  const startNewThread = useAgentStore((state) => state.startNewThread);
  const switchThread = useAgentStore((state) => state.switchThread);
  const abortGeneration = useAgentStore((state) => state.abortGeneration);
  const initializeLastActiveThread = useAgentStore((state) => state.initializeLastActiveThread);

  // Initial load of last active thread
  useEffect(() => {
    initializeLastActiveThread();
  }, [initializeLastActiveThread]);

  return {
    messages,
    isLoading,
    sendMessage,
    startNewThread,
    setThreadId: switchThread,
    tokenUsage,
    abortGeneration
  };
}
