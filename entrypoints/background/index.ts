// entrypoints/background/index.ts
/// <reference types="chrome"/>
import { createLangGraphAgent } from '@/lib/agent/graph';
import { MCP_SERVERS_STORAGE_KEY } from '@/lib/agent/tools/mcp-types';
import { AgentConfigRepository } from '@/lib/services/storage/repositories/agent-config-repository';
import { LlmProviderRepository } from '@/lib/services/storage/repositories/llm-provider-repository';
import { STORAGE_KEYS } from '@/lib/services/storage/storage-keys';
import { CryptoService } from '@/lib/services/crypto/crypto-service';
import { handleChatMessage, activeStreams } from './handlers/chat-handler';
import { handleGetThreads, handleGetThreadHistory, handleDeleteThread } from './handlers/thread-handler';
import { handleTestMcpConnection, handleFetchMcpTools } from './handlers/mcp-handler';
import { handleFetchModels, handleClearModelCache } from './handlers/model-handler';
import type { AgentExecutorType } from '@/lib/types/agent';

export default defineBackground(() => {
  // アイコンクリック時にサイドパネルを自動で開く
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  let agentExecutor: AgentExecutorType | null = null;

  // Initialize agent when config changes or on startup if config exists
  const initAgent = async () => {
    const agentConfig = await AgentConfigRepository.getActiveConfig();
    const providers = await LlmProviderRepository.getAll();

    if (agentConfig?.providerId) {
      const provider = providers.find((p) => p.id === agentConfig.providerId);
      if (provider?.apiKey || provider?.providerType === 'ollama') {
        console.log(
          `[Agent Init] Starting initialization for ${provider.providerType} (${agentConfig.modelName || 'default'})...`
        );
        try {
          agentExecutor = await createLangGraphAgent({
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl,
            modelName: agentConfig.modelName,
            providerType: provider.providerType,
            temperature: agentConfig.temperature,
            topP: agentConfig.topP
          });
          console.log('[Agent Init] Agent initialized successfully.');
        } catch (error) {
          console.error('[Agent Init] Failed to initialize agent:', error);
          agentExecutor = null;
        }
      }
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
      changes[STORAGE_KEYS.LLM_PROVIDERS] ||
      changes[STORAGE_KEYS.AGENT_CONFIGS] ||
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

          case 'cancel_generation': {
            const streamState = activeStreams.get(request.threadId);
            if (streamState) {
              streamState.abortController.abort();
              sendResponse({ success: true });
            } else {
              sendResponse({ error: 'Stream not found' });
            }
            break;
          }

          case 'test_mcp_connection': {
            const result = await handleTestMcpConnection(request.server);
            sendResponse(result);
            break;
          }

          case 'fetch_models': {
            const agentConfig = await AgentConfigRepository.getActiveConfig();
            if (!agentConfig?.providerId) {
              sendResponse({ error: 'No LLM Provider selected in Agent Settings' });
              return;
            }
            // Get LLM providers from storage
            const providers = await LlmProviderRepository.getAll();
            const provider = providers.find((p) => p.id === agentConfig.providerId);
            if (!provider) {
              sendResponse({ error: 'Selected LLM Provider not found' });
              return;
            }

            // Pass provider to handler
            const result = await handleFetchModels(provider);
            sendResponse(result);
            break;
          }

          case 'clear_model_cache': {
            const result = await handleClearModelCache();
            sendResponse(result);
            break;
          }

          case 'fetch_mcp_tools': {
            const result = await handleFetchMcpTools(request.serverId);
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
      port.onDisconnect.addListener(() => {
        for (const [key, state] of activeStreams.entries()) {
          if (state.port === port) {
            state.port = null;
          }
        }
      });

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
          } else if (request.type === 'reconnect_stream') {
            const streamState = activeStreams.get(request.threadId);
            if (streamState) {
              streamState.port = port;
              port.postMessage({ type: 'stream_reconnected' });
            } else {
              port.postMessage({ type: 'stream_not_found' });
            }
          }
        } catch (error: any) {
          console.error('Port message handler error:', error);
          port.postMessage({ type: 'error', error: error.message || 'Internal error' });
        }
      });
    }
  });
});
