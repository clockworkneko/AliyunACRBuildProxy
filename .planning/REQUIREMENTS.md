# Requirements: ASOR (ACR Smart Orchestrator & Resolver)

**Defined:** 2026-03-19
**Core Value:** 消除 GFW 帶來的開發障礙，透過自動化編排阿里雲 ACR，將 GitHub 程式碼自動轉化為國內可高速拉取的容器映像，並提供簡單的別名解析器。

## v1 Requirements

初始版本需求。每個需求映射到路線圖階段。

### 憑證管理 (CRED)

- [ ] **CRED-01**: 使用者可以透過 CLI 設定 GitHub PAT（儲存於本地設定檔）
- [ ] **CRED-02**: 使用者可以透過 CLI 設定阿里雲 AK/SK（儲存於本地設定檔）
- [ ] **CRED-03**: 憑證在本地設定檔中加密儲存
- [ ] **CRED-04**: CLI 可驗證憑證有效性
- [ ] **CRED-05**: 憑證支援指定阿里雲區域

### CLI 倉庫管理 (CLIR)

- [ ] **CLIR-01**: 使用者可執行 `asor add <github-url> --alias <name>` 掛載倉庫
- [ ] **CLIR-02**: CLI 自動在阿里雲 ACR 建立對應倉庫
- [ ] **CLIR-03**: CLI 自動配置預設構建規則（main -> latest）
- [ ] **CLIR-04**: CLI 顯示掛載結果（ACR URL、docker pull 命令）
- [ ] **CLIR-05**: 使用者可執行 `asor list` 列出所有已掛載倉庫
- [ ] **CLIR-06**: 使用者可執行 `asor remove <alias>` 移除倉庫映射

### CLI 別名查詢 (CLIQ)

- [ ] **CLIQ-01**: 使用者可執行 `asor resolve <alias>` 查詢 ACR 映像路徑
- [ ] **CLIQ-02**: 使用者可執行 `asor resolve <alias>:<tag>` 查詢特定標籤
- [ ] **CLIQ-03**: CLI 輸出完整 docker pull 命令
- [ ] **CLIQ-04**: 使用者可執行 `asor resolve <alias> --copy` 複製路徑到剪貼簿

### CLI 規則管理 (CLRU)

- [ ] **CLRU-01**: 使用者可執行 `asor rules <alias>` 列出構建規則
- [ ] **CLRU-02**: 使用者可執行 `asor rules <alias> add <branch>:<tag>` 新增規則
- [ ] **CLRU-03**: 使用者可執行 `asor rules <alias> remove <rule-id>` 刪除規則
- [ ] **CLRU-04**: 使用者可執行 `asor rules <alias> cleanup` 清理已合併分支規則

## v2 Requirements

延後至未來版本。

### HTTP Server 模式 (SERV)

- **SERV-01**: 啟動 HTTP 伺服器提供 REST API
- **SERV-02**: 提供 `/provision` 端點掛載倉庫
- **SERV-03**: 提供 `/resolve` 端點查詢別名
- **SERV-04**: 提供 `/rules` 端點管理規則
- **SERV-05**: GitHub webhook 端點接收事件

### 通知 (NOTIF)

- **NOTIF-01**: 構建成功/失敗時發送通知

### 多區域 (MREG)

- **MREG-01**: 支援同一別名映射到多個區域

## Out of Scope

明確排除。

| Feature | Reason |
|---------|--------|
| 映像資料代理 | 零頻寬模式，僅處理位址 |
| GitLab/Bitbucket 支援 | 專注 GitHub |
| Web UI | 優先 CLI |
| OAuth 登入 | PAT 認證已足夠 |
| 多租戶 | 單一使用者/小團隊 |

## Traceability

哪些階段涵蓋哪些需求。

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRED-01 | Phase 1 | Pending |
| CRED-02 | Phase 1 | Pending |
| CRED-03 | Phase 1 | Pending |
| CRED-04 | Phase 1 | Pending |
| CRED-05 | Phase 1 | Pending |
| CLIR-01 | Phase 1 | Pending |
| CLIR-02 | Phase 1 | Pending |
| CLIR-03 | Phase 1 | Pending |
| CLIR-04 | Phase 1 | Pending |
| CLIR-05 | Phase 1 | Pending |
| CLIR-06 | Phase 1 | Pending |
| CLIQ-01 | Phase 1 | Pending |
| CLIQ-02 | Phase 1 | Pending |
| CLIQ-03 | Phase 1 | Pending |
| CLIQ-04 | Phase 1 | Pending |
| CLRU-01 | Phase 1 | Pending |
| CLRU-02 | Phase 1 | Pending |
| CLRU-03 | Phase 1 | Pending |
| CLRU-04 | Phase 1 | Pending |
| SERV-01 | Phase 2 | Pending |
| SERV-02 | Phase 2 | Pending |
| SERV-03 | Phase 2 | Pending |
| SERV-04 | Phase 2 | Pending |
| SERV-05 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after prioritizing CLI mode*