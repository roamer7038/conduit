/// <reference types="chrome"/>
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export const createBrowserTools = () => {
  const tools = [
    new DynamicStructuredTool({
      name: 'browser_open_tab',
      description: 'Open a new tab with the specified URL.',
      schema: z.object({
        url: z.string().describe('The URL to open')
      }),
      func: async ({ url }: { url: string }) => {
        const tab = await chrome.tabs.create({ url });
        return `Opened tab with ID: ${tab.id}`;
      }
    }),
    new DynamicStructuredTool({
      name: 'browser_get_active_tab',
      description: 'Get information about the currently active tab.',
      schema: z.object({}),
      func: async () => {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        if (!tab) return 'No active tab found.';
        return JSON.stringify({ title: tab.title, url: tab.url, id: tab.id });
      }
    })
  ];

  return tools;
};
