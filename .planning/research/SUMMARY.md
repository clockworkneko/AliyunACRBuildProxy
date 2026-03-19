# Project Research Summary

**Project:** ASOR (ACR Smart Orchestrator & Resolver)
**Domain:** Container Registry Automation / CLI Tool
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

ASOR CLI 是一個輕量級命令列工具，專為解決中國開發者面臨的 GFW 和 Docker Hub 存取問題而設計。使用者透過簡單的命令列操作即可掛載 GitHub 倉庫到阿里雲 ACR，並透過別名快速查詢映像路徑。

建議採用 TypeScript + Node.js + Commander.js + SQLite 的輕量級技術棧。單一執行檔分發，無需額外基礎設施。兩個核心命令：`asor add` 管理倉庫，`asor resolve` 查詢路徑。

## Key Findings

### Recommended Stack

**Core technologies:**
- TypeScript 5.x：類型安全，CLI 工具生態豐富
- Node.js 20 LTS：CLI 工具標準執行環境
- Commander.js 12.x：CLI 框架
- SQLite：零配置，單一檔案，可攜帶

**CLI Libraries:**
- chalk：終端輸出著色
- ora：spinner 動畫
- clipboardy：剪貼簿操作
- conf：設定儲存

### Expected Features

**Must have:**
- `asor config` — 設定憑證
- `asor add <url> --alias <name>` — 掛載倉庫
- `asor resolve <alias>` — 查詢映像路徑
- `asor rules <alias>` — 管理構建規則

### Architecture Approach

命令列架構，服務層設計為可與未來 Server 模式共用。SQLite 儲存倉庫映射，conf 套件儲存憑證。

**Major components:**
1. CLI Entry (Commander.js) — 參數解析和路由
2. Command Layer — 各命令實作
3. Service Layer — 業務邏輯（可共用）

### Critical Pitfalls

1. **憑證明文儲存** — 加密儲存
2. **無反饋的長時間操作** — 使用 spinner

## Implications for Roadmap

### Phase 1: CLI 瑞士刀模式
**Rationale:** 先實作最簡單直接的使用方式
**Delivers:** 完整的 CLI 工具，可直接操作 ACR
**Addresses:** CRED-01~05, CLIR-01~06, CLIQ-01~04, CLRU-01~04

### Phase 2: HTTP Server 模式
**Rationale:** CI/CD 整合需求
**Delivers:** REST API、GitHub webhook
**Addresses:** SERV-01~05

### Phase Ordering Rationale

- CLI 模式是最小可行產品，驗證核心邏輯
- Server 模式需要更多基礎設施考量
- 服務層設計為共用，降低 Phase 2 工作量

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** 阿里雲 ACR OpenAPI 詳細文件

Phases with standard patterns (skip research-phase):
- **Phase 1:** CLI 工具標準模式

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Node.js CLI 是成熟模式 |
| Features | HIGH | 需求明確 |
| Architecture | HIGH | 標準 CLI 架構 |
| Pitfalls | HIGH | 常見問題 |

**Overall confidence:** HIGH

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*