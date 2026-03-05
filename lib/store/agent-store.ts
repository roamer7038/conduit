import { create } from 'zustand';
import type { Message, ThreadTokenUsage } from '@/lib/types/message';
import { getFinalMessages, parseMessages } from '../utils/message-parser';
import { v4 as uuidv4 } from 'uuid';

interface AgentState {
  messages: Message[];
  isLoading: boolean;
  threadId: string;
  tokenUsage: ThreadTokenUsage | null;
  activePort: chrome.runtime.Port | null;

  // Actions
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setIsLoading: (isLoading: boolean) => void;
  setThreadId: (threadId: string) => void;
  setTokenUsage: (tokenUsage: ThreadTokenUsage | null) => void;
  setActivePort: (port: chrome.runtime.Port | null) => void;

  // Thunks / Complex Actions
  setupStreamListener: (port: chrome.runtime.Port, baseMessages: Message[]) => void;
  sendMessage: (content: string) => Promise<void>;
  startNewThread: () => void;
  switchThread: (newThreadId: string) => Promise<void>;
  abortGeneration: () => void;
  loadThreadHistory: (threadId: string) => Promise<void>;
  initializeLastActiveThread: () => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  isLoading: false,
  threadId: '',
  tokenUsage: null,
  activePort: null,

  setMessages: (updater) =>
    set((state) => ({
      messages: typeof updater === 'function' ? updater(state.messages) : updater
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setThreadId: (threadId) => set({ threadId }),
  setTokenUsage: (tokenUsage) => set({ tokenUsage }),
  setActivePort: (port) => set({ activePort: port }),

  setupStreamListener: (port, baseMessages) => {
    let currentText = '';
    let currentReasoning = '';
    let accumulatedMessages: Message[] = [];

    const handleMessage = (msg: any) => {
      const state = get();
      if (msg.type === 'stream_start') {
        if (msg.threadId) set({ threadId: msg.threadId });
      } else if (msg.type === 'stream_chunk') {
        const { chunk } = msg;

        if (chunk.content) currentText += chunk.content;
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

        set({ messages: [...baseMessages, ...accumulatedMessages, ...tail] });
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

        set({ messages: [...baseMessages, ...accumulatedMessages] });
      } else if (msg.type === 'tool_end') {
        const toolResultOutput = typeof msg.output === 'string' ? msg.output : JSON.stringify(msg.output);
        accumulatedMessages.push({ role: 'tool', name: msg.name, content: toolResultOutput, type: 'tool_result' });

        set({ messages: [...baseMessages, ...accumulatedMessages] });
      } else if (msg.type === 'stream_abort') {
        set({ isLoading: false });
        port.disconnect();
      } else if (msg.type === 'stream_end') {
        if (msg.response.messages) {
          set({ messages: getFinalMessages(msg.response) });
        } else {
          set({
            messages: [
              ...baseMessages,
              ...accumulatedMessages,
              { role: 'assistant', content: msg.response.response || '', type: 'text' }
            ]
          });
        }
        if (msg.response.totalUsage) set({ tokenUsage: msg.response.totalUsage });
        if (msg.response.threadId) set({ threadId: msg.response.threadId });
        set({ isLoading: false });
        port.disconnect();
      } else if (msg.type === 'error') {
        set({
          messages: [...baseMessages, ...accumulatedMessages, { role: 'error', content: msg.error, type: 'text' }],
          isLoading: false
        });
        port.disconnect();
      }
    };

    port.onMessage.addListener(handleMessage);

    port.onDisconnect.addListener(() => {
      set((state) => (state.activePort === port ? { activePort: null, isLoading: false } : {}));
    });

    set({ activePort: port });
  },

  sendMessage: async (content) => {
    const state = get();
    set({ isLoading: true });

    try {
      const port = chrome.runtime.connect({ name: 'chat_stream' });
      const userMessage: Message = { role: 'user', content, type: 'text' };
      const newBaseMessages = [...state.messages, userMessage];

      set({ messages: newBaseMessages });

      port.postMessage({
        type: 'chat_message',
        message: { role: 'user', content },
        threadId: state.threadId
      });

      state.setupStreamListener(port, newBaseMessages);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
      set({
        messages: [...get().messages, { role: 'error', content: errorMsg, type: 'text' }],
        isLoading: false
      });
    }
  },

  startNewThread: () => {
    set({ threadId: '', messages: [], tokenUsage: null });
    chrome.storage.local.remove('lastActiveThreadId');
  },

  switchThread: async (newThreadId: string) => {
    const { threadId, loadThreadHistory } = get();
    if (threadId === newThreadId) return;

    set({ threadId: newThreadId });
    if (newThreadId) {
      await loadThreadHistory(newThreadId);
    } else {
      set({ messages: [], tokenUsage: null });
    }
  },

  abortGeneration: () => {
    const { threadId, isLoading } = get();
    if (threadId && isLoading) {
      chrome.runtime.sendMessage({ type: 'cancel_generation', threadId });
      set({ isLoading: false });
    }
  },

  loadThreadHistory: async (targetThreadId: string) => {
    if (!targetThreadId) {
      set({ messages: [], tokenUsage: null });
      return;
    }

    const state = get();
    // If we're already loading or sending a message, don't interrupt with history fetch
    if (state.isLoading) return;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'get_thread_history', threadId: targetThreadId });
      set({
        messages: getFinalMessages(response),
        tokenUsage: response.totalUsage || null
      });
    } catch (error) {
      console.error('Failed to load thread history', error);
    }
  },

  initializeLastActiveThread: async () => {
    const data = await chrome.storage.local.get(['lastActiveThreadId']);
    if (data.lastActiveThreadId) {
      const id = data.lastActiveThreadId as string;
      set({ threadId: id });
      await get().loadThreadHistory(id);
    }
  }
}));
