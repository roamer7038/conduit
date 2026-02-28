// lib/services/message/message-types.ts
import type { McpServerConfig, TestResult, McpToolInfo } from '@/lib/types/agent';
import type { Thread, ThreadHistory, ChatMessageResponse } from '@/lib/types/message';

export type MessageRequest =
  | { type: 'chat_message'; message: any; threadId?: string }
  | { type: 'get_threads' }
  | { type: 'get_thread_history'; threadId: string }
  | { type: 'delete_thread'; threadId: string }
  | { type: 'test_mcp_connection'; server: McpServerConfig }
  | { type: 'fetch_models' }
  | { type: 'clear_model_cache' }
  | { type: 'fetch_mcp_tools'; serverId: string };

export type MessageResponse<T = any> = { error: string } | (T extends void ? { success: true } : T);

// Extract specific request types
export type ChatMessageRequest = Extract<MessageRequest, { type: 'chat_message' }>;
export type GetThreadsRequest = Extract<MessageRequest, { type: 'get_threads' }>;
export type GetThreadHistoryRequest = Extract<MessageRequest, { type: 'get_thread_history' }>;
export type DeleteThreadRequest = Extract<MessageRequest, { type: 'delete_thread' }>;
export type TestMcpConnectionRequest = Extract<MessageRequest, { type: 'test_mcp_connection' }>;
export type FetchModelsRequest = Extract<MessageRequest, { type: 'fetch_models' }>;
export type ClearModelCacheRequest = Extract<MessageRequest, { type: 'clear_model_cache' }>;
export type FetchMcpToolsRequest = Extract<MessageRequest, { type: 'fetch_mcp_tools' }>;

export interface GetThreadsResponse {
  threads: Thread[];
}

export interface FetchModelsResponse {
  models: string[];
}

export interface FetchMcpToolsResponse {
  tools: McpToolInfo[];
}
