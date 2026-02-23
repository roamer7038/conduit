# Browser Agent Extension

Google Chrome向けAIエージェント拡張機能です。WXT、React 19、Shadcn UI、そしてLangGraphを活用し、ブラウザ上で動作する高度なAIアシスタントを提供します。

## 特徴

- 🤖 **AIエージェント搭載**: LangChain.js と LangGraph.js を採用した自律型エージェント。
- 🌐 **ブラウザ操作**: 新しいタブを開いたり、アクティブなタブの情報を読み取ることが可能。
- 🔌 **MCP (Model Context Protocol) 対応**: 外部のMCPサーバーと接続し、エージェントの機能を拡張できます。
- 💾 **永続的な記憶**: Chrome Storageを利用して会話履歴やエージェントの状態を保存。
- ⚛️ **モダンなUI**: React 19、Tailwind CSS 4、Shadcn UIによる美しく使いやすいインターフェース。

## アーキテクチャ

この拡張機能は以下の主要コンポーネントで構成されています。

### Background Script (`entrypoints/background.ts`)

エージェントの頭脳となる部分です。LangGraphエージェントをホストし、ポップアップからのメッセージを処理します。エージェントの状態管理やツール実行（ブラウザ操作、MCPサーバー通信など）を担当します。

### Popup (`entrypoints/popup/`)

ユーザーインターフェースです。Reactで構築され、ユーザーとのチャット機能を提供します。Background Scriptと通信してAIからの応答を表示します。

### Storage

`chrome.storage.local` を使用して、以下の情報を管理します。

- APIキー、ベースURL、モデル名などの設定
- 会話履歴（スレッド）
- 前回のセッション状態

## クイックスタート

### 前提条件

- Node.js (バージョン20以上推奨)
- pnpm

### インストール

```bash
git clone https://github.com/roamer7038/browser-agent-extension.git
cd browser-agent-extension
pnpm install
```

### 開発

開発サーバーを起動すると、コードの変更が自動的にリロードされます。

**Google Chromeでの開発:**

```bash
pnpm dev
```

コマンド実行後、`.output/chrome-mv3` ディレクトリが生成されます。これをブラウザに読み込ませてください。

#### ブラウザへの読み込み方法

- **Chrome**: `chrome://extensions/` を開き、デベロッパーモードをオンにして「パッケージ化されていない拡張機能を読み込む」から `.output/chrome-mv3` を選択します。

### 設定

拡張機能をインストール後、アイコンをクリックしてポップアップを開き、設定画面（歯車アイコン）から以下を入力してください。

1.  **API Key**: OpenAI互換のAPIキー
2.  **Base URL** (任意): カスタムエンドポイントを使用する場合
3.  **Model Name** (任意): 使用するモデル名 (例: `gpt-4o`, `claude-3-5-sonnet` 等)

## ビルド

本番環境用に最適化されたビルドを作成します。

```bash
pnpm build          # Chrome用
```

## パッケージング

ストア提出用のZIPファイルを作成します。

```bash
pnpm zip          # Chrome用
```

## 技術スタック

| カテゴリ            | 技術             | バージョン |
| ------------------- | ---------------- | ---------- |
| Extension Framework | **WXT**          | ^0.20.17   |
| UI Framework        | **React**        | ^19.2.4    |
| UI Components       | **Shadcn UI**    | ^3.8.5     |
| Styling             | **Tailwind CSS** | ^4.2.0     |
| AI / LLM            | **LangChain.js** | ^1.2.25    |
| Agent Framework     | **LangGraph.js** | ^1.1.5     |
| Protocol            | **MCP Client**   | ^1.1.3     |
| Build Tool          | **Vite**         | ^7.3.1     |
| Language            | **TypeScript**   | ^5.9.3     |

## ライセンス

MIT License
