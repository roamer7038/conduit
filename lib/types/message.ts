// lib/types/message.ts
export interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  type?: 'text' | 'image';
}

export interface Thread {
  id: string;
  updatedAt: number;
  preview: string;
}

export interface ThreadHistory {
  messages: Message[];
  screenshots: string[];
}

export interface ChatMessageResponse {
  response: string;
  threadId: string;
  screenshotDataUrl?: string;
  messages?: any[];
  screenshots?: string[];
}
