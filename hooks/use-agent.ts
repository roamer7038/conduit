import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, ThreadTokenUsage } from '@/lib/types/message';

function parseMessages(rawMessages: Record<string, unknown>[]): Message[] {
  return rawMessages.flatMap((m) => {
    const msgs: Message[] = [];
    const msgType =
      (typeof m.getType === 'function' ? (m.getType as () => string)() : m.type) ||
      (m.id?.toString().includes('AI') ? 'ai' : m.id?.toString().includes('Human') ? 'human' : null);

    if (msgType === 'human') {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      msgs.push({ role: 'user', content, type: 'text' });
    } else if (msgType === 'ai') {
      const additionalKwargs = (m.additional_kwargs || {}) as Record<string, unknown>;
      if (additionalKwargs.reasoning_content) {
        msgs.push({ role: 'reasoning', content: additionalKwargs.reasoning_content as string, type: 'reasoning' });
      }
      if (m.tool_calls && (m.tool_calls as unknown[]).length > 0) {
        (m.tool_calls as Record<string, unknown>[]).forEach((tc) => {
          msgs.push({ role: 'tool', content: JSON.stringify(tc.args), name: tc.name as string, type: 'tool_call' });
        });
      }
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      if (content && content.trim() && content !== '""' && content !== '{}') {
        const usageMetadata = m.usage_metadata as Message['usageMetadata'] | undefined;
        msgs.push({ role: 'assistant', content, type: 'text', usageMetadata });
      }
    } else if (msgType === 'tool') {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      msgs.push({ role: 'tool', content, name: m.name as string, type: 'tool_result' });
    } else if (msgType === 'system' || msgType === 'error') {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      msgs.push({ role: 'error', content, type: 'text' });
    }
    return msgs;
  });
}

function getFinalMessages(response: Record<string, unknown>): Message[] {
  if (!response.messages) return [];
  const formattedMessages = parseMessages(response.messages as Record<string, unknown>[]);
  const screenshots: string[] = (response.screenshots as string[]) ?? [];
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
  const [tokenUsage, setTokenUsage] = useState<ThreadTokenUsage | null>(null);

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
          if (response.totalUsage) {
            setTokenUsage(response.totalUsage);
          }
        });
    } else {
      setMessages([]);
      setTokenUsage(null);
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

      try {
        const port = chrome.runtime.connect({ name: 'chat_stream' });

        let currentText = '';
        let currentReasoning = '';
        let baseMessages: Message[] = [];
        let accumulatedMessages: Message[] = [];

        setMessages((prev) => {
          // Keep a reference to the messages before the stream starts,
          // including the newly sent user message.
          baseMessages = [...prev, { role: 'user', content, type: 'text' }];
          return baseMessages;
        });

        port.postMessage({
          type: 'chat_message',
          message: { role: 'user', content },
          threadId
        });

        port.onMessage.addListener((msg) => {
          if (msg.type === 'stream_start') {
            if (msg.threadId) {
              setThreadId(msg.threadId);
            }
          } else if (msg.type === 'stream_chunk') {
            const { chunk } = msg;

            if (chunk.content) {
              currentText += chunk.content;
            }
            if (chunk.additional_kwargs?.reasoning_content) {
              currentReasoning += chunk.additional_kwargs.reasoning_content;
            }

            const tail: Message[] = [];
            if (currentReasoning) {
              tail.push({ role: 'reasoning', content: currentReasoning, type: 'reasoning' });
            }
            if (currentText) {
              tail.push({ role: 'assistant', content: currentText, type: 'text' });
            }

            setMessages([...baseMessages, ...accumulatedMessages, ...tail]);
          } else if (msg.type === 'tool_start') {
            if (currentReasoning) {
              accumulatedMessages.push({ role: 'reasoning', content: currentReasoning, type: 'reasoning' });
              currentReasoning = '';
            }
            if (currentText) {
              accumulatedMessages.push({ role: 'assistant', content: currentText, type: 'text' });
              currentText = '';
            }

            const toolCallInput = typeof msg.input === 'string' ? msg.input : JSON.stringify(msg.input);
            accumulatedMessages.push({ role: 'tool', name: msg.name, content: toolCallInput, type: 'tool_call' });

            setMessages([...baseMessages, ...accumulatedMessages]);
          } else if (msg.type === 'tool_end') {
            const toolResultOutput = typeof msg.output === 'string' ? msg.output : JSON.stringify(msg.output);
            accumulatedMessages.push({ role: 'tool', name: msg.name, content: toolResultOutput, type: 'tool_result' });

            setMessages([...baseMessages, ...accumulatedMessages]);
          } else if (msg.type === 'stream_end') {
            if (msg.response.messages) {
              setMessages(getFinalMessages(msg.response));
            } else {
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: msg.response.response || '', type: 'text' }
              ]);
            }
            if (msg.response.screenshotDataUrl) {
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: msg.response.screenshotDataUrl, type: 'image' }
              ]);
            }
            if (msg.response.totalUsage) {
              setTokenUsage(msg.response.totalUsage);
            }
            if (msg.response.threadId) {
              setThreadId(msg.response.threadId);
            }
            setIsLoading(false);
            port.disconnect();
          } else if (msg.type === 'error') {
            setMessages([...baseMessages, { role: 'error', content: msg.error, type: 'text' }]);
            setIsLoading(false);
            port.disconnect();
          }
        });

        port.onDisconnect.addListener(() => {
          setIsLoading(false);
        });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
        setMessages((prev) => [...prev, { role: 'error', content: errorMsg, type: 'text' }]);
        setIsLoading(false);
      }
    },
    [threadId]
  );

  const startNewThread = useCallback(() => {
    setThreadId('');
    setMessages([]);
    setTokenUsage(null);
    chrome.storage.local.remove('lastActiveThreadId');
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    startNewThread,
    setThreadId,
    tokenUsage
  };
}
