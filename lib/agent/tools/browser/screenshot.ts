// lib/agent/tools/browser/screenshot.ts
/// <reference types="chrome" />
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ScreenshotRepository } from '@/lib/services/storage/repositories/screenshot-repository';

export function createScreenshotTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'browser_screenshot',
    description:
      'Capture a screenshot of the visible area of the current page. The screenshot will be displayed as a preview in the chat UI.',
    schema: z.object({}),
    func: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, { format: 'png' });
      // LLMのコンテキストに包めず、ストレージに一時保存してUIでプレビューする
      await ScreenshotRepository.setLastDataUrl(dataUrl);
      return `Screenshot captured (${tab.title ?? tab.url}). A preview will appear in the chat.`;
    }
  });
}
