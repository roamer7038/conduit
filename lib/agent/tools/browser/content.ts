// lib/agent/tools/browser/content.ts
/// <reference types="chrome" />
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Helper: get the current active tab ID
const getActiveTabId = async (): Promise<number> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found.');
  return tab.id;
};

export function createContentTools(): DynamicStructuredTool[] {
  return [
    // browser_get_page_content
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

    // browser_get_page_links
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

    // browser_get_page_html
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

    // browser_search_in_page
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
    })
  ];
}
