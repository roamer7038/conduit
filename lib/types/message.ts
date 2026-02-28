// lib/types/message.ts
export interface Message {
  role: 'user' | 'assistant' | 'error' | 'tool' | 'reasoning';
  content: string;
  type?: 'text' | 'image' | 'tool_call' | 'tool_result' | 'reasoning';
  name?: string;
}

export interface Thread {
  id: string;
  updatedAt: number;
  preview: string;
}

export interface ThreadHistory {
  messages: any[];
  screenshots: string[];
}

export interface ChatMessageResponse {
  response: string;
  threadId: string;
  screenshotDataUrl?: string;
  messages?: any[];
  screenshots?: string[];
}
