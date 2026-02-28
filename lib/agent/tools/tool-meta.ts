/**
 * Metadata definition for each browser tool.
 * Used for both the agent tool filter and the Settings UI.
 */
export interface ToolMeta {
  /** Tool name must match the `name` property in DynamicStructuredTool */
  name: string;
  /** Human-readable label shown in Settings */
  label: string;
  /** Short description shown in Settings */
  description: string;
  /** Category for grouping in Settings UI */
  category: 'navigation' | 'content' | 'interaction' | 'screenshot' | 'download' | 'tab';
}

export const BROWSER_TOOL_META: ToolMeta[] = [
  // Navigation
  {
    name: 'browser_get_active_tab',
    label: '現在タブ情報の取得',
    description: 'アクティブタブのタイトルとURLを取得します。',
    category: 'navigation'
  },
  {
    name: 'browser_navigate',
    label: 'URLへの移動',
    description: '現在のタブを指定URLへ遷移させます。',
    category: 'navigation'
  },
  {
    name: 'browser_go_back',
    label: '前のページへ戻る',
    description: 'ブラウザの戻るボタンと同じ動作です。',
    category: 'navigation'
  },
  {
    name: 'browser_go_forward',
    label: '次のページへ進む',
    description: 'ブラウザの進むボタンと同じ動作です。',
    category: 'navigation'
  },
  {
    name: 'browser_reload',
    label: 'ページの再読み込み',
    description: '現在のページをリロードします。',
    category: 'navigation'
  },

  // Content
  {
    name: 'browser_fetch_url',
    label: 'URL情報の取得',
    description: '指定URLの内容をFetch APIで取得します。',
    category: 'content'
  },
  {
    name: 'browser_get_page_content',
    label: 'ページテキストの取得',
    description: 'ページの読みやすいテキストを取得します。',
    category: 'content'
  },
  {
    name: 'browser_get_page_links',
    label: 'ページ内リンクの取得',
    description: 'ページ上のハイパーリンク一覧を取得します。',
    category: 'content'
  },
  {
    name: 'browser_get_page_html',
    label: '生HTMLの取得',
    description: 'ページまたは要素の生HTMLを取得します。',
    category: 'content'
  },
  {
    name: 'browser_search_in_page',
    label: 'ページ内テキスト検索',
    description: 'ページ内のテキストを検索してマッチ箇所を返します。',
    category: 'content'
  },
  // Interaction
  {
    name: 'browser_click_element',
    label: '要素のクリック',
    description: 'CSSセレクタで指定した要素をクリックします。',
    category: 'interaction'
  },
  {
    name: 'browser_type_text',
    label: 'テキスト入力',
    description: 'フォームの入力欄にテキストを入力します。',
    category: 'interaction'
  },
  {
    name: 'browser_scroll',
    label: 'スクロール',
    description: 'ページをスクロールします。',
    category: 'interaction'
  },
  // Screenshot
  {
    name: 'browser_screenshot',
    label: 'スクリーンショット取得',
    description: '現在のページの画像をLLMが視覚的に理解するために取得します。',
    category: 'screenshot'
  },
  // Download
  {
    name: 'browser_download_file',
    label: 'ファイルのダウンロード',
    description: '指定URLのファイルをダウンロードします。',
    category: 'download'
  },
  // Tab Management
  {
    name: 'browser_list_tabs',
    label: 'タブ一覧の取得',
    description: '現在のウィンドウの全タブ一覧（ID・タイトル・URL）を返します。',
    category: 'tab'
  },
  {
    name: 'browser_open_tab',
    label: '新しいタブを開く',
    description: '新規タブを開き、必要に応じてURLへ乗移します。',
    category: 'tab'
  },
  {
    name: 'browser_close_tab',
    label: 'タブを閉じる',
    description: '指定IDのタブを閉じます。省略時はアクティブタブを閉じます。',
    category: 'tab'
  },
  {
    name: 'browser_switch_tab',
    label: 'タブの切り替え',
    description: '指定IDのタブをアクティブに切り替えます。',
    category: 'tab'
  }
];

/** Storage key used to persist enabled tool names */
export const TOOL_SETTINGS_STORAGE_KEY = 'enabledTools';

/** Returns all tool names (= default: all enabled) */
export const getAllToolNames = (): string[] => BROWSER_TOOL_META.map((t) => t.name);
