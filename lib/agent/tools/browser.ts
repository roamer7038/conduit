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

export const createBrowserTools = () => {
  const tools = [
    // =========================================================
    // Current Tab Info
    // =========================================================
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

    // =========================================================
    // Navigation (same tab)
    // =========================================================
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
    }),

    new DynamicStructuredTool({
      name: 'browser_web_search',
      description:
        'Search the web using Google by navigating the current tab to the search results page. Use browser_get_page_content afterwards to read the results.',
      schema: z.object({
        query: z.string().describe('The search query.')
      }),
      func: async ({ query }) => {
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        const tabId = await getActiveTabId();
        await chrome.tabs.update(tabId, { url });
        await waitForLoad(tabId);
        return JSON.stringify({
          tabId,
          url,
          message: 'Navigated to search results. Use browser_get_page_content to read them.'
        });
      }
    }),

    // =========================================================
    // Page Content
    // =========================================================
    new DynamicStructuredTool({
      name: 'browser_get_page_content',
      description:
        'Get the readable text content of the current page. Optionally target a specific element with a CSS selector.',
      schema: z.object({
        selector: z
          .string()
          .optional()
          .describe('CSS selector to target a specific element. Defaults to the full page body.')
      }),
      func: async ({ selector }) => {
        const tabId = await getActiveTabId();
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel: string | null) => {
            const el = sel ? document.querySelector(sel) : document.body;
            if (!el) return `Element not found: ${sel}`;
            return (el as HTMLElement).innerText?.trim() ?? '';
          },
          args: [selector ?? null]
        });
        const text = String(results?.[0]?.result ?? '');
        return text.length > 8000 ? text.slice(0, 8000) + '\n...[truncated]' : text;
      }
    }),

    new DynamicStructuredTool({
      name: 'browser_get_page_links',
      description:
        'Get all hyperlinks on the current page as a list of {text, href} objects. Useful for finding navigation targets.',
      schema: z.object({
        selector: z.string().optional().describe('CSS selector to scope the search. Defaults to the full document.')
      }),
      func: async ({ selector }) => {
        const tabId = await getActiveTabId();
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel: string | null) => {
            const root = sel ? document.querySelector(sel) : document;
            if (!root) return '[]';
            const anchors = Array.from((root as Element).querySelectorAll('a[href]'));
            return JSON.stringify(
              anchors
                .map((a) => ({ text: (a as HTMLAnchorElement).innerText.trim(), href: (a as HTMLAnchorElement).href }))
                .filter((l) => l.text && l.href)
                .slice(0, 100)
            );
          },
          args: [selector ?? null]
        });
        return String(results?.[0]?.result ?? '[]');
      }
    }),

    new DynamicStructuredTool({
      name: 'browser_get_page_html',
      description:
        'Get the raw HTML of the current page or a specific element. Prefer browser_get_page_content for reading text.',
      schema: z.object({
        selector: z.string().optional().describe('CSS selector. Defaults to the full <html>.')
      }),
      func: async ({ selector }) => {
        const tabId = await getActiveTabId();
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel: string | null) => {
            const el = sel ? document.querySelector(sel) : document.documentElement;
            if (!el) return `Element not found: ${sel}`;
            return el.outerHTML;
          },
          args: [selector ?? null]
        });
        const html = String(results?.[0]?.result ?? '');
        return html.length > 8000 ? html.slice(0, 8000) + '\n...[truncated]' : html;
      }
    }),

    new DynamicStructuredTool({
      name: 'browser_search_in_page',
      description: 'Search for text within the current page and return matching lines with surrounding context.',
      schema: z.object({
        query: z.string().describe('Text to search for.')
      }),
      func: async ({ query }) => {
        const tabId = await getActiveTabId();
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: (q: string) => {
            const lines = (document.body.innerText ?? '').split('\n');
            const lower = q.toLowerCase();
            const matches: string[] = [];
            lines.forEach((line, i) => {
              if (line.toLowerCase().includes(lower)) {
                matches.push(
                  lines
                    .slice(Math.max(0, i - 1), i + 2)
                    .join('\n')
                    .trim()
                );
              }
            });
            return matches.length === 0 ? `No matches found for "${q}".` : matches.slice(0, 10).join('\n---\n');
          },
          args: [query]
        });
        return String(results?.[0]?.result ?? 'No results.');
      }
    }),

    // =========================================================
    // Page Interaction
    // =========================================================
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
    }),

    // =========================================================
    // Screenshot (for LLM visual understanding)
    // =========================================================
    new DynamicStructuredTool({
      name: 'browser_screenshot',
      description:
        'Capture a screenshot of the visible area of the current page. The screenshot will be displayed as a preview in the chat UI.',
      schema: z.object({}),
      func: async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, { format: 'png' });
        // LLMのコンテキストに包めず、ストレージに一時保存してUIでプレビューする
        await chrome.storage.local.set({ lastScreenshotDataUrl: dataUrl });
        return `Screenshot captured (${tab.title ?? tab.url}). A preview will appear in the chat.`;
      }
    }),

    // =========================================================
    // Download
    // =========================================================
    new DynamicStructuredTool({
      name: 'browser_download_file',
      description: 'Download a file from a URL to the default downloads folder.',
      schema: z.object({
        url: z.string().describe('The URL of the file to download.'),
        filename: z.string().optional().describe('Optional filename. Inferred from URL if omitted.')
      }),
      func: async ({ url, filename }) => {
        const options: chrome.downloads.DownloadOptions = { url };
        if (filename) options.filename = filename;
        const downloadId = await chrome.downloads.download(options);
        return `Download started with ID: ${downloadId}.`;
      }
    }),

    // =========================================================
    // Tab Management
    // =========================================================
    new DynamicStructuredTool({
      name: 'browser_list_tabs',
      description: 'List all open tabs in the current window. Returns id, title, url, and active status for each tab.',
      schema: z.object({}),
      func: async () => {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const result = tabs.map((t) => ({
          id: t.id,
          title: t.title,
          url: t.url,
          active: t.active,
          index: t.index
        }));
        return JSON.stringify(result);
      }
    }),

    new DynamicStructuredTool({
      name: 'browser_open_tab',
      description: 'Open a new browser tab. Optionally navigate to a URL immediately.',
      schema: z.object({
        url: z.string().optional().describe('URL to open in the new tab. Defaults to the new-tab page.')
      }),
      func: async ({ url }) => {
        const tab = await chrome.tabs.create({ url, active: true });
        if (url) await waitForLoad(tab.id!);
        const updated = await chrome.tabs.get(tab.id!);
        return JSON.stringify({ id: updated.id, title: updated.title, url: updated.url });
      }
    }),

    new DynamicStructuredTool({
      name: 'browser_close_tab',
      description: 'Close a browser tab by its ID. If no ID is given, closes the current active tab.',
      schema: z.object({
        tabId: z.number().optional().describe('ID of the tab to close. Defaults to the active tab.')
      }),
      func: async ({ tabId }) => {
        const id = tabId ?? (await getActiveTabId());
        await chrome.tabs.remove(id);
        return `Tab ${id} closed.`;
      }
    }),

    new DynamicStructuredTool({
      name: 'browser_switch_tab',
      description: 'Switch to a specific tab by its ID, making it the active tab.',
      schema: z.object({
        tabId: z.number().describe('ID of the tab to switch to. Use browser_list_tabs to find tab IDs.')
      }),
      func: async ({ tabId }) => {
        await chrome.tabs.update(tabId, { active: true });
        const tab = await chrome.tabs.get(tabId);
        return JSON.stringify({ id: tab.id, title: tab.title, url: tab.url });
      }
    })
  ];

  return tools;
};
