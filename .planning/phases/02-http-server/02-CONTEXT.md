# Phase 2: HTTP Server 模式 - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

提供 REST API 和 GitHub webhook 整合，支援 CI/CD 自動化。使用者可以透過 HTTP 端點管理 ACR 倉庫，並透過 webhook 接收 GitHub 事件觸發自動構建。

核心功能：
- REST API 端點：`/provision`、`/resolve`、`/rules`
- GitHub webhook 整合與簽章驗證
- Daemon 模式運行

</domain>

<decisions>
## Implementation Decisions

### API Response Format

- **Envelope wrapper**: 所有回應包裝在 `{data: {...}, success: true/false}` 結構中
- **Structured errors**: 錯誤回應格式 `{success: false, error: {code: "ALIAS_NOT_FOUND", message: "..."}}`
- **Semantic HTTP codes**: 200 OK 成功、400 Bad Request 客戶端錯誤、500 Server Error 伺服器錯誤
- **URL versioning**: 所有端點使用 `/v1/` 前綴，如 `/v1/provision`、`/v1/resolve`

### Authentication

- **API Key**: 使用 `X-API-Key` header 認證
- **Config file storage**: API Key 儲存於 `~/.asor/` 與其他憑證一起
- **All endpoints authenticated**: 所有 API 端點都需要 API Key
- **User-defined key**: 使用者自行設定 `asor config set api-key <key>`

### Server Configuration

- **Daemon only**: 僅背景執行模式
- **Lifecycle commands**: `asor server --start/--stop/--status/--restart`
- **Config file for port/host**: 在 config 檔案中設定 `server.port` 和 `server.host`
- **JSON logging**: stdout 輸出結構化 JSON 日誌，適合 log aggregator 收集

### Webhook Handling

- **Trigger behavior**: GitHub webhook 觸發 cleanup 清理已合併分支規則
- **Events handled**: `push` 和 `delete` 事件
- **HMAC signature verification**: 使用 `X-Hub-Signature-256` 驗證 GitHub 請求
- **Webhook secret storage**: 透過 `asor config set webhook-secret <secret>` 設定

### Claude's Discretion

- HTTP framework choice (Fastify 已在 ROADMAP 中提及)
- 具體錯誤碼命名規則
- Daemon PID 檔案位置
- 日誌格式細節

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SERV-01~05 HTTP Server 需求

### Architecture & Stack
- `.planning/research/ARCHITECTURE.md` — 系統架構、專案結構
- `.planning/research/STACK.md` — 技術棧選擇

### Project Context
- `.planning/PROJECT.md` — 核心價值、約束、背景

### Prior Phase Context
- `.planning/phases/01-cli/01-CONTEXT.md` — CLI 模式決策、共用服務層設計

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/orchestrator.ts`: `provisionRepo()`, `listRepos()`, `removeRepo()` — Server 端點可直接呼叫
- `src/services/resolver.ts`: `resolve()`, `formatDockerPull()` — /resolve 端點核心邏輯
- `src/services/rule-manager.ts`: `listRules()`, `addRule()`, `removeRule()`, `cleanupRules()` — /rules 端點核心邏輯
- `src/config/store.ts`: `configStore.get/set` — 憑證和設定讀取

### Established Patterns
- **Error handling**: `withRetry()` 函數 — 3 次重試 + 指數退避
- **Config storage**: 使用 `conf` 套件，路徑 `~/.asor/`
- **CLI output**: `src/cli/output.ts` — 簡潔輸出模式

### Integration Points
- `src/clients/acr.ts`: ACR SDK wrapper
- `src/clients/github.ts`: GitHub API wrapper
- `src/db/index.ts`: SQLite database operations

</code_context>

<specifics>
## Specific Ideas

### API 端點設計
```
POST /v1/provision
Body: {imageName: "nginx", imageTag: "latest", alias?: "nginx-latest"}
Response: {success: true, data: {alias, acrUrl, dockerPullCommand}}

GET /v1/resolve?alias=nginx-latest
Response: {success: true, data: {alias, tag, acrUrl, fullImagePath}}

GET /v1/rules/:alias
Response: {success: true, data: {rules: [{id, branchPattern, tagTemplate, status}]}}

POST /v1/webhook/github
Headers: X-Hub-Signature-256, X-GitHub-Event
Body: GitHub webhook payload
Response: {success: true, data: {action: "cleanup", removedCount: 2}}
```

### Server 命令
```
$ asor server --start
✓ Server started on port 3000 (PID: 12345)

$ asor server --status
Server running (PID: 12345, uptime: 2h 30m)

$ asor server --stop
✓ Server stopped
```

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-http-server*
*Context gathered: 2026-03-19*