import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  role: 'user' | 'assistant' | 'error' | 'tool' | 'reasoning';
  content: string;
  type?: 'text' | 'image' | 'tool_call' | 'tool_result' | 'reasoning';
  name?: string;
}

function parseMessages(rawMessages: any[]): Message[] {
  return rawMessages.flatMap((m: any) => {
    const msgs: Message[] = [];
    const msgType =
      (typeof m.getType === 'function' ? m.getType() : m.type) ||
      (m.id?.includes('AI') ? 'ai' : m.id?.includes('Human') ? 'human' : null);

    if (msgType === 'human') {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      msgs.push({ role: 'user', content, type: 'text' });
    } else if (msgType === 'ai') {
      if (m.additional_kwargs?.reasoning_content) {
        msgs.push({ role: 'reasoning', content: m.additional_kwargs.reasoning_content, type: 'reasoning' });
      }
      if (m.tool_calls && m.tool_calls.length > 0) {
        m.tool_calls.forEach((tc: any) => {
          msgs.push({ role: 'tool', content: JSON.stringify(tc.args), name: tc.name, type: 'tool_call' });
        });
      }
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      if (content && content.trim() && content !== '""' && content !== '{}') {
        msgs.push({ role: 'assistant', content, type: 'text' });
      }
    } else if (msgType === 'tool') {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      msgs.push({ role: 'tool', content, name: m.name, type: 'tool_result' });
    }
    return msgs;
  });
}

function getFinalMessages(response: any): Message[] {
  if (!response.messages) return [];
  const formattedMessages = parseMessages(response.messages);
  const screenshots: string[] = response.screenshots ?? [];
  const screenshotMessages: Message[] = screenshots.map((url) => ({
    role: 'assistant',
    content: url,
    type: 'image'
  }));
  return [...formattedMessages, ...screenshotMessages];
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
          setMessages(getFinalMessages(response));
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
      setMessages((prev) => [...prev, { role: 'user', content, type: 'text' }]);

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
          setMessages((prev) => [...prev, { role: 'error', content: response.error, type: 'text' }]);
        } else {
          if (response.messages) {
            setMessages(getFinalMessages(response));
          } else {
            // Fallback
            const txt = response.response ?? '';
            setMessages((prev) => [...prev, { role: 'assistant', content: txt, type: 'text' }]);
          }
          if (response.screenshotDataUrl) {
            setMessages((prev) => [...prev, { role: 'assistant', content: response.screenshotDataUrl, type: 'image' }]);
          }
          if (response.threadId) {
            setThreadId(response.threadId);
          }
        }
      } catch (error: any) {
        setMessages((prev) => [
          ...prev,
          { role: 'error', content: error.message || 'Failed to send message', type: 'text' }
        ]);
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
