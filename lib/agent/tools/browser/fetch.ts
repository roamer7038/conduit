// lib/agent/tools/browser/fetch.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Create a tool that fetches content from a specified URL using the Fetch API.
 */
export function createFetchTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'browser_fetch_url',
    description:
      'Fetch the content of a specified URL using the Fetch API. Returns the response status, headers, and body text. This does not navigate the browser tab.',
    schema: z.object({
      url: z.string().describe('The URL to fetch content from.'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
        .default('GET')
        .describe('HTTP method to use. Defaults to GET.'),
      headers: z.record(z.string(), z.string()).optional().describe('Optional HTTP headers to include in the request.'),
      body: z.string().optional().describe('Optional request body (for POST/PUT/PATCH).')
    }),
    func: async ({ url, method, headers, body }) => {
      try {
        const init: RequestInit = { method };
        if (headers) {
          init.headers = headers;
        }
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
          init.body = body;
        }

        const response = await fetch(url, init);

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        const text = await response.text();

        // Truncate very long responses to avoid exceeding token limits
        const MAX_LENGTH = 50000;
        const truncated = text.length > MAX_LENGTH;
        const content = truncated ? text.slice(0, MAX_LENGTH) : text;

        return JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: content,
          truncated,
          url: response.url
        });
      } catch (error) {
        return JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          url
        });
      }
    }
  });
}
