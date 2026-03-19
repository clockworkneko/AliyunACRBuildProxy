# Requirements: ASOR (ACR Smart Orchestrator & Resolver)

**Defined:** 2026-03-19
**Core Value:** 消除 GFW 帶來的開發障礙，透過自動化編排阿里雲 ACR，將 GitHub 程式碼自動轉化為國內可高速拉取的容器映像，並提供簡單的別名解析器。

## v1 Requirements

初始版本需求。每個需求映射到路線圖階段。

### 憑證管理 (CRED)

- [ ] **CRED-01**: 使用者可以安全地註冊 GitHub PAT（Personal Access Token）
- [ ] **CRED-02**: 使用者可以安全地註冊阿里雲 AK/SK（AccessKey ID/Secret）
- [ ] **CRED-03**: 憑證在資料庫中加密儲存，使用業界標準加密演算法
- [ ] **CRED-04**: 系統驗證憑證有效性（GitHub PAT 權限檢查、阿里雲 AK/SK 存取測試）
- [ ] **CRED-05**: 憑證支援指定阿里雲區域（如 cn-hongkong、cn-shanghai）
- [ ] **CRED-06**: 日誌中不自動記錄敏感憑證資訊

### GitHub 整合 (GITH)

- [ ] **GITH-01**: 使用者可以透過 GitHub URL 掛載倉庫到系統
- [ ] **GITH-02**: 系統自動在阿里雲 ACR 建立對應的容器映像倉庫
- [ ] **GITH-03**: 系統自動設定 GitHub webhook 以觸發構建
- [ ] **GITH-04**: Webhook 端點驗證 GitHub 簽章（X-Hub-Signature-256）
- [ ] **GITH-05**: 系統自動配置預設構建規則（main 分支 -> latest 標籤）
- [ ] **GITH-06**: 掛載完成後自動生成 docker pull 指南文件

### 構建規則管理 (RULE)

- [ ] **RULE-01**: 使用者可以查看倉庫的所有構建規則
- [ ] **RULE-02**: 使用者可以新增自訂構建規則（分支 -> 標籤映射）
- [ ] **RULE-03**: 使用者可以刪除現有構建規則
- [ ] **RULE-04**: 系統在達到 10 條規則限制時發出警告
- [ ] **RULE-05**: 系統防止在已滿 10 條規則時新增規則（除非先刪除）

### 別名解析 (RESO)

- [ ] **RESO-01**: 使用者可以為倉庫定義簡短別名（如 "auth-api"）
- [ ] **RESO-02**: 使用者可以透過別名查詢完整的 ACR 映像路徑
- [ ] **RESO-03**: 解析 API 支援指定標籤（tag）參數
- [ ] **RESO-04**: 解析 API 回傳完整的 docker pull 命令
- [ ] **RESO-05**: 系統驗證別名格式（字母數字、連字符、底線）

### 智慧清理 (CLEAN)

- [ ] **CLEAN-01**: 系統定期檢查 GitHub 分支狀態
- [ ] **CLEAN-02**: 系統自動刪除已合併分支對應的構建規則
- [ ] **CLEAN-03**: 系統記錄清理操作日誌供審計
- [ ] **CLEAN-04**: 清理前檢查規則是否仍在使用中

## v2 Requirements

延後至未來版本。已追蹤但不在當前路線圖中。

### 多區域支援 (MREG)

- **MREG-01**: 支援同一別名映射到多個阿里雲區域
- **MREG-02**: 自動選擇離使用者最近的區域

### Webhook 通知 (NOTIF)

- **NOTIF-01**: 構建成功/失敗時發送通知
- **NOTIF-02**: 支援 Slack webhook 整合
- **NOTIF-03**: 支援自訂 webhook 端點

### 302 重定向模式 (REDIR)

- **REDIR-01**: 支援 HTTP 302 重定向到實際映像位址
- **REDIR-02**: 處理 Docker registry 協議的認證流程

## Out of Scope

明確排除。已記錄以防止範圍蔓延。

| Feature | Reason |
|---------|--------|
| 映像層代理/快取 | 高頻寬成本、延遲、單點故障 |
| 直接映像資料中轉 | 系統定位為元資料管理，非資料代理 |
| GitLab/Bitbucket 支援 | 專注 GitHub 整合，其他平台延後 |
| Web UI 規則編輯器 | 與自動清理邏輯衝突，優先提供 API |
| OAuth 登入 | PAT 認證對 v1 已足夠 |
| 行動應用程式 | Web-first，行動端延後 |
| 多租戶隔離 | SaaS 模式延後至 v2+ |

## Traceability

哪些階段涵蓋哪些需求。在路線圖建立時更新。

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRED-01 | Phase 1 | Pending |
| CRED-02 | Phase 1 | Pending |
| CRED-03 | Phase 1 | Pending |
| CRED-04 | Phase 1 | Pending |
| CRED-05 | Phase 1 | Pending |
| CRED-06 | Phase 1 | Pending |
| GITH-01 | Phase 2 | Pending |
| GITH-02 | Phase 2 | Pending |
| GITH-03 | Phase 2 | Pending |
| GITH-04 | Phase 2 | Pending |
| GITH-05 | Phase 2 | Pending |
| GITH-06 | Phase 2 | Pending |
| RULE-01 | Phase 3 | Pending |
| RULE-02 | Phase 3 | Pending |
| RULE-03 | Phase 3 | Pending |
| RULE-04 | Phase 3 | Pending |
| RULE-05 | Phase 3 | Pending |
| RESO-01 | Phase 4 | Pending |
| RESO-02 | Phase 4 | Pending |
| RESO-03 | Phase 4 | Pending |
| RESO-04 | Phase 4 | Pending |
| RESO-05 | Phase 4 | Pending |
| CLEAN-01 | Phase 4 | Pending |
| CLEAN-02 | Phase 4 | Pending |
| CLEAN-03 | Phase 4 | Pending |
| CLEAN-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*