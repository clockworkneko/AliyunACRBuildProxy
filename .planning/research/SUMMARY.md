# Project Research Summary

**Project:** ASOR (ACR Smart Orchestrator & Resolver)
**Domain:** Container Registry Automation
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

ASOR 是一個容器映像倉庫自動化系統，專為解決中國開發者面臨的 GFW 和 Docker Hub 存取問題而設計。該系統透過自動化編排阿里雲 ACR，將 GitHub 程式碼轉化為國內可高速拉取的容器映像，並提供別名解析機制簡化部署流程。

建議採用 TypeScript + Node.js + Fastify + PostgreSQL 的技術棧，這是目前建構此類 API 密集型後端服務的業界標準。主要風險在於憑證安全管理和 GitHub API 速率限制，可透過加密儲存和快取策略來緩解。

## Key Findings

### Recommended Stack

建議使用 TypeScript 生態系統建構，配合 Fastify 提供高效能 API 層，PostgreSQL 處理資料持久化。這個組合在處理複雜 API 整合時提供類型安全和開發效率。

**Core technologies:**
- TypeScript 5.x：類型安全，適合複雜 API 整合
- Node.js 20 LTS：原生非同步 I/O，阿里雲 SDK 支援良好
- Fastify 5.x：高效能 Web 框架，內建驗證
- PostgreSQL 16：ACID 合規，JSONB 支援彈性規則儲存

### Expected Features

**Must have (table stakes):**
- 安全憑證儲存 — 使用者預期系統安全處理敏感金鑰
- GitHub 倉庫掛載 — 核心價值，一鍵 ACR 設定
- 別名轉 URL 解析 — 核心價值，簡化部署
- 構建規則管理 — CI/CD 必需，處理 10 條規則限制

**Should have (competitive):**
- 智慧規則清理 — 感知 GitHub 分支狀態，自動清理已合併分支規則
- Webhook 通知 — 構建狀態可見性

**Defer (v2+):**
- 302 重定向模式 — 部署複雜度高
- 多租戶隔離 — SaaS 使用案例

### Architecture Approach

採用三層架構：API Layer 處理 HTTP 路由，Service Layer 包含業務邏輯，Data Layer 管理持久化。背景任務使用 BullMQ 處理規則清理等非同步操作。

**Major components:**
1. Orchestrator Service — 管理 ACR 倉庫和 GitHub webhook 整合
2. Resolver Service — 別名查詢和 URL 生成
3. Rule Manager — 10 條規則限制的智慧管理

### Critical Pitfalls

1. **憑證在日誌中外洩** — 絕不記錄敏感欄位，實作憑證清理中介軟體
2. **規則管理中的競態條件** — 使用樂觀鎖定和資料庫交易
3. **GitHub Webhook 認證繞過** — 驗證 X-Hub-Signature-256 簽章

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: 憑證管理與基礎 API
**Rationale:** 安全憑證儲存是所有後續功能的基礎，必須先建立信任
**Delivers:** 憑證加密儲存、基本 API 框架、健康檢查端點
**Addresses:** 安全憑證儲存功能
**Avoids:** 憑證外洩、區域不匹配問題

### Phase 2: GitHub 整合與倉庫掛載
**Rationale:** 需要憑證管理完成後才能進行 GitHub 和 ACR 操作
**Delivers:** GitHub PAT 驗證、ACR 倉庫自動建立、基本 webhook 處理
**Uses:** @octokit/rest、@alicloud/acr20221201 SDK
**Implements:** Orchestrator Service
**Avoids:** Webhook 認證繞過漏洞

### Phase 3: 構建規則管理
**Rationale:** 在倉庫建立後管理構建規則，處理 10 條限制
**Delivers:** 規則 CRUD API、基本限制處理
**Implements:** Rule Manager
**Avoids:** 競態條件問題

### Phase 4: 別名解析與智慧清理
**Rationale:** 完整價值交付，智慧清理需要 GitHub 分支狀態整合
**Delivers:** 別名解析 API、智慧規則清理背景任務、狀態端點
**Implements:** Resolver Service、背景任務處理
**Avoids:** 過時映射問題

### Phase Ordering Rationale

- 憑證管理必須第一，因為所有後續功能都需要憑證
- GitHub 整合在憑證後，因為需要 PAT 和 AK/SK
- 規則管理在倉庫建立後，因為規則屬於倉庫
- 智慧清理最後，因為需要完整的 GitHub 整合才能感知分支狀態

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** 阿里雲 ACR OpenAPI 詳細文件需要查閱，確認倉庫建立和規則設定的具體參數
- **Phase 3:** 10 條規則限制的邊界案例需要驗證

Phases with standard patterns (skip research-phase):
- **Phase 1:** 標準的憑證加密儲存模式，文件充足
- **Phase 4:** 別名解析是標準的查詢服務模式

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | TypeScript + Node.js 是此類系統的業界標準 |
| Features | HIGH | 從 idea 文件中提取的需求明確 |
| Architecture | HIGH | 標準三層架構適合此類 API 服務 |
| Pitfalls | HIGH | 常見的安全和並行問題，解決方案明確 |

**Overall confidence:** HIGH

### Gaps to Address

- 阿里雲 ACR 海外構建節點的具體配置選項需要在 Phase 2 規劃時查閱官方文件
- GitHub webhook 簽章驗證的具體實作細節需要在 Phase 2 確認

## Sources

### Primary (HIGH confidence)
- 阿里雲 ACR API 文件 — 倉庫和規則管理 API
- GitHub REST API 文件 — webhook 和分支狀態端點
- Node.js 安全最佳實踐 — 憑證處理

### Secondary (MEDIUM confidence)
- Fastify 最佳實踐 — API 架構模式
- BullMQ 文件 — 背景任務處理

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*