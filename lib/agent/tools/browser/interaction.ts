// lib/agent/tools/browser/interaction.ts
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

export function createInteractionTools(): DynamicStructuredTool[] {
  return [
    // browser_click_element
    new DynamicStructuredTool({
      name: 'browser_click_element',
      description: 'Click a DOM element identified by a CSS selector on the current page.',
      schema: z.object({
        selector: z.string().describe('CSS selector of the element to click.')
      }),
      func: async ({ selector }) => {
        const tabId = await getActiveTabId();
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel: string) => {
            const el = document.querySelector(sel);
            if (!el) return `Element not found: ${sel}`;
            (el as HTMLElement).click();
            return `Clicked: ${sel}`;
          },
          args: [selector]
        });
        const msg = String(results?.[0]?.result ?? 'Done.');
        // Wait a moment for any navigation triggered by the click
        await waitForLoad(tabId, 3000);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return JSON.stringify({ result: msg, url: tab?.url, title: tab?.title });
      }
    }),

    // browser_type_text
    new DynamicStructuredTool({
      name: 'browser_type_text',
      description: 'Focus a form input or textarea on the current page and type text into it.',
      schema: z.object({
        selector: z.string().describe('CSS selector of the input element.'),
        text: z.string().describe('Text to type.'),
        submit: z.boolean().optional().describe('If true, press Enter after typing. Defaults to false.')
      }),
      func: async ({ selector, text, submit = false }) => {
        const tabId = await getActiveTabId();
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel: string, value: string, shouldSubmit: boolean) => {
            const el = document.querySelector(sel) as HTMLInputElement | null;
            if (!el) return `Input not found: ${sel}`;
            el.focus();
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            if (shouldSubmit) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            return `Typed "${value}" into ${sel}`;
          },
          args: [selector, text, submit]
        });
        return String(results?.[0]?.result ?? 'Done.');
      }
    }),

    // browser_scroll
    new DynamicStructuredTool({
      name: 'browser_scroll',
      description: 'Scroll the current page.',
      schema: z.object({
        direction: z.enum(['up', 'down', 'top', 'bottom']).describe('Direction to scroll.'),
        amount: z.number().optional().describe('Pixels to scroll for up/down. Defaults to 600px.')
      }),
      func: async ({ direction, amount = 600 }) => {
        const tabId = await getActiveTabId();
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (dir: string, px: number) => {
            if (dir === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
            else if (dir === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            else if (dir === 'down') window.scrollBy({ top: px, behavior: 'smooth' });
            else window.scrollBy({ top: -px, behavior: 'smooth' });
          },
          args: [direction, amount]
        });
        return `Scrolled ${direction}.`;
      }
    })
  ];
}
