# ASOR - 阿里雲容器倉庫智能編排解決方案

[![測試](https://img.shields.io/badge/測試-85%2F85%20通過-brightgreen)]()
[![版本](https://img.shields.io/badge/版本-1.0.0-blue)]()
[![授權](https://img.shields.io/badge/授權-MIT-green)]()

> 🚀 **瑞士刀模式** — 無需 Docker、無需 Kubernetes，單一執行檔搞定所有容器倉庫管理

ASOR（ACR Smart Orchestrator & Resolver）是一款專為 GFW 內開發者設計的容器倉庫管理工具。它將 GitHub 倉庫自動同步至阿里雲 ACR，讓你在國內也能高速拉取容器映像，無需科學上網。

## ✨ 瑞士刀模式（Swiss Knife Mode）

**核心賣點：單一工具，完整功能**

與傳統方案不同，ASOR 不需要：
- ❌ Docker 環境
- ❌ Kubernetes 集群
- ❌ 複雜的 CI/CD 流水線
- ❌ 多個工具協作
- ❌ 背景服務器或守護進程

**只需要一個 Node.js 執行檔**，即可：
- ✅ 管理阿里雲 ACR 倉庫
- ✅ 自動同步 GitHub 倉庫
- ✅ 創建友好的別名系統
- ✅ 管理構建規則和清理

## 🛒 所需材料（Ingredients）

開始使用前，請準備以下材料：

### 必需材料

| 材料 | 用途 | 獲取方式 |
|------|------|----------|
| **GitHub Personal Access Token** | 訪問 GitHub API，創建倉庫 | [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) |
| **阿里雲 AccessKey ID** | 訪問阿里雲 ACR API | [阿里雲控制台 → AccessKey 管理](https://ram.console.aliyun.com/manage/ak) |
| **阿里雲 AccessKey Secret** | 配合 AccessKey ID 使用 | 同上，創建時同時獲得 |
| **阿里雲賬號** | 使用 ACR 服務 | [阿里雲官網](https://www.aliyun.com/) 註冊 |

### 🔐 最小權限配置指南

#### 1. GitHub Personal Access Token

**步驟：**
1. 訪問 https://github.com/settings/tokens
2. 點撃 "Generate new token (classic)"
3. **Token 名稱**: `ASOR-ACR-Access`
4. **過期時間**: 建議選擇 90 天或更短，定期更換
5. **最小權限範圍**（只勾選以下權限）：
   - ✅ `repo` - 完整倉庫訪問（用於讀取倉庫信息）
   - ✅ `read:org` - 訪問組織信息（如需要）

**⚠️ 安全提示：**
- 不要勾選 `delete_repo` 或 `admin:org` 等高風險權限
- Token 創建後**立即複製**，之後無法再次查看
- 建議使用 GitHub 的 Token 過期功能，定期更換

#### 2. 阿里雲 AccessKey

**步驟：**
1. 登錄 [阿里雲控制台](https://www.aliyun.com/)
2. 點撃右上角頭像 → AccessKey 管理
3. 選擇 "創建 AccessKey"
4. **安全驗證**：需要手機驗證碼或郵箱驗證
5. **立即保存**：AccessKey ID 和 Secret 只顯示一次

**最小權限配置：**

創建 AccessKey 後，需要為其配置最小權限：

1. 訪問 [RAM 控制台](https://ram.console.aliyun.com/users)
2. 找到你的用戶 → 點撃 "添加權限"
3. 選擇 "系統策略"
4. **只添加以下策略**（搜索並勾選）：
   - `AliyunContainerRegistryFullAccess` - 容器倉庫服務完整權限

**⚠️ 安全提示：**
- 不要給予 `AdministratorAccess` 或 `AliyunRAMFullAccess`
- 不要在代碼中硬編碼 AccessKey
- 建議為不同項目創建不同的 AccessKey
- 定期輪換 AccessKey（阿里雲建議 90 天）

#### 3. ACR 命名空間創建

**步驟：**
1. 訪問 [ACR 控制台](https://cr.console.aliyun.com/)
2. 選擇地區（如：華北 2 北京）
3. 點撃 "創建命名空間"
4. **命名空間名稱**: `asor`（或自定義）
5. **是否公開**: 建議選擇 "私有"（更安全）

### 可選材料

| 材料 | 用途 | 說明 |
|------|------|------|
| 自定義命名空間 | 倉庫組織 | 默認使用 `asor`，可自定義 |
| **clipboardy** | 自動複製到剪貼板 | 可選，`npm install clipboardy` 安裝後 `asor resolve` 會自動複製結果 |

### 環境要求

- **Node.js**: >= 20.0.0
- **操作系統**: Windows / macOS / Linux
- **網絡**: 能訪問阿里雲（國內網絡即可）

## 🚀 快速開始

### 第一步：安裝

```bash
# 克隆倉庫
git clone https://github.com/clockworkneko/AliyunACRBuildProxy.git
cd AliyunACRBuildProxy

# 安裝依賴
npm install

# 構建項目
npm run build

# 鏈接到全局（可選）
npm link
```

### 第二步：配置材料

```bash
# 配置 GitHub Token
asor config set github-token <你的-GitHub-PAT>

# 配置阿里雲憑證
asor config set aliyun-access-key <你的-AccessKey-ID>
asor config set aliyun-secret-key <你的-AccessKey-Secret>
asor config set aliyun-region <區域>  # 例如：cn-beijing
```

### 第三步：添加倉庫

```bash
# 添加 GitHub 倉庫並創建別名
asor add https://github.com/用戶名/倉庫名 --alias 我的應用

# 查看所有倉庫
asor list
```

### 第四步：使用別名

```bash
# 獲取 docker pull 命令
asor resolve 我的應用

# 輸出：docker pull registry.cn-beijing.aliyuncs.com/asor/我的應用:latest
```

## 📖 功能詳情

### CLI 瑞士刀模式

#### 配置管理
```bash
asor config set <鍵> <值>    # 設置配置
asor config get <鍵>         # 獲取配置
asor config delete <鍵>      # 刪除配置
asor config list             # 列出所有配置
```

#### 倉庫管理
```bash
asor add <GitHub-URL> --alias <別名> [--namespace <命名空間>] [--region <區域>]
asor list                    # 列出所有倉庫
asor remove <別名> [--force] [--keep-acr]  # 刪除倉庫
```

#### 別名解析
```bash
asor resolve <別名> [--tag <標籤>]  # 解析別名為 docker pull 命令
```

#### 規則管理
```bash
asor rules <別名> list       # 列出構建規則
asor rules <別名> add <分支模式> <標籤模板>  # 添加規則
asor rules <別名> remove <規則-ID>  # 刪除規則
asor rules <別名> cleanup [--dry-run] [--force]  # 清理已合併分支
```

## 🔧 配置說明

配置存儲在 `~/.asor/config.json`，使用 AES-256-CBC 加密。

### 配置項

| 配置鍵 | 說明 | 必需 |
|--------|------|------|
| `github-token` | GitHub Personal Access Token | ✅ |
| `aliyun-access-key` | 阿里雲 Access Key ID | ✅ |
| `aliyun-secret-key` | 阿里雲 Access Key Secret | ✅ |
| `aliyun-region` | 阿里雲區域（如 cn-beijing） | ✅ |
| `default-namespace` | 默認命名空間 | ❌ |

## 🏗️ 系統架構

```
┌─────────────────┐
│   CLI 命令      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   核心服務      │
│  ┌───────────┐  │
│  │ 編排器    │  │
│  │ (創建倉庫)│  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ 解析器    │  │
│  │ (別名解析)│  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ 規則管理器│  │
│  │ (構建規則)│  │
│  └───────────┘  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   數據層        │
│  SQLite        │
└─────────────────┘
```

## 🧪 測試

```bash
# 運行所有測試
npm test

# 測試結果
# ✓ 12 個測試文件通過
# ✓ 85 個測試通過
# ✓ 0 個測試失敗
```

## 📁 項目結構

```
.
├── src/
│   ├── cli/              # CLI 命令
│   │   ├── commands/     # 命令實現
│   │   └── output.ts     # 輸出格式化
│   ├── clients/          # API 客戶端
│   │   ├── acr.ts        # 阿里雲 ACR
│   │   └── github.ts     # GitHub
│   ├── services/         # 核心業務邏輯
│   │   ├── orchestrator.ts
│   │   ├── resolver.ts
│   │   └── rule-manager.ts
│   ├── config/           # 配置管理
│   └── db/               # 數據庫層
├── tests/                # 測試文件
├── README.md             # 本文檔（繁體中文）
├── README-sc.md          # 簡體中文文檔
├── README-en.md          # 英文文檔
└── package.json
```

## 📝 更新日誌

### v1.0.0 (2026-03-19)
- ✅ CLI 瑞士刀模式
  - 加密憑證管理
  - 倉庫編排與管理
  - 別名解析
  - 規則管理與清理

## 📄 授權

MIT

## 🤝 貢獻

歡迎貢獻！請閱讀 `.planning/` 目錄下的規劃文檔了解架構設計。

---

**用 ❤️ 為 GFW 後的開發者製作**

**瑞士刀模式** — 簡單、快速、無依賴
