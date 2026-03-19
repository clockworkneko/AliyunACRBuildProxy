# Pitfalls Research

**Domain:** Container Registry Automation / ACR Orchestrator
**Researched:** 2026-03-19
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: 憑證在日誌中外洩

**What goes wrong:**
AK/SK 或 GitHub PAT 出現在應用程式日誌中，將敏感憑證暴露給任何有日誌存取權的人。

**Why it happens:**
開發者為了除錯記錄完整的請求/回應物件，或錯誤訊息包含帶有憑證的完整錯誤上下文。

**How to avoid:**
- 絕不在 INFO 層級記錄請求主體
- 實作憑證清理中介軟體
- 使用結構化日誌並明確選擇欄位
- 在任何除錯輸出中將憑證欄位標記為「已刪減」

**Warning signs:**
- 日誌包含 "AK..." 或 "ghp_" 模式
- 錯誤訊息顯示完整的 API 回應

**Phase to address:**
Phase 1（憑證儲存）— 從一開始就建立安全性

---

### Pitfall 2: 規則管理中的競態條件

**What goes wrong:**
兩個並行請求同時嘗試建立第 10 條規則，兩者都在驗證中成功，但一個在 ACR 失敗，導致系統狀態不一致。

**Why it happens:**
沒有鎖定的檢查後行動模式。系統檢查規則計數（看到 9），兩者都繼續建立，一個失敗。

**How to avoid:**
- 對規則計數實作樂觀鎖定
- 使用帶列級鎖定的資料庫交易
- 衝突時使用指數退避重試
- 在達到限制前搶先清理

**Warning signs:**
- 間歇性的「規則限制超過」錯誤
- 本地 DB 與 ACR 之間的規則計數不符

**Phase to address:**
Phase 3（規則管理）— 從一開始就為並行設計

---

### Pitfall 3: GitHub Webhook 認證繞過

**What goes wrong:**
攻擊者發送偽造的 webhook 事件來觸發構建或操作規則，繞過 GitHub 的真實性驗證。

**Why it happens:**
Webhook 端點接受任何 POST 請求，而不驗證 GitHub 的簽章。

**How to avoid:**
- 在所有 webhook 端點驗證 X-Hub-Signature-256 標頭
- 對簽章驗證使用常數時間比較
- 立即拒絕缺少或無效簽章的請求

**Warning signs:**
- Webhook 處理器沒有簽章驗證
- 使用查詢參數而非簽章驗證

**Phase to address:**
Phase 2（GitHub 整合）— 安全性必須內建，而非事後添加

---

### Pitfall 4: 過時的別名映射

**What goes wrong:**
使用者刪除或重命名 GitHub 倉庫，但別名仍指向舊的 ACR 倉庫。解析回傳有效 URL 但構建失敗。

**Why it happens:**
GitHub 狀態與本地映射表之間沒有同步。掛載是單向的。

**How to avoid:**
- 訂閱 GitHub 倉庫刪除/轉移事件
- 定期調解任務（每週）
- 驗證映射有效性的健康檢查端點
- 當底層資源不存在時提供清晰的錯誤訊息

**Warning signs:**
- 解析成功但構建失敗
- 使用者抱怨「殭屍」別名

**Phase to address:**
Phase 4（生命週期管理）— 持續維護功能

---

### Pitfall 5: ACR 區域不匹配

**What goes wrong:**
使用者為一個區域（例如 cn-shanghai）設定憑證，但嘗試在另一個區域（例如 cn-hongkong）建立倉庫，導致令人困惑的權限錯誤。

**Why it happens:**
阿里雲憑證在某些設定中是區域特定的，錯誤訊息沒有清楚指出問題。

**How to avoid:**
- 儲存並驗證憑證的區域
- 清晰的錯誤訊息：「憑證為區域 X 設定，但倉庫請求在區域 Y」
- 支援多區域憑證集
- 預設使用海外區域（cn-hongkong）以繞過 GFW

**Warning signs:**
- 儘管憑證有效仍出現「無權限」錯誤
- 使用者詢問區域設定

**Phase to address:**
Phase 1（憑證儲存）— 區域是憑證身份的一部分

---

## Technical Debt Patterns

