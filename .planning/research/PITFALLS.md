# Pitfalls Research

**Domain:** Container Registry Automation / ACR Orchestrator
**Researched:** 2026-03-19
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: 憑證在日誌中外洩

**What goes wrong:**
AK/SK 或 GitHub PAT 出現在應用程式日誌中，將敏感憑證暴露給任何有日誌存取權的人。

**Why it happens:**
開發者為了除錯記錄完整的請求/回應物件。

**How to avoid:**
- 絕不在 INFO 層級記錄請求主體
- 實作憑證清理中介軟體
- 在任何除錯輸出中將憑證欄位標記為「已刪減」

**Warning signs:**
- 日誌包含 "AK..." 或 "ghp_" 模式

**Phase to address:**
Phase 1（憑證儲存）

---

### Pitfall 2: GitHub Webhook 認證繞過

**What goes wrong:**
攻擊者發送偽造的 webhook 事件。

**Why it happens:**
Webhook 端點接受任何 POST 請求，而不驗證 GitHub 的簽章。

**How to avoid:**
- 在所有 webhook 端點驗證 X-Hub-Signature-256 標頭
- 使用常數時間比較

**Warning signs:**
- Webhook 處理器沒有簽章驗證

**Phase to address:**
Phase 2（GitHub 整合）

---

### Pitfall 3: ACR 區域不匹配

**What goes wrong:**
使用者為一個區域設定憑證，但嘗試在另一個區域建立倉庫。

**Why it happens:**
阿里雲憑證在某些設定中是區域特定的。

**How to avoid:**
- 儲存並驗證憑證的區域
- 清晰的錯誤訊息
- 預設使用海外區域（cn-hongkong）

**Warning signs:**
- 儘管憑證有效仍出現「無權限」錯誤

**Phase to address:**
Phase 1（憑證儲存）

---

### Pitfall 4: 過時的別名映射

**What goes wrong:**
使用者刪除 GitHub 倉庫，但別名仍指向舊的 ACR 倉庫。

**Why it happens:**
GitHub 狀態與本地映射表之間沒有同步。

**How to avoid:**
- 定期檢查倉庫有效性
- 清晰的錯誤訊息

**Warning signs:**
- 解析成功但構建失敗

**Phase to address:**
Phase 3（別名解析）

---

## Technical Debt Patterns

看似合理但會造成長期問題的捷徑。

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 將憑證儲存在 .env | 快速設定 | 安全風險 | 絕不 |
| 跳過 webhook 簽章驗證 | 更快的 MVP | 安全漏洞 | 絕不 |
| 無別名格式驗證 | 更簡單 | 注入風險 | 絕不 |

## Integration Gotchas

連接外部服務時的常見錯誤。

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Aliyun ACR | 假設 CreateRepo 是冪等的 | 先檢查倉庫是否存在 |
| GitHub API | 未處理速率限制 | 實作退避重試 |

## Security Mistakes

領域特定的安全問題。

| Mistake | Risk | Prevention |
|---------|------|------------|
| 記錄完整 API 回應 | 憑證外洩 | 記錄前清理敏感欄位 |
| 未加密儲存 PAT | 資料外洩 | 加密儲存 |
| 缺少 webhook 簽章驗證 | 偽造請求 | 驗證簽章 |

## "Looks Done But Isn't" Checklist

看起來完成但缺少關鍵部分的功能。

- [x] **Credential Storage:** 驗證有靜態加密
- [x] **Webhook Handling:** 驗證有簽章驗證
- [x] **Error Messages:** 驗證有除錯上下文

## Pitfall-to-Phase Mapping

路線圖階段應如何解決這些問題。

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 憑證外洩 | Phase 1 | 安全審查 |
| Webhook 認證繞過 | Phase 2 | 安全測試 |
| 區域不匹配 | Phase 1 | 整合測試 |
| 過時映射 | Phase 3 | 健康檢查 |

## Sources

- 阿里雲 ACR API 錯誤處理文件
- GitHub Webhook 安全最佳實踐
- Node.js 安全最佳實踐

---
*Pitfalls research for: Container Registry Automation (Simplified)*
*Researched: 2026-03-19*