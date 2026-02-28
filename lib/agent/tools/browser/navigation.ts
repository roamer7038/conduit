// lib/agent/tools/browser/navigation.ts
/// <reference types="chrome" />
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Helper: get the current active tab ID
const getActiveTabId = async (): Promise<number> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found.');
  return tab.id;
};

// Helper: wait for the active tab to finish loading
const waitForLoad = (tabId: number, timeoutMs = 10000): Promise<void> =>
  new Promise<void>((resolve) => {
    const listener = (updatedTabId: number, info: { status?: string }) => {
      if (updatedTabId === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);
  });

export function createNavigationTools(): DynamicStructuredTool[] {
  return [
    // browser_get_active_tab
    new DynamicStructuredTool({
      name: 'browser_get_active_tab',
      description: 'Get the title and URL of the currently active tab.',
      schema: z.object({}),
      func: async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return 'No active tab found.';
        return JSON.stringify({ id: tab.id, title: tab.title, url: tab.url });
      }
    }),

    // browser_navigate
    new DynamicStructuredTool({
      name: 'browser_navigate',
      description:
        'Navigate the current active tab to a new URL and wait for the page to load. Use this to browse the web within the same tab.',
      schema: z.object({
        url: z.string().describe('The URL to navigate to.')
      }),
      func: async ({ url }) => {
        const tabId = await getActiveTabId();
        await chrome.tabs.update(tabId, { url });
        await waitForLoad(tabId);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return JSON.stringify({ tabId, url: tab?.url, title: tab?.title });
      }
    }),

    // browser_go_back
    new DynamicStructuredTool({
      name: 'browser_go_back',
      description: 'Navigate the current tab back to the previous page in the browser history.',
      schema: z.object({}),
      func: async () => {
        const tabId = await getActiveTabId();
        await chrome.tabs.goBack(tabId);
        await waitForLoad(tabId);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return JSON.stringify({ url: tab?.url, title: tab?.title });
      }
    }),

    // browser_go_forward
    new DynamicStructuredTool({
      name: 'browser_go_forward',
      description: 'Navigate the current tab forward in the browser history.',
      schema: z.object({}),
      func: async () => {
        const tabId = await getActiveTabId();
        await chrome.tabs.goForward(tabId);
        await waitForLoad(tabId);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return JSON.stringify({ url: tab?.url, title: tab?.title });
      }
    }),

    // browser_reload
    new DynamicStructuredTool({
      name: 'browser_reload',
      description: 'Reload the current page.',
      schema: z.object({}),
      func: async () => {
        const tabId = await getActiveTabId();
        await chrome.tabs.reload(tabId);
        await waitForLoad(tabId);
        return 'Page reloaded.';
      }
    })
  ];
}
