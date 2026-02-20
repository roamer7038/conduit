import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

export function useAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>('');

  const sendMessage = useCallback(
    async (content: string) => {
      setIsLoading(true);
      setMessages((prev) => [...prev, { role: 'user', content }]);

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'chat_message',
          message: {
            role: 'user',
            content
          },
          threadId // Send current threadId, background will generate if empty
        });

        if (response.error) {
          setMessages((prev) => [...prev, { role: 'error', content: response.error }]);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: response.response }]);
          if (response.threadId) {
            setThreadId(response.threadId);
          }
        }
      } catch (error: any) {
        setMessages((prev) => [...prev, { role: 'error', content: error.message || 'Failed to send message' }]);
      } finally {
        setIsLoading(false);
      }
    },
    [threadId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setThreadId(uuidv4()); // Start new thread
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    threadId
  };
}
