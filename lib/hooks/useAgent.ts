import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  type?: 'text' | 'image';
}

export function useAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>('');

  // Load message history when threadId changes
  useEffect(() => {
    if (threadId) {
      chrome.runtime
        .sendMessage({
          type: 'get_thread_history',
          threadId
        })
        .then((response) => {
          if (response.messages) {
            console.log('Raw history messages:', response.messages);
            // Verify format of messages from LangGraph state
            const formattedMessages = response.messages
              .map((m: any) => {
                // Map LangChain types to UI roles
                let role = 'user';
                if (m.type === 'ai') role = 'assistant';
                else if (m.type === 'human') role = 'user';
                else if (m.type === 'tool') role = 'tool';

                // Fallback based on ID if type is missing (handled in background, but just in case)
                if (!m.type && m.id) {
                  if (m.id.includes('AI')) role = 'assistant';
                }

                return {
                  role,
                  content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                };
              })
              .filter((m: any) => m.role === 'user' || m.role === 'assistant');

            setMessages(formattedMessages);
          }
        });
    } else {
      setMessages([]);
    }
  }, [threadId]);

  // Initial load of last active thread
  useEffect(() => {
    chrome.storage.local.get(['lastActiveThreadId']).then((data) => {
      if (data.lastActiveThreadId) {
        setThreadId(data.lastActiveThreadId as string);
      }
    });
  }, []);

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
          const content: string = response.response ?? '';
          const nextMessages: Message[] = [{ role: 'assistant', content, type: 'text' }];
          // スクリーンショットはLLMコンテキストと分離してUIのみに表示
          if (response.screenshotDataUrl) {
            nextMessages.push({ role: 'assistant', content: response.screenshotDataUrl, type: 'image' });
          }
          setMessages((prev) => [...prev, ...nextMessages]);
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

  const startNewThread = useCallback(() => {
    setThreadId('');
    setMessages([]);
    chrome.storage.local.remove('lastActiveThreadId');
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    startNewThread,
    setThreadId
  };
}
