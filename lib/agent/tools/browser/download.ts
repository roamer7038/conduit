// lib/agent/tools/browser/download.ts
/// <reference types="chrome" />
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export function createDownloadTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'browser_download_file',
    description: "Download a file from a given URL to the user's default downloads folder.",
    schema: z.object({
      url: z.string().describe('The direct URL of the file to download.')
    }),
    func: async ({ url }) => {
      const downloadId = await chrome.downloads.download({ url });
      return `Started download (ID: ${downloadId}) for ${url}.`;
    }
  });
}
