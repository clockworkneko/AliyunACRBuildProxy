# Roadmap: ASOR (ACR Smart Orchestrator & Resolver)

## Overview

ASOR 從一個輕量級 CLI 工具開始，讓開發者透過命令列快速管理阿里雲 ACR 倉庫和別名解析。Phase 1 完成 CLI 瑞士刀模式，Phase 2 加入 HTTP Server 模式供 CI/CD 整合。

## Phases

- [x] **Phase 1: CLI 瑞士刀模式** - 完整的命令列工具，管理倉庫和查詢映像路徑
- [ ] **Phase 2: HTTP Server 模式** - REST API 和 GitHub webhook 整合

## Phase Details

### Phase 1: CLI 瑞士刀模式
**Goal**: 提供完整的命令列工具，使用者可透過 `asor add` 和 `asor resolve` 管理倉庫
**Depends on**: Nothing (first phase)
**Requirements**: CRED-01~05, CLIR-01~06, CLIQ-01~04, CLRU-01~04
**Success Criteria** (what must be TRUE):
  1. 使用者可以執行 `asor config set` 設定 GitHub PAT 和阿里雲 AK/SK
  2. 使用者可以執行 `asor add <github-url> --alias <name>` 成功建立 ACR 倉庫
  3. 使用者可以執行 `asor resolve <alias>` 獲得完整的 docker pull 命令
  4. 使用者可以執行 `asor rules <alias> cleanup` 清理已合併分支的規則
**Plans**: 4 plans

Plans:
- [x] 01-01: CLI 框架與憑證管理 — Commander.js 設定、config 命令實作
- [x] 01-02: 倉庫管理命令 — add、list、remove 命令實作
- [x] 01-03: 別名解析命令 — resolve 命令實作
- [x] 01-04: 規則管理命令 — rules 命令實作

Plan files:
- `.planning/phases/01-cli/01-01-PLAN.md`
- `.planning/phases/01-cli/01-02-PLAN.md`
- `.planning/phases/01-cli/01-03-PLAN.md`
- `.planning/phases/01-cli/01-04-PLAN.md`

### Phase 2: HTTP Server 模式
**Goal**: 提供 REST API 和 GitHub webhook 整合，支援 CI/CD 自動化
**Depends on**: Phase 1
**Requirements**: SERV-01~05
**Success Criteria** (what must be TRUE):
  1. 使用者可以啟動 HTTP 伺服器並呼叫 `/provision` 端點掛載倉庫
  2. 使用者可以呼叫 `/resolve?alias=<name>` 獲得 ACR 映像路徑
  3. GitHub webhook 可以觸發自動構建
  4. Webhook 端點驗證 GitHub 簽章
**Plans**: 4 plans

Plans:
- [x] 02-01: HTTP Server Foundation — Fastify app factory, envelope plugin, API key auth
- [ ] 02-02: Daemon Lifecycle — Server entry point, daemon manager, CLI commands
- [ ] 02-03: REST API Endpoints — /provision, /resolve, /rules endpoints
- [ ] 02-04: GitHub Webhook Integration — webhook endpoint and HMAC signature verification

Plan files:
- `.planning/phases/02-http-server/02-01-PLAN.md`
- `.planning/phases/02-http-server/02-02-PLAN.md`
- `.planning/phases/02-http-server/02-03-PLAN.md`
- `.planning/phases/02-http-server/02-04-PLAN.md`

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CLI 瑞士刀模式 | 4/4 | Complete | 2026-03-19 |
| 2. HTTP Server 模式 | 1/4 | In Progress | 2026-03-19 |

---
*Roadmap created: 2026-03-19*
*Last updated: 2026-03-19*