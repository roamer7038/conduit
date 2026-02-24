import { createLangGraphAgent, AgentConfig } from '@/lib/agent/graph';
import { testMcpConnection } from '@/lib/agent/tools/mcp';
import { MCP_SERVERS_STORAGE_KEY, McpServerConfig } from '@/lib/agent/tools/mcp-types';
import { v4 as uuidv4 } from 'uuid';
import { clearModelCache } from '@/lib/agent/model-cache';

export default defineBackground(() => {
  // アイコンクリック時にサイドパネルを自動で開く
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

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
    if (changes.apiKey || changes.baseUrl || changes.modelName || changes[MCP_SERVERS_STORAGE_KEY]) {
      initAgent();
    }
  });

  // Handle messages from Side Panel
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

          // Retrieve screenshot data URL if captured during this turn (stored by browser_screenshot tool)
          const stored = await chrome.storage.local.get('lastScreenshotDataUrl');
          const screenshotDataUrl = stored.lastScreenshotDataUrl ?? null;
          if (screenshotDataUrl) {
            // スレッドIDひもづきで永続化（履歴復元のため）
            const screenshotKey = `screenshots_${config.configurable.thread_id}`;
            const existingData = await chrome.storage.local.get(screenshotKey);
            const existing: string[] = (existingData as Record<string, string[]>)[screenshotKey] ?? [];
            await chrome.storage.local.set({ [screenshotKey]: [...existing, screenshotDataUrl] });
            await chrome.storage.local.remove('lastScreenshotDataUrl');
          }

          sendResponse({
            response: lastMessage.content,
            threadId: config.configurable.thread_id,
            screenshotDataUrl
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
            // スレッドに紐づくスクリーンショットも取得
            const screenshotKey = `screenshots_${threadId}`;
            const screenshotData = await chrome.storage.local.get(screenshotKey);
            const screenshots: string[] = (screenshotData as Record<string, string[]>)[screenshotKey] ?? [];
            sendResponse({ messages, screenshots });
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
        // スレッドに紐づくスクリーンショットも削除
        await chrome.storage.local.remove(`screenshots_${threadId}`);
        sendResponse({ success: true });
      }

      if (request.type === 'test_mcp_connection') {
        const server = request.server as McpServerConfig;
        try {
          const result = await testMcpConnection(server);
          sendResponse(result);
        } catch (error: any) {
          sendResponse({ success: false, error: error.message });
        }
      }

      if (request.type === 'fetch_models') {
        try {
          const { apiKey, baseUrl } = await chrome.storage.local.get(['apiKey', 'baseUrl']);

          if (!apiKey) {
            sendResponse({ error: 'API Key is not configured' });
            return;
          }

          const url = `${baseUrl || 'https://api.openai.com/v1'}/models`;

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();

          if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Invalid response format from API');
          }

          // Extract model IDs and sort alphabetically
          const models = data.data
            .map((m: any) => m.id)
            .filter((id: string) => typeof id === 'string')
            .sort();

          sendResponse({ models });
        } catch (error: any) {
          console.error('Failed to fetch models:', error);
          sendResponse({ error: error.message || 'Failed to fetch models' });
        }
      }

      if (request.type === 'clear_model_cache') {
        try {
          await clearModelCache();
          sendResponse({ success: true });
        } catch (error: any) {
          console.error('Failed to clear model cache:', error);
          sendResponse({ error: error.message });
        }
      }
    })();
    return true; // Keep channel open for async response
  });
});
