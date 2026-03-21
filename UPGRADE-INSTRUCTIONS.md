# ASOR 升級指南 - 個人版 ACR 支持

## 📦 升級內容

本次升級將 ASOR 從「企業版 ACR」改為支持「個人版 ACR」，主要變更：

| 項目 | 企業版 (舊) | 個人版 (新) |
|------|------------|------------|
| **SDK** | `@alicloud/cr20181201` | `@alicloud/cr20160607` |
| **Endpoint** | `cr-xxx.cn-shanghai.aliyuncs.com` | `crpi-xxx.cn-shanghai.personal.cr.aliyuncs.com` |
| **實例 ID** | 需要 | 唔需要 |
| **費用** | 付費 | 免費 |

---

## 🔧 升級步驟

### 步驟 1：更新代碼

```bash
cd /root/.openclaw/workspace/repos/aliyun-acr-proxy

# 拉取最新代碼
git pull origin main

# 安裝依賴（包括個人版 ACR SDK）
npm install
```

### 步驟 2：配置個人版 ACR Endpoint

```bash
cd /root/.openclaw/workspace/repos/aliyun-acr-proxy

# 設置個人版 ACR endpoint（替換為您的 endpoint）
node dist/cli/index.js config set acr-endpoint crpi-xxxxxxxxxxxxxxxxx.cn-shanghai.personal.cr.aliyuncs.com

# 驗證配置
node dist/cli/index.js config list
```

預期輸出：
```
aliyun-secret-key: <YOUR_SECRET_KEY>
aliyun-access-key: <YOUR_ACCESS_KEY>
aliyun-region: cn-shanghai
acr-endpoint: crpi-xxxxxxxxxxxxxxxxx.cn-shanghai.personal.cr.aliyuncs.com
github-token: <YOUR_GITHUB_TOKEN>
```

### 步驟 3：驗證配置

```bash
node dist/cli/index.js config validate
```

預期輸出：
```
- Validating GitHub token...
✔ GitHub token: valid
- Validating Aliyun credentials...
✔ Aliyun credentials: configured (personal ACR)
ℹ Endpoint: crpi-0ppkjjeirdgte2uf.cn-shanghai.personal.cr.aliyuncs.com
```

---

## 📝 修改文件清單

### 核心文件

| 文件 | 變更說明 |
|------|---------|
| `src/clients/acr.ts` | 轉換做個人版 SDK (`@alicloud/cr20160607`) |
| `src/config/store.ts` | 添加 `acr-endpoint` 配置項 |
| `src/cli/commands/config.ts` | 更新驗證邏輯，支持個人版 ACR |
| `src/services/orchestrator.ts` | 使用 `acr-endpoint` 配置 |
| `src/services/resolver.ts` | 支持個人版 ACR URL 解析 |
| `tsconfig.json` | 調整 TypeScript 配置 |

### 依賴變更

```json
{
  "dependencies": {
    "@alicloud/cr20160607": "^2.1.0",  // 新增：個人版 ACR SDK
    "@alicloud/cr20181201": "^2.1.0"   // 移除：企業版 ACR SDK
  }
}
```

---

## 🧪 測試命令

### 測試 CLI 功能

```bash
# 查看幫助
node dist/cli/index.js --help

# 查看配置
node dist/cli/index.js config list

# 查看已註冊的 repo
node dist/cli/index.js list

# 添加新 repo（測試用）
node dist/cli/index.js add qdrant/qdrant:latest --alias qdrant-test

# 解析別名
node dist/cli/index.js resolve qdrant-test
```

### 預期輸出（resolve 命令）

```
Alias: qdrant-test
Tag: latest
ACR URL: crpi-xxxxxxxxxxxxxxxxx.cn-shanghai.personal.cr.aliyuncs.com/<namespace>/<repo>
Full Path: crpi-xxxxxxxxxxxxxxxxx.cn-shanghai.personal.cr.aliyuncs.com/<namespace>/<repo>:latest

Docker Pull Command:
docker pull crpi-xxxxxxxxxxxxxxxxx.cn-shanghai.personal.cr.aliyuncs.com/<namespace>/<repo>:latest
```

---

## ⚠️ 注意事項

### 1. 個人版 ACR 限制

- **命名空間數量**: 最多 10 個
- **倉庫數量**: 每個命名空間最多 100 個
- **構建規則**: 每個倉庫最多 10 條
- **存儲配額**: 500MB（免費）

### 2. Docker Login

使用個人版 ACR 需要先登入：

```bash
docker login crpi-xxx.cn-shanghai.personal.cr.aliyuncs.com \
  -u <YOUR_ACCESS_KEY_ID> \
  -p <YOUR_ACCESS_KEY_SECRET>
```

⚠️ **注意**: 請將 `<YOUR_ACCESS_KEY_ID>` 和 `<YOUR_ACCESS_KEY_SECRET>` 替換為您的真實憑證。

### 3. 配置文件位置

ASOR 配置存儲在：`~/.asor/config.json`

如需備份：
```bash
cp ~/.asor/config.json ~/.asor/config.json.backup
```

---

## 🔄 回滾方案

如需回滾到企業版 ACR：

```bash
# 1. 刪除個人版 endpoint
node dist/cli/index.js config delete acr-endpoint

# 2. 安裝企業版 SDK
npm install @alicloud/cr20181201

# 3. 重新構建
npm run build

# 4. 配置企業版實例 ID（如有）
node dist/cli/index.js config set acr-instance-id cri-xxx
```

---

## 📞 故障排除

### 問題 1: `Unexpected end of JSON input`

**原因**: SDK 同 API 唔匹配

**解決**: 確認使用 `@alicloud/cr20160607`（個人版）

### 問題 2: `MissingInstanceId`

**原因**: 企業版 SDK 需要實例 ID

**解決**: 設置 `acr-endpoint` 或使用個人版 SDK

### 問題 3: `UNAUTHORIZED`

**原因**: Docker Registry 認證失敗

**解決**: 
```bash
docker login crpi-xxxxxxxxxxxxxxxxx.cn-shanghai.personal.cr.aliyuncs.com
```

---

## 📚 相關文檔

- [阿里雲個人版 ACR 文檔](https://help.aliyun.com/zh/acr/user-guide/)
- [ASOR 項目規劃](.planning/PROJECT.md)
- [ASOR 狀態](.planning/STATE.md)

---

*Last updated: 2026-03-21*
*Author: Zeon (ASOR CLI)*
