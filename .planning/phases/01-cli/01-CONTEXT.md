# Phase 1: CLI 瑞士刀模式 - Context

**Gathered:** 2026-03-19
**Status:** Planned (4 plans created)

<domain>
## Phase Boundary

提供完整的命令列工具，使用者可透過 `asor add` 和 `asor resolve` 管理 ACR 倉庫和查詢映像路徑。

核心模型：
- **Alias = Branch**：每個 alias 對應一個 Git 分支
- **命名轉換**：Docker tag `image:tag` → alias `image-tag`（`:` → `-`）
- **自動產生 Dockerfile**：每個分支根目錄有 `FROM <image>:<tag>` 的 Dockerfile
- **ACR 作為透明代理**：自動構建並產生國內可拉取的映像

</domain>

<decisions>
## Implementation Decisions

### CLI 輸出風格
- **簡潔模式**：預設只輸出結果，`--verbose` 時顯示詳情
- 適合 CI/CD 整合

### 錯誤處理
- **自動重試**：3 次 + 指數退避（1s → 2s → 4s）
- 網路錯誤時自動重試，然後才失敗

### 憑證加密
- **機器相關金鑰**：使用機器識別碼衍生金鑰
- 換機需重新設定憑證

### 初次設定
- **互動式精靈**：首次執行時引導使用者設定憑證、GitHub repo、ACR namespace、區域

### 規則限制處理（ACR 每倉庫 10 條規則限制）
- **自動建立新 repo**：達到限制時自動建立新 ACR repo
- **命名規則**：原 alias 加後綴（如 `my-app-2`、`my-app-3`）
- **DB 追蹤**：所有 ACR repo 都記錄在本地 DB
- **Sync 命令**：`asor sync` 雙向同步本地 DB 與 ACR 實際狀態
  - 刪除前警告，使用者可選擇更新 ACR 而非刪除本地
  - 若更新會違反 10 規則限制，則移至另一個 repo

### 多 Repo 對應
- **Resolve 行為**：同一 alias 對應多個 ACR repo 時，讓使用者選擇
- **警告提示**：提醒使用者清理多餘的 repo

### Alias 模型
- **一對一對應**：Alias = Branch 名稱
- **命名轉換**：`progres:latest` → alias `progres-latest`（分支名）
- **Dockerfile 自動產生**：CLI 根據 alias 自動產生 `FROM <image>:<tag>` 的 Dockerfile
- **使用者可自訂**：可用 `--file` 指定自己的 Dockerfile

### GitHub Repo 管理
- **預設一對一**：一個專案目錄追蹤一個 GitHub repo
- **ACR 限制**：一個 ACR repo 只能對應一個 Git repo
- **可擴充**：使用者可指定其他 GitHub repo

### 資料儲存
- **SQLite DB 位置**：專案目錄下的 `.asor/asor.db`
- **憑證位置**：使用 `conf` 套件，存在 `~/.asor/`（跨專案共用）

### 錯誤輸出
- **stderr**：錯誤訊息輸出到 stderr
- **退出碼**：非零退出碼表示失敗
- **日誌**：若 config 指定，同時寫入 error log

### ACR Namespace
- **自動使用預設**：從 config 讀取預設 namespace
- **首次設定時指定**：互動式精靈中設定

### 預設區域
- **使用者設定**：首次設定時讓使用者選擇區域
- **推薦 cn-hongkong**：海外構建節點，可順暢存取 GitHub/Docker Hub

### Claude's Discretion
- 確定使用 TypeScript + Node.js 20 LTS
- 確定使用 Commander.js + chalk + ora + clipboardy
- 確定使用 SQLite + Drizzle ORM
- 確定使用 better-sqlite3（同步 API）
- 確定使用 @alicloud/acr20221201 SDK
- 確定使用 @octokit/rest GitHub API

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stack & Architecture
- `.planning/research/STACK.md` — 技術棧選擇、CLI 結構、安裝指令
- `.planning/research/ARCHITECTURE.md` — 系統架構、專案結構、資料流、資料庫 schema

### Requirements
- `.planning/REQUIREMENTS.md` — CRED-01~05, CLIR-01~06, CLIQ-01~04, CLRU-01~04

### Project Context
- `.planning/PROJECT.md` — 核心價值、約束、背景

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
None — this is a fresh project.

### Established Patterns
None — new codebase. Use patterns from:
- Commander.js for CLI structure
- Drizzle ORM for database
- Conf for credential storage

### Integration Points
- Aliyun ACR SDK (`@alicloud/acr20221201`)
- GitHub API (`@octokit/rest`)
- Git operations (local branch creation)

</code_context>

<specifics>
## Specific Ideas

### asor add 流程
```
$ asor add nginx:latest
? Which GitHub repo? (interactive if not configured)
✓ Created branch: nginx-latest
✓ Generated Dockerfile: FROM nginx:latest
✓ Created ACR build rule
✓ Repository: registry.cn-hongkong.aliyuncs.com/myorg/nginx

Docker commands:
  docker pull registry.cn-hongkong.aliyuncs.com/myorg/nginx:latest
```

### asor resolve 流程
```
$ asor resolve nginx-latest
registry.cn-hongkong.aliyuncs.com/myorg/nginx:latest

$ asor resolve nginx-latest --copy
✓ Copied to clipboard
```

### asor sync 流程
```
$ asor sync
Checking ACR repos...

⚠️  Local repo 'old-app' not found in ACR
  - [D]elete local entry
  - [U]pdate ACR (create repo)
  - [S]kip

⚠️  ACR repo 'new-app' not tracked locally
  - [I]mport to local DB
  - [S]kip

✓ Sync complete: 2 repos updated
```

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-cli*
*Context gathered: 2026-03-19*