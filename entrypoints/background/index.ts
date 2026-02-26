// entrypoints/background/index.ts
/// <reference types="chrome"/>
import { createLangGraphAgent } from '@/lib/agent/graph';
import { MCP_SERVERS_STORAGE_KEY } from '@/lib/agent/tools/mcp-types';
import { StorageService } from '@/lib/services/storage/storage-service';
import { STORAGE_KEYS } from '@/lib/services/storage/storage-keys';
import { CryptoService } from '@/lib/services/crypto/crypto-service';
import { handleChatMessage } from './handlers/chat-handler';
import { handleGetThreads, handleGetThreadHistory, handleDeleteThread } from './handlers/thread-handler';
import { handleTestMcpConnection } from './handlers/mcp-handler';
import { handleFetchModels, handleClearModelCache } from './handlers/model-handler';

export default defineBackground(() => {
  // アイコンクリック時にサイドパネルを自動で開く
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  let agentExecutor: any = null;

  // Initialize agent when config changes or on startup if config exists
  const initAgent = async () => {
    const config = await StorageService.getLLMConfig();

    if (config.apiKey) {
      console.log('Initializing agent...');
      agentExecutor = await createLangGraphAgent({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        modelName: config.modelName
      });
      console.log('Agent initialized.');
    }
  };

  chrome.runtime.onInstalled.addListener(async () => {
    try {
      // CryptoServiceを初期化
      await CryptoService.initialize();
      console.log('[Background] Crypto service initialized (onInstalled)');

      // 既存のエージェント初期化
      await initAgent();
    } catch (error) {
      console.error('[Background] Initialization failed (onInstalled):', error);
    }
  });

  chrome.runtime.onStartup.addListener(async () => {
    try {
      // CryptoServiceを初期化
      await CryptoService.initialize();
      console.log('[Background] Crypto service initialized (onStartup)');

      // エージェント初期化も追加
      await initAgent();
    } catch (error) {
      console.error('[Background] Initialization failed (onStartup):', error);
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (
      changes[STORAGE_KEYS.API_KEY] ||
      changes[STORAGE_KEYS.BASE_URL] ||
      changes[STORAGE_KEYS.MODEL_NAME] ||
      changes[MCP_SERVERS_STORAGE_KEY]
    ) {
      initAgent();
    }
  });

  // Handle messages from Side Panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      try {
        // Ensure agent is initialized
        if (!agentExecutor) {
          await initAgent();
          if (!agentExecutor) {
            sendResponse({ error: 'Agent not initialized. Please set API Key.' });
            return;
          }
        }

        // Route to appropriate handler
        switch (request.type) {
          case 'chat_message': {
            const result = await handleChatMessage(request, agentExecutor);
            sendResponse(result);
            break;
          }

          case 'get_threads': {
            const result = await handleGetThreads();
            sendResponse(result);
            break;
          }

          case 'get_thread_history': {
            const result = await handleGetThreadHistory(request.threadId, agentExecutor);
            sendResponse(result);
            break;
          }

          case 'delete_thread': {
            const result = await handleDeleteThread(request.threadId);
            sendResponse(result);
            break;
          }

          case 'test_mcp_connection': {
            const result = await handleTestMcpConnection(request.server);
            sendResponse(result);
            break;
          }

          case 'fetch_models': {
            const result = await handleFetchModels();
            sendResponse(result);
            break;
          }

          case 'clear_model_cache': {
            const result = await handleClearModelCache();
            sendResponse(result);
            break;
          }

          default:
            sendResponse({ error: `Unknown message type: ${request.type}` });
        }
      } catch (error: any) {
        console.error('Background message handler error:', error);
        sendResponse({ error: error.message || 'Internal error' });
      }
    })();
    return true; // Keep channel open for async response
  });

  // Handle long-lived connections for streaming
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'chat_stream') {
      port.onMessage.addListener(async (request) => {
        try {
          // Ensure agent is initialized
          if (!agentExecutor) {
            await initAgent();
            if (!agentExecutor) {
              port.postMessage({ type: 'error', error: 'Agent not initialized. Please set API Key.' });
              return;
            }
          }

          if (request.type === 'chat_message') {
            await handleChatMessage(request, agentExecutor, port);
          }
        } catch (error: any) {
          console.error('Port message handler error:', error);
          port.postMessage({ type: 'error', error: error.message || 'Internal error' });
        }
      });
    }
  });
});
