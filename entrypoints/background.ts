import { createLangGraphAgent, AgentConfig } from '@/lib/agent/graph';
import { v4 as uuidv4 } from 'uuid';

export default defineBackground(() => {
  let agentExecutor: any = null;

  // Initialize agent when config changes or on startup if config exists
  const initAgent = async () => {
    const data = await chrome.storage.local.get(['apiKey', 'baseUrl', 'modelName']);
    const apiKey = data.apiKey as string;
    const baseUrl = data.baseUrl as string | undefined;
    const modelName = data.modelName as string | undefined;

    if (apiKey) {
      console.log('Initializing agent...');
      agentExecutor = await createLangGraphAgent({ apiKey, baseUrl, modelName });
      console.log('Agent initialized.');
    }
  };

  chrome.runtime.onInstalled.addListener(initAgent);
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.apiKey || changes.baseUrl || changes.modelName) {
      initAgent();
    }
  });

  // Handle messages from Popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      if (!agentExecutor) {
        await initAgent();
        if (!agentExecutor) {
          sendResponse({ error: 'Agent not initialized. Please set API Key.' });
          return;
        }
      }

      if (request.type === 'chat_message') {
        const { message, threadId } = request;
        const config = { configurable: { thread_id: threadId || uuidv4() } };

        // Save as active thread
        await chrome.storage.local.set({ lastActiveThreadId: config.configurable.thread_id });

        try {
          const result = await agentExecutor.invoke({ messages: [message] }, config);

          // Helper to get the last message content
          const lastMessage = result.messages[result.messages.length - 1];
          sendResponse({
            response: lastMessage.content,
            threadId: config.configurable.thread_id
          });
        } catch (error: any) {
          console.error('Agent execution error:', error);
          sendResponse({ error: error.message });
        }
      }

      if (request.type === 'get_threads') {
        try {
          // We need access to the checkpointer.
          // Since we created it inside createLangGraphAgent, we might need to expose it or re-instantiate it cleanly.
          // For now, we'll instantiate a fresh checkpointer to read storage,
          // as ChromeStorageCheckpointer is stateless regarding the connection (just uses chrome.storage).
          const { ChromeStorageCheckpointer } = await import('@/lib/agent/checkpointer');
          const checkpointer = new ChromeStorageCheckpointer();
          const threads = await checkpointer.getAllThreads();
          sendResponse({ threads });
        } catch (error: any) {
          console.error('Failed to get threads:', error);
          sendResponse({ error: error.message });
        }
      }

      if (request.type === 'get_thread_history') {
        const { threadId } = request;
        if (!agentExecutor) await initAgent();

        if (agentExecutor) {
          try {
            const config = { configurable: { thread_id: threadId } };
            const state = await agentExecutor.getState(config);
            // Extract messages from state
            const rawMessages = state.values.messages || [];
            // Explicitly serialize to ensure 'type' is preserved (getters might be lost in message passing)
            const messages = rawMessages.map((m: any) => ({
              type:
                (typeof m.getType === 'function' ? m.getType() : m.type) || (m.id?.includes('Human') ? 'human' : 'ai'),
              content: m.content,
              id: m.id,
              name: m.name
            }));
            sendResponse({ messages });
          } catch (error: any) {
            console.error('Failed to get history:', error);
            sendResponse({ error: error.message });
          }
        } else {
          sendResponse({ error: 'Agent not initialized' });
        }
      }

      if (request.type === 'delete_thread') {
        const { threadId } = request;
        const { ChromeStorageCheckpointer } = await import('@/lib/agent/checkpointer');
        const checkpointer = new ChromeStorageCheckpointer();
        await checkpointer.deleteThread(threadId);

        // If deleting active thread, clear it
        const data = await chrome.storage.local.get(['lastActiveThreadId']);
        if (data.lastActiveThreadId === threadId) {
          await chrome.storage.local.remove('lastActiveThreadId');
        }
        sendResponse({ success: true });
      }
    })();
    return true; // Keep channel open for async response
  });
});
