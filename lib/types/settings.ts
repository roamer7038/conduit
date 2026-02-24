// lib/types/settings.ts
export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  transport: 'sse' | 'http';
  headers: Record<string, string>;
  enabled: boolean;
}

export interface TestResult {
  success: boolean;
  toolCount?: number;
  error?: string;
}
