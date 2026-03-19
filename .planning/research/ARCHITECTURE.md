# Architecture Research

**Domain:** Container Registry Automation / ACR Orchestrator
**Researched:** 2026-03-19
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │/provision│  │/resolve │  │/rules   │  │/health  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
├───────┴────────────┴────────────┴────────────┴──────────────┤
│                        Service Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Orchestrator     │  │ Resolver         │                 │
│  │ (ACR + GitHub)   │  │ (Alias lookup)   │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                             │
├───────────┴─────────────────────┴────────────────────────────┤
│                        Data Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │PostgreSQL│  │  Redis   │  │BullMQ    │                   │
│  │(Primary) │  │ (Cache)  │  │ (Jobs)   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| API Layer | 路由請求、驗證輸入、認證 | Fastify 路由配合 Zod schemas |
| Orchestrator Service | 管理 ACR 倉庫、GitHub webhooks | 服務類別配合 SDK 客戶端 |
| Resolver Service | 別名查詢、URL 生成 | 簡單查詢服務 |
| Rule Manager | 10 條規則限制處理、清理 | 背景任務處理器 |
| Credential Store | 安全金鑰儲存 | 加密資料庫欄位 |

## Recommended Project Structure

```
src/
├── api/                    # HTTP 路由和處理器
│   ├── routes/            # 路由定義
│   │   ├── provision.ts   # 倉庫掛載
│   │   ├── resolve.ts     # 別名解析
│   │   └── rules.ts       # 構建規則管理
│   ├── middleware/        # 認證、日誌、錯誤處理
│   └── schemas/           # Zod 驗證 schemas
├── services/              # 業務邏輯
│   ├── orchestrator.ts    # ACR + GitHub 編排
│   ├── resolver.ts        # 別名解析邏輯
│   ├── rule-manager.ts    # 構建規則智慧
│   └── credential-vault.ts # 安全憑證處理
├── clients/               # 外部 API 客戶端
│   ├── acr.ts            # 阿里雲 ACR SDK 包裝
│   └── github.ts         # GitHub API 包裝
├── db/                    # 資料庫層
│   ├── schema.ts         # Drizzle schema
│   ├── migrations/       # 遷移檔案
│   └── repositories/     # 資料存取物件
├── jobs/                  # 背景任務
│   └── rule-cleanup.ts   # 定期規則維護
├── config/               # 設定
│   └── index.ts         # 環境基礎設定
└── server.ts            # 應用程式進入點
```

### Structure Rationale

- **api/：** 將 HTTP 關注點與業務邏輯分離
- **services/：** 核心業務邏輯，可脫離 HTTP 測試
- **clients/：** 外部 API 的抽象層，容易 mock
- **db/：** 資料庫層隔離，schema 為事實來源
- **jobs/：** 背景處理，與請求處理分開

## Architectural Patterns

### Pattern 1: Service Layer Pattern

**What:** 業務邏輯隔離在服務類別中，不在路由中
**When to use:** 任何有業務規則的非簡單 API
**Trade-offs:** 更多檔案，但可測試且可維護

**Example:**
```typescript
// services/orchestrator.ts
export class OrchestratorService {
  constructor(
    private acrClient: ACRClient,
    private githubClient: GitHubClient,
    private db: Database
  ) {}

  async provisionRepo(input: ProvisionInput): Promise<ProvisionResult> {
    // 業務邏輯在這裡，不在路由處理器中
  }
}
```

### Pattern 2: Repository Pattern

**What:** 資料存取抽象在介面之後
**When to use:** 多個資料來源、測試需求
**Trade-offs:** 更多抽象，更容易替換實作

**Example:**
```typescript
// db/repositories/repo-mapping.ts
export class RepoMappingRepository {
  constructor(private db: Database) {}
  
  async findByAlias(alias: string): Promise<RepoMapping | null> {
    return this.db.select().from(repoMappings).where(eq(repoMappings.alias, alias));
  }
}
```

### Pattern 3: Background Job Processing

**What:** 長時間執行的任務由佇列工作者處理
**When to use:** GitHub API 輪詢、規則清理、通知
**Trade-offs:** 維運複雜度、最終一致性

## Data Flow

### Request Flow

```
[User Request]
    ↓
[API Route] → [Validation] → [Service] → [Repository] → [Database]
    ↓              ↓              ↓             ↓
[Response] ← [Transform] ← [Query Result] ←───┘
```

### State Management

```
[Database]
    ↓ (cache on read)
[Redis Cache]
    ↓ (invalidate on write)
[API Response]
```

### Key Data Flows

1. **Repo Provisioning:** 使用者提交 GitHub URL → Orchestrator 建立 ACR 倉庫 → 映射別名 → 回傳憑證
2. **Alias Resolution:** 請求到達 → 查詢映射表 → 回傳帶標籤的 ACR URL
3. **Rule Cleanup:** 排程任務 → 取得規則 → 檢查 GitHub 分支狀態 → 刪除已合併分支規則

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k repos | 單體即可，單一實例 |
| 1k-10k repos | 加入讀取副本，快取常用映射 |
| 10k+ repos | 考慮服務拆分（Orchestrator vs Resolver），水平擴展 |

### Scaling Priorities

1. **First bottleneck:** 資料庫連線 — 使用連線池（PgBouncer）
2. **Second bottleneck:** GitHub API 速率限制 — 實作快取、批次請求

## Anti-Patterns

### Anti-Pattern 1: 將憑證儲存在環境變數

**What people do:** 將 AK/SK 存在 .env 檔案中
**Why it's wrong:** 無輪換、無稽核、日誌外洩
**Do this instead:** 加密儲存在資料庫，使用金鑰管理服務

### Anti-Pattern 2: 同步規則清理

**What people do:** 在配置請求期間清理規則
**Why it's wrong:** 回應慢、逾時風險、使用者體驗差
**Do this instead:** 搶先背景清理，達到限制時快速失敗

### Anti-Pattern 3: 在路由中直接使用 ACR SDK

**What people do:** 從路由處理器直接呼叫 ACR SDK
**Why it's wrong:** 緊密耦合、難以測試、無抽象
**Do this instead:** 帶介面的包裝客戶端類別，可 mock

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Aliyun ACR | 帶重試的 SDK 客戶端 | 有速率限制，冪等操作 |
| GitHub API | 帶認證的 Octokit | 速率限制 5000/小時，使用條件請求 |
| PostgreSQL | Drizzle ORM | 需要連線池 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| API ↔ Services | 直接函數呼叫 | 同程序，低延遲 |
| Services ↔ Jobs | BullMQ 佇列 | 非同步，可靠傳遞 |
| Services ↔ Database | Repository pattern | 交易式，可測試 |

## Sources

- Fastify 最佳實踐文件
- 阿里雲 ACR API 參考
- GitHub REST API 文件
- Node.js 生產環境最佳實踐

---
*Architecture research for: Container Registry Automation*
*Researched: 2026-03-19*