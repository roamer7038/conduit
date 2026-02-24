// lib/agent/tools/browser/index.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createNavigationTools } from './navigation';
import { createContentTools } from './content';
import { createInteractionTools } from './interaction';
import { createScreenshotTool } from './screenshot';
import { createDownloadTool } from './download';
import { createTabTools } from './tabs';

/**
 * Create all browser tools
 * This function maintains backward compatibility with the original browser.ts
 */
export function createBrowserTools(): DynamicStructuredTool[] {
  return [
    ...createNavigationTools(),
    ...createContentTools(),
    ...createInteractionTools(),
    createScreenshotTool(),
    createDownloadTool(),
    ...createTabTools()
  ];
}

// Re-export individual tool creators for flexibility
export {
  createNavigationTools,
  createContentTools,
  createInteractionTools,
  createScreenshotTool,
  createDownloadTool,
  createTabTools
};
