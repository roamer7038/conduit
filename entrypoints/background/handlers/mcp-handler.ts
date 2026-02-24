// entrypoints/background/handlers/mcp-handler.ts
import { testMcpConnection } from '@/lib/agent/tools/mcp';
import type { McpServerConfig, TestResult } from '@/lib/types/settings';

export async function handleTestMcpConnection(server: McpServerConfig): Promise<TestResult> {
  try {
    const result = await testMcpConnection(server);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
