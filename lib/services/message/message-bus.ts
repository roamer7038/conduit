// lib/services/message/message-bus.ts
/// <reference types="chrome"/>
import type {
  MessageRequest,
  MessageResponse,
  ChatMessageRequest,
  GetThreadsResponse,
  FetchModelsResponse,
  FetchMcpToolsResponse
} from './message-types';
import type { Thread, ThreadHistory, ChatMessageResponse } from '@/lib/types/message';
import type { McpServerConfig, TestResult, McpToolInfo } from '@/lib/types/agent';

export class MessageBus {
  static async send<T = any>(request: MessageRequest): Promise<T> {
    try {
      const response = await chrome.runtime.sendMessage(request);
      if (response && response.error) {
        throw new Error(response.error);
      }
      return response as T;
    } catch (error) {
      console.error('MessageBus error:', error);
      throw error;
    }
  }

  static async sendChatMessage(message: any, threadId?: string): Promise<ChatMessageResponse> {
    return this.send<ChatMessageResponse>({
      type: 'chat_message',
      message,
      threadId
    });
  }

  static async getThreads(): Promise<Thread[]> {
    const response = await this.send<GetThreadsResponse>({ type: 'get_threads' });
    return response.threads;
  }

  static async getThreadHistory(threadId: string): Promise<ThreadHistory> {
    return this.send<ThreadHistory>({
      type: 'get_thread_history',
      threadId
    });
  }

  static async deleteThread(threadId: string): Promise<void> {
    await this.send<{ success: true }>({
      type: 'delete_thread',
      threadId
    });
  }

  static async testMcpConnection(server: McpServerConfig): Promise<TestResult> {
    return this.send<TestResult>({
      type: 'test_mcp_connection',
      server
    });
  }

  static async fetchModels(): Promise<string[]> {
    const response = await this.send<FetchModelsResponse>({ type: 'fetch_models' });
    return response.models;
  }

  static async clearModelCache(): Promise<void> {
    await this.send<{ success: true }>({ type: 'clear_model_cache' });
  }

  static async fetchMcpTools(serverId: string): Promise<McpToolInfo[]> {
    const response = await this.send<FetchMcpToolsResponse>({
      type: 'fetch_mcp_tools',
      serverId
    });
    return response.tools;
  }
}
