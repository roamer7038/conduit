// lib/agent/tools/browser/tabs.ts
/// <reference types="chrome" />
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export function createTabTools(): DynamicStructuredTool[] {
  return [
    // browser_list_tabs
    new DynamicStructuredTool({
      name: 'browser_list_tabs',
      description: 'List all tabs in the current browser window with their IDs, titles, and URLs.',
      schema: z.object({}),
      func: async () => {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const list = tabs.map((t) => ({ id: t.id, title: t.title, url: t.url }));
        return JSON.stringify(list);
      }
    }),

    // browser_open_tab
    new DynamicStructuredTool({
      name: 'browser_open_tab',
      description: 'Open a new tab. Optionally navigate to a URL.',
      schema: z.object({
        url: z.string().optional().describe('URL to navigate to in the new tab.')
      }),
      func: async ({ url }) => {
        const tab = await chrome.tabs.create({ url: url ?? 'about:blank' });
        return JSON.stringify({ tabId: tab.id, url: tab.url ?? url ?? 'about:blank' });
      }
    }),

    // browser_close_tab
    new DynamicStructuredTool({
      name: 'browser_close_tab',
      description: 'Close a specific tab by ID, or close the current active tab if no ID is given.',
      schema: z.object({
        tabId: z.number().optional().describe('The tab ID to close. Defaults to the active tab.')
      }),
      func: async ({ tabId }) => {
        const id = tabId ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
        if (id === undefined) return 'No tab found to close.';
        await chrome.tabs.remove(id);
        return `Closed tab ${id}.`;
      }
    }),

    // browser_switch_tab
    new DynamicStructuredTool({
      name: 'browser_switch_tab',
      description: 'Switch to (activate) a specific tab by ID.',
      schema: z.object({
        tabId: z.number().describe('The tab ID to switch to.')
      }),
      func: async ({ tabId }) => {
        await chrome.tabs.update(tabId, { active: true });
        const tab = await chrome.tabs.get(tabId);
        return JSON.stringify({ tabId: tab.id, title: tab.title, url: tab.url });
      }
    })
  ];
}
