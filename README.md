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

### 可選材料

| 材料 | 用途 | 說明 |
|------|------|------|
| 自定義命名空間 | 倉庫組織 | 默認使用 `asor`，可自定義 |

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