看似合理但會造成長期問題的捷徑。

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 將憑證儲存在 .env | 快速設定，無 DB 遷移 | 無輪換、無稽核、安全風險 | 絕不 |
| 跳過 webhook 簽章驗證 | 更快的 MVP | 安全漏洞 | 絕不 |
| 單一全域憑證集 | 更簡單的實作 | 無多使用者支援、更難除錯 | 僅 MVP，v1 前替換 |
| 無背景任務佇列 | 更簡單的部署 | 逾時、使用者體驗差、擴展問題 | 僅當總共 <10 個倉庫 |

## Integration Gotchas

連接外部服務時的常見錯誤。

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Aliyun ACR | 假設 CreateRepo 是冪等的 | 先檢查倉庫是否存在，使用特定錯誤處理 |
| GitHub API | 輪詢狀態而非使用 webhook | 使用 webhook 處理事件，輪詢僅作後備 |
| GitHub API | 未處理速率限制 | 實作指數退避，使用條件請求 |
| PostgreSQL | 未使用連線池 | 設定 PgBouncer 或使用內建池 |

## Performance Traps

在小規模有效但隨用量增長而失敗的模式。

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 同步規則清理 | 配置請求慢 | 背景任務 | 50+ 倉庫 |
| 別名查詢無快取 | 高 DB 負載 | 帶 TTL 的 Redis 快取 | 1000+ 次解析/天 |
| 單一憑證集 | 速率限制錯誤 | 每使用者憑證 | 10+ 並行使用者 |
| 列表端點無分頁 | 記憶體問題、回應慢 | 基於游標的分頁 | 每個資源 100+ 項目 |

## Security Mistakes

網路安全基礎之外的領域特定安全問題。

| Mistake | Risk | Prevention |
|---------|------|------------|
| 記錄完整 API 回應 | 憑證外洩 | 記錄前清理敏感欄位 |
| 未加密儲存 PAT | 資料外洩導致完整 GitHub 存取 | 使用金鑰管理靜態加密 |
| 無憑證輪換 | 被盜憑證持續有效 | 實作輪換工作流程，過期舊金鑰 |
| 缺少 webhook 簽章驗證 | 攻擊者可觸發構建、修改規則 | 在每個 webhook 驗證 X-Hub-Signature-256 |

## UX Pitfalls

此領域中常見的使用者體驗錯誤。

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 通用的錯誤訊息 | 使用者不知道哪裡出錯 | 特定錯誤：「GitHub PAT 缺少 repo 範圍」vs「權限被拒」 |
| 無構建狀態可見性 | 使用者不知道構建是否成功 | Webhook 通知、狀態端點 |
| 複雜的別名語法 | 使用者犯錯 | 簡單的字母數字，儘早驗證 |
| 缺少 docker login 指南 | 使用者無法拉取映像 | 每個倉庫自動生成指南 |

## "Looks Done But Isn't" Checklist

看起來完成但缺少關鍵部分的功能。

- [x] **Credential Storage:** 常缺少靜態加密 — 透過安全稽核驗證
- [x] **Webhook Handling:** 常缺少簽章驗證 — 透過測試請求驗證
- [x] **Rule Cleanup:** 常缺少對已刪除分支的處理 — 透過邊界案例測試驗證
- [x] **Error Messages:** 常缺少除錯上下文 — 透過常見失敗情境驗證

## Recovery Strategies

儘管預防仍發生問題時的恢復方式。

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Credential leak | HIGH | 輪換所有受影響憑證、稽核存取日誌、通知受影響使用者 |
| Rule count desync | MEDIUM | 調解任務同步 DB 與 ACR 狀態 |
| Webhook auth bypass | HIGH | 加入簽章驗證、稽核 webhook 歷史、輪換密鑰 |
| Stale mappings | LOW | 調解任務、標記無效映射、通知使用者 |

## Pitfall-to-Phase Mapping

路線圖階段應如何解決這些問題。

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Credential leakage | Phase 1 | 安全審查、日誌稽核 |
| Race condition | Phase 3 | 並行測試 |
| Webhook bypass | Phase 2 | 偽造請求的安全測試 |
| Stale mappings | Phase 4 | 調解任務測試 |
| Region mismatch | Phase 1 | 多區域整合測試 |

## Sources

- 阿里雲 ACR API 錯誤處理文件
- GitHub Webhook 安全最佳實踐
- Node.js 安全最佳實踐
- 類似自動化工具的常見模式

---
*Pitfalls research for: Container Registry Automation*
*Researched: 2026-03-19*