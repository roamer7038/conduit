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
    })();
    return true; // Keep channel open for async response
  });
});
