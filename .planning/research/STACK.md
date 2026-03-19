# Stack Research

**Domain:** Container Registry Automation / CLI Tool
**Researched:** 2026-03-19
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | 5.x | 主要語言 | 類型安全，優秀的 IDE 支援，CLI 工具生態豐富 |
| Node.js | 20 LTS | 執行環境 | 原生非同步 I/O，阿里雲 SDK 支援良好，CLI 工具常用 |
| SQLite | 3.x | 本地資料庫 | 零配置，適合 <1000 倉庫規模，單一檔案，可攜帶 |
| Commander.js | 12.x | CLI 框架 | Node.js CLI 標準，簡單易用，子命令支援 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @alicloud/acr20221201 | latest | 阿里雲 ACR SDK | 所有 ACR 操作 |
| @octokit/rest | 21.x | GitHub API 客戶端 | 分支狀態查詢 |
| zod | 3.x | Schema 驗證 | 輸入驗證、設定驗證 |
| conf | 13.x | 本地設定儲存 | 憑證、使用者偏好 |
| chalk | 5.x | 終端輸出著色 | 友善的 CLI 輸出 |
| ora | 8.x | 終端 spinner | 長時間操作的反饋 |
| clipboardy | 4.x | 剪貼簿操作 | `--copy` 功能 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsx | TypeScript 執行 | 快速開發 |
| Vitest | 測試框架 | 快速，原生 TypeScript |
| pkg | 打包成執行檔 | 發布單一執行檔 |

## Installation

```bash
# Core
npm install commander zod conf chalk ora clipboardy

# Aliyun SDK
npm install @alicloud/acr20221201 @alicloud/openapi

# GitHub Integration
npm install @octokit/rest

# Database
npm install better-sqlite3 drizzle-orm

# Dev dependencies
npm install -D typescript @types/node tsx vitest drizzle-kit @types/better-sqlite3 @vercel/nft
```

## CLI Structure

```bash
# 設定憑證
asor config set github-token <pat>
asor config set aliyun-access-key <ak> <sk>
asor config set aliyun-region cn-hongkong

# 倉庫管理
asor add https://github.com/user/repo --alias my-app
asor list
asor remove my-app

# 別名查詢
asor resolve my-app
asor resolve my-app:latest
asor resolve my-app --copy

# 規則管理
asor rules my-app
asor rules my-app add feature/auth:feature-auth
asor rules my-app remove 1
asor rules my-app cleanup
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Commander.js | Yargs | 更複雜的參數解析需求 |
| conf | 自訂 JSON 檔案 | 需要特殊設定邏輯 |
| SQLite | JSON 檔案 | 如果資料量極小（<50 倉庫） |
| TypeScript | Go | 需要更小的執行檔體積 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Redis | 對 CLI 工具過度設計 | SQLite 或記憶體 |
| 佇列系統 | CLI 是即時互動 | 同步處理 |
| PostgreSQL | CLI 工具不需要 | SQLite |
| Electron | 非 GUI 應用 | 純 CLI |

## Distribution

### 單一執行檔（推薦）

使用 `pkg` 打包成單一執行檔：
```bash
pkg . --targets node20-linux-x64,node20-macos-x64,node20-win-x64
```

優點：
- 無需 Node.js 環境
- 直接執行
- 安裝簡單

### npm 套件

```bash
npm install -g asor
```

適合已有 Node.js 環境的開發者。

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node 20 LTS | 所有套件 | 生產環境建議 |
| better-sqlite3 | Node 18+ | 需要 native 編譯 |

## Sources

- Aliyun ACR SDK 文件
- GitHub REST API 文件
- Commander.js 文件
- Node.js CLI 最佳實踐

---
*Stack research for: CLI Tool*
*Researched: 2026-03-19*