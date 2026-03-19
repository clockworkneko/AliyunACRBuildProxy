# Feature Research

**Domain:** Container Registry Automation / ACR Orchestrator
**Researched:** 2026-03-19
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (使用者預期功能)

使用者認為應該存在的功能。缺少這些 = 產品感覺不完整。

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 安全憑證儲存 | 使用者信任系統處理敏感金鑰 | LOW | 加密儲存，絕不記錄 |
| GitHub 倉庫掛載 | 核心價值主張 | MEDIUM | 一鍵 ACR 設定 |
| 別名轉 URL 解析 | 核心價值主張 | LOW | 簡單查詢 API |
| 構建規則管理 | CI/CD 必需 | MEDIUM | 處理 10 條規則限制 |
| Docker login 指南 | 使用者需要拉取映像 | LOW | 每個倉庫自動生成 |

### Differentiators (競爭優勢)

讓產品脫穎而出的功能。非必需，但有價值。

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 簡單規則清理 | 解決 10 條規則痛點 | MEDIUM | 檢查已合併分支，刪除對應規則 |
| 自動文件生成 | 自我文件化系統 | LOW | 生成 docker pull 命令 |

### Anti-Features (常被要求但有問題的功能)

看起來不錯但會造成問題的功能。

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 映像層快取 | 更快的 pull | 頻寬成本，過時層問題 | 讓 ACR 處理 |
| 直接映像代理 | 簡化存取 | 高頻寬成本，延遲，單點故障 | 解析 API + 直接 ACR 存取 |
| GitLab/Bitbucket 支援 | 更多使用者 | API 差異，功能分散 | 專注 GitHub |
| Web UI 規則編輯器 | 使用者控制 | 與自動清理邏輯衝突 | 清晰 API |

## Feature Dependencies

```
GitHub Repo Onboarding
    └──requires──> Credential Storage
    └──requires──> ACR API Integration

Simple Rule Cleanup
    └──requires──> GitHub Branch Status API
    └──requires──> ACR Build Rule API

Alias Resolution
    └──requires──> Database (Mappings table)
```

### Dependency Notes

- **Onboarding 需要 Credential Storage：** 沒有有效憑證無法建立 ACR 倉庫
- **Rule Cleanup 需要 GitHub Branch Status：** 需要知道哪些分支已合併/刪除

## MVP Definition

### Launch With (v1)

最小可行產品 — 驗證概念所需的功能。

- [x] 安全憑證儲存 — 信任的基礎
- [x] GitHub 倉庫掛載 — 核心價值
- [x] 別名轉 URL 解析 — 核心價值
- [x] 基本構建規則管理 — CI/CD 必需
- [x] 自動生成 docker pull 命令 — 文件
- [x] 簡單規則清理 — 刪除已合併分支規則

### Future Consideration (v2+)

產品市場適配確立後再考慮的功能。

- [ ] Webhook 通知 — 構建狀態可見性
- [ ] 多區域支援 — 不同阿里雲區域
- [ ] GitLab/Bitbucket 支援 — 平台擴展

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Credential storage | HIGH | LOW | P1 |
| GitHub onboarding | HIGH | MEDIUM | P1 |
| Alias resolution | HIGH | LOW | P1 |
| Build rule management | HIGH | MEDIUM | P1 |
| Simple cleanup | MEDIUM | MEDIUM | P1 |

**Priority key:**
- P1: 上線必備

## Competitor Feature Analysis

| Feature | Aliyun Console | Our Approach |
|---------|----------------|--------------|
| Repository creation | 手動，慢 | API 驅動，自動化 |
| Build rules | 手動，10 條限制 | 簡單清理邏輯 |
| URL management | 手動查詢 | 別名解析 |
| GitHub integration | 手動 webhook | 自動，無縫 |

## Sources

- 阿里雲 ACR 產品文件
- GitHub Actions 整合模式
- idea 文件中的開發者痛點

---
*Feature research for: Container Registry Automation (Simplified)*
*Researched: 2026-03-19*