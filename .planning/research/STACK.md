# Stack Research

**Domain:** Container Registry Automation / ACR Orchestrator
**Researched:** 2026-03-19
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | 5.x | 主要語言 | 類型安全適合複雜 API 整合，優秀的 IDE 支援，後端服務的業界標準 |
| Node.js | 20 LTS | 執行環境 | 原生非同步 I/O 適合 API 密集操作，優秀的阿里雲 SDK 支援 |
| Fastify | 5.x | Web 框架 | 高效能，內建驗證，優秀的 TypeScript 支援，比 Express 快 2 倍 |
| PostgreSQL | 16 | 主要資料庫 | ACID 合規確保憑證映射的一致性，JSONB 支援彈性的規則儲存，可靠性經過驗證 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @alicloud/acr20221201 | latest | 阿里雲 ACR SDK | 核心整合 — 所有 ACR 操作 |
| @octokit/rest | 21.x | GitHub API 客戶端 | 所有 GitHub 操作（分支狀態、webhook 處理） |
| zod | 3.x | Schema 驗證 | API 請求/回應驗證，設定驗證 |
| ioredis | 5.x | Redis 客戶端 | 快取、速率限制、工作階段管理 |
| bullmq | 5.x | 任務佇列 | 背景規則清理、非同步配置 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsx | TypeScript 執行 | 快速開發，無需建置步驟 |
| Vitest | 測試框架 | 快速，原生 TypeScript，Jest 相容 API |
| Biome | Linting/Formatting | ESLint/Prettier 的快速替代方案 |

## Installation

```bash
# Core
npm install fastify @fastify/cors @fastify/jwt zod

# Aliyun SDK
npm install @alicloud/acr20221201 @alicloud/openapi

# GitHub Integration
npm install @octokit/rest

# Database
npm install pg drizzle-orm

# Queue & Cache
npm install ioredis bullmq

# Dev dependencies
npm install -D typescript @types/node tsx vitest drizzle-kit
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Fastify | Express | 舊有程式碼，更大的中介軟體生態系 |
| PostgreSQL | MongoDB | 如果文件結構變化很大，設定更簡單 |
| BullMQ | Temporal | 複雜工作流程需要補償邏輯，分散式系統 |
| TypeScript | Go | 如果團隊有 Go 專業知識，CPU 密集任務效能更好 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Serverless Functions | 冷啟動對 GitHub webhook 回應時間有問題，狀態管理複雜 | 容器化部署 |
| SQLite | 不適合並行存取模式，無 JSONB 支援 | PostgreSQL |
| REST 用於內部服務 | 服務間通訊的開銷 | gRPC 或直接函數呼叫 |
| 直接將憑證儲存在程式碼中 | 安全風險，無稽核記錄 | 加密資料庫儲存配合金鑰管理 |

## Stack Patterns by Variant

**如果簡單的單一使用者設定：**
- 移除 BullMQ（使用直接 async/await）
- 移除 Redis（使用記憶體內快取）
- 更簡單的部署，更低成本

**如果是多租戶 SaaS：**
- 在資料庫 schema 加入多租戶層
- 在 API 路由加入租戶隔離
- 考慮每個租戶使用獨立的 ACR 實例

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node 20 LTS | 所有套件 | 生產環境建議使用 |
| @alicloud/acr20221201 | Node 16+ | 需要 ES modules 支援 |
| Fastify 5 | Node 18+ | 需要原生 fetch API |

## Sources

- Aliyun ACR SDK 文件 — 驗證 API 功能
- GitHub REST API 文件 — webhook 和分支狀態端點
- Fastify 效能基準 — 效能驗證
- Node.js LTS 時程 — 版本支援時程

---
*Stack research for: Container Registry Automation*
*Researched: 2026-03-19*