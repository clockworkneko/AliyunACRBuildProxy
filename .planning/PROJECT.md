# ASOR (ACR Smart Orchestrator & Resolver)

## What This Is

ASOR 是一個自動化代理，將 Aliyun ACR（容器映像倉庫）的繁瑣配置與 GitHub 源碼倉庫徹底脫鉤並自動化。它自動化 ACR 倉庫的手動設定，並提供別名解析機制簡化映像拉取。專為中國開發者處理 GFW 相關的 Docker Hub 存取問題而設計。

提供兩種使用模式：
- **Server 模式**：啟動 HTTP 伺服器，提供 API 供 CI/CD 整合
- **CLI 模式（瑞士刀）**：無需伺服器，直接命令列操作

## Core Value

消除 GFW 帶來的開發障礙，透過自動化編排阿里雲 ACR，將 GitHub 程式碼自動轉化為國內可高速拉取的容器映像，並提供簡單的別名解析器 —— 讓部署像在局域網一樣簡單。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 使用者可以安全地註冊 GitHub PAT 和阿里雲 AK/SK 憑證
- [ ] 使用者可以透過 GitHub URL 掛載倉庫並自動建立 ACR 倉庫
- [ ] 使用者可以定義別名並解析為完整的 ACR 映像路徑
- [ ] 系統自動管理 ACR 的 10 條構建規則限制
- [ ] 系統提供解析 API 供 CI/CD 整合（Server 模式）
- [ ] 系統提供 CLI 工具直接操作（CLI 模式）

### Out of Scope

- 容器映像資料代理 —— 系統僅處理元資料/位址
- 即時聊天或協作功能 —— 非核心價值
- 行動應用程式 —— web-first，行動端延後
- OAuth 登入 —— PAT 認證對 v1 已足夠

## Context

### Background: GFW and Docker Problem

在中國，`docker pull` 從 Docker Hub 面臨：
- 自 2024 年起完全阻擋或嚴重限速
- 下載速度極慢（數百 MB 需要數小時）
- GitHub Actions 無法輕易部署到國內伺服器

阿里雲 ACR 作為橋樑：
- 國內高速存取透過阿里雲節點
- 海外構建節點（香港、新加坡、美國）可以順暢拉取 GitHub 和 Docker Hub
- 作為「海外構建 -> 國內分發」的中介

### Management Pain Points Solved

- UI 複雜：每個專案需要數十次手動點擊
- URL 混亂：不同區域/命名空間有不同的 URL
- 規則僵化：10 條規則限制 CI/CD 靈活性

## Constraints

- **Cloud Platform**: Aliyun ACR — 主要目標平台，其他 registry 不在範圍內
- **Source Control**: GitHub — GitLab/Bitbucket 延後
- **Rule Limit**: 每個 ACR 倉庫 10 條構建規則 —— 需要智慧管理的硬性限制
- **Region**: 優先使用海外構建節點（cn-hongkong）以繞過 GFW
- **Language**: 繁體中文
- **Scale**: 最多 1000 個倉庫 —— 單一使用者/小團隊使用
- **Resource**: 最小化 CPU 和記憶體使用 —— 輕量級設計
- **Bandwidth**: 不處理映像資料，僅簡單反射位址 —— 零頻寬模式

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 雙模式設計（Server + CLI） | CLI 滿足簡單場景，Server 滿足 CI/CD 整合 | — Pending |
| 零頻寬模式（無映像代理） | 降低基礎設施複雜度，維持拉取速度 | — Pending |
| 別名解析 | 簡化開發者體驗，抽象 ACR URL 複雜度 | — Pending |
| 單體架構（無 Redis/佇列） | 規模小（<1000 倉庫），無需複雜基礎設施 | — Pending |
| 共用核心邏輯 | CLI 和 Server 共用相同的 service 層 | — Pending |

---
*Last updated: 2026-03-19 after adding CLI mode*