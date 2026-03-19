# Architecture Research

**Domain:** Container Registry Automation / CLI Tool
**Researched:** 2026-03-19
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Entry                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ commander.js (parse args, route to commands)        │    │
│  └─────────────────────────┬───────────────────────────┘    │
│                            │                                 │
├────────────────────────────┴────────────────────────────────┤
│                        Command Layer                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Config  │  │  Add    │  │ Resolve │  │  Rules  │        │
│  │ Command │  │ Command │  │ Command │  │ Command │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
├───────┴────────────┴────────────┴────────────┴──────────────┤
│                        Service Layer                         │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Orchestrator     │  │ Resolver         │                 │
│  │ (ACR + GitHub)   │  │ (Alias lookup)   │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                             │
├───────────┴─────────────────────┴────────────────────────────┤
│                        Data Layer                            │
│  ┌──────────┐  ┌──────────┐                                 │
│  │ SQLite   │  │  Conf    │                                 │
│  │ (Repo)   │  │ (Cred)   │                                 │
│  └──────────┘  └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| CLI Entry | 解析參數、路由到命令 | Commander.js |
| Command Layer | 執行命令邏輯、處理輸出 | 命令類別 |
| Orchestrator Service | 管理 ACR 倉庫、GitHub 整合 | 服務類別配合 SDK |
| Resolver Service | 別名查詢、URL 生成 | 查詢服務 |
| SQLite | 倉庫映射、規則狀態 | better-sqlite3 |
| Conf | 憑證、使用者設定 | 加密 JSON 檔案 |

## Recommended Project Structure

```
src/
├── cli/                    # CLI 入口和命令
│   ├── index.ts           # CLI 入口點
│   ├── commands/          # 命令實作
│   │   ├── config.ts      # asor config
│   │   ├── add.ts         # asor add
│   │   ├── list.ts        # asor list
│   │   ├── remove.ts      # asor remove
│   │   ├── resolve.ts     # asor resolve
│   │   └── rules.ts       # asor rules
│   └── output.ts          # 終端輸出格式化
├── services/              # 業務邏輯（與 Server 模式共用）
│   ├── orchestrator.ts    # ACR + GitHub 編排
│   ├── resolver.ts        # 別名解析邏輯
│   └── rule-manager.ts    # 構建規則管理
├── clients/               # 外部 API 客戶端（與 Server 模式共用）
│   ├── acr.ts            # 阿里雲 ACR SDK 包裝
│   └── github.ts         # GitHub API 包裝
├── db/                    # 資料庫層
│   ├── schema.ts         # Drizzle schema
│   └── index.ts          # 資料庫連線
├── config/               # 設定管理
│   └── store.ts          # 憑證和使用者設定儲存
└── index.ts              # 模組導出
```

### Structure Rationale

- **cli/：** CLI 特有的入口和命令處理
- **services/：** 核心業務邏輯，與未來 Server 模式共用
- **clients/：** 外部 API 的抽象層，可測試
- **db/：** SQLite 儲存倉庫映射
- **config/：** 憑證和使用者偏好，使用 conf 套件

## Architectural Patterns

### Pattern 1: Command Pattern

**What:** 每個 CLI 命令是獨立的類別或函數
**When to use:** CLI 工具標準模式
**Trade-offs:** 檔案較多，但清晰可維護

**Example:**
```typescript
// cli/commands/add.ts
export async function addCommand(repoUrl: string, options: { alias: string }) {
  const spinner = ora('Creating ACR repository...').start();
  try {
    const orchestrator = new OrchestratorService();
    const result = await orchestrator.provisionRepo({
      githubUrl: repoUrl,
      alias: options.alias
    });
    spinner.succeed(`Repository created: ${result.acrUrl}`);
    console.log(chalk.green(`docker pull ${result.acrUrl}:latest`));
  } catch (error) {
    spinner.fail(error.message);
  }
}
```

### Pattern 2: Shared Service Layer

**What:** CLI 和未來的 Server 共用相同的服務層
**When to use:** 計畫提供多種介面
**Trade-offs:** 需要設計良好的抽象

**Example:**
```typescript
// services/orchestrator.ts
export class OrchestratorService {
  // CLI 和 Server 都使用這個
  async provisionRepo(input: ProvisionInput): Promise<ProvisionResult> {
    // 業務邏輯
  }
}
```

## Data Flow

### Add Repo Flow

```
[User: asor add <url> --alias <name>]
    ↓
[CLI: parse args]
    ↓
[AddCommand] → [Orchestrator.provisionRepo()]
    ↓
[ACR: create repo] → [ACR: add build rules]
    ↓
[SQLite: save mapping]
    ↓
[Output: show docker pull command]
```

### Resolve Flow

```
[User: asor resolve <alias>]
    ↓
[CLI: parse args]
    ↓
[ResolveCommand] → [Resolver.resolve(alias)]
    ↓
[SQLite: query mapping]
    ↓
[Output: show full ACR URL]
```

## Data Storage

### SQLite (倉庫映射)

```sql
CREATE TABLE repos (
  id INTEGER PRIMARY KEY,
  alias TEXT UNIQUE NOT NULL,
  github_url TEXT NOT NULL,
  acr_url TEXT NOT NULL,
  acr_region TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rules (
  id INTEGER PRIMARY KEY,
  repo_id INTEGER REFERENCES repos(id),
  branch_pattern TEXT NOT NULL,
  tag_template TEXT NOT NULL,
  rule_id TEXT NOT NULL, -- ACR rule ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Conf (憑證設定)

```json
{
  "githubToken": "encrypted:...",
  "aliyunAccessKeyId": "encrypted:...",
  "aliyunAccessKeySecret": "encrypted:...",
  "aliyunRegion": "cn-hongkong"
}
```

## CLI User Experience

### 輸出設計

```bash
$ asor add https://github.com/myorg/myapp --alias my-app
⠋ Creating ACR repository...
✓ Repository created: registry.cn-hongkong.aliyuncs.com/myorg/myapp

Docker commands:
  docker pull registry.cn-hongkong.aliyuncs.com/myorg/myapp:latest
  docker login --username=xxx registry.cn-hongkong.aliyuncs.com

$ asor resolve my-app
registry.cn-hongkong.aliyuncs.com/myorg/myapp:latest

$ asor resolve my-app --copy
✓ Copied to clipboard: registry.cn-hongkong.aliyuncs.com/myorg/myapp:latest
```

## Anti-Patterns

### Anti-Pattern 1: 將憑證存在明文 JSON

**What people do:** 直接存 JSON 檔案
**Why it's wrong:** 安全風險
**Do this instead:** 使用加密儲存

### Anti-Pattern 2: 同步 API 呼叫無反饋

**What people do:** 直接呼叫 API，使用者等待
**Why it's wrong:** 無反饋，使用者不知道是否卡住
**Do this instead:** 使用 spinner 或進度條

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Aliyun ACR | SDK 客戶端 | 冪等操作 |
| GitHub API | Octokit | 分支狀態查詢 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI ↔ Services | 直接函數呼叫 | 同程序 |
| Services ↔ Database | Drizzle ORM | 同步 API |

## Sources

- Node.js CLI 最佳實踐
- 阿里雲 ACR API 參考
- Commander.js 文件

---
*Architecture research for: CLI Tool*
*Researched: 2026-03-19*