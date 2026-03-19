# Phase 2: HTTP Server Mode - Research

**Researched:** 2026-03-19
**Domain:** Fastify HTTP Server, Webhook Security, Daemon Process Management
**Confidence:** HIGH

## Summary

This phase transforms the existing CLI tool into a background HTTP server with REST API and GitHub webhook integration. The core business logic (services layer) from Phase 1 is already reusable—this phase adds the HTTP layer, authentication, webhook handling, and daemon management.

**Primary recommendation:** Use Fastify 5.x with plugin architecture for clean separation of concerns. Implement API key authentication via preHandler hooks and GitHub webhook verification using Node.js crypto.timingSafeEqual for timing-attack-resistant HMAC validation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Envelope wrapper**: 所有回應包裝在 `{data: {...}, success: true/false}` 結構中
- **Structured errors**: 錯誤回應格式 `{success: false, error: {code: "ALIAS_NOT_FOUND", message: "..."}}`
- **Semantic HTTP codes**: 200 OK 成功、400 Bad Request 客戶端錯誤、500 Server Error 伺服器錯誤
- **URL versioning**: 所有端點使用 `/v1/` 前綴，如 `/v1/provision`、`/v1/resolve`
- **API Key**: 使用 `X-API-Key` header 認證
- **Config file storage**: API Key 儲存於 `~/.asor/` 與其他憑證一起
- **All endpoints authenticated**: 所有 API 端點都需要 API Key
- **User-defined key**: 使用者自行設定 `asor config set api-key <key>`
- **Daemon only**: 僅背景執行模式
- **Lifecycle commands**: `asor server --start/--stop/--status/--restart`
- **Config file for port/host**: 在 config 檔案中設定 `server.port` 和 `server.host`
- **JSON logging**: stdout 輸出結構化 JSON 日誌，適合 log aggregator 收集
- **Trigger behavior**: GitHub webhook 觸發 cleanup 清理已合併分支規則
- **Events handled**: `push` 和 `delete` 事件
- **HMAC signature verification**: 使用 `X-Hub-Signature-256` 驗證 GitHub 請求
- **Webhook secret storage**: 透過 `asor config set webhook-secret <secret>` 設定

### Claude's Discretion
- HTTP framework choice (Fastify 已在 ROADMAP 中提及)
- 具體錯誤碼命名規則
- Daemon PID 檔案位置
- 日誌格式細節

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SERV-01 | 啟動 HTTP 伺服器提供 REST API | Fastify server setup, plugin architecture, graceful shutdown |
| SERV-02 | 提供 `/provision` 端點掛載倉庫 | Route handler calling existing `provisionRepo()` service |
| SERV-03 | 提供 `/resolve` 端點查詢別名 | Route handler calling existing `resolve()` service |
| SERV-04 | 提供 `/rules` 端點管理規則 | Route handler calling existing `listRules()`, `addRule()`, `removeRule()` services |
| SERV-05 | GitHub webhook 端點接收事件 | HMAC verification, payload validation, event routing |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.8.2 | HTTP framework | High performance, native JSON schema validation, excellent TypeScript support |
| @fastify/sensible | 6.0.4 | Error utilities | Standard HTTP errors, useful reply helpers |
| pino | 10.3.1 | JSON logging | Fastify default logger, structured JSON output, high performance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fastify/autoload | 6.3.1 | Plugin auto-loading | Auto-load routes/plugins from directories |
| @fastify/cors | 11.2.0 | CORS handling | If API accessed from browsers |
| pino-pretty | 13.1.3 | Dev logging | Development only (not in daemon mode) |

### Existing Dependencies (Reuse)
| Library | Purpose |
|---------|---------|
| zod | Request/response validation (already in project) |
| conf | Config storage (already in project) |

**Installation:**
```bash
npm install fastify @fastify/sensible @fastify/autoload @fastify/cors pino
npm install -D @types/node pino-pretty
```

**Version verification completed:**
- fastify: 5.8.2 (verified 2026-03-19)
- @fastify/sensible: 6.0.4 (verified 2026-03-19)
- @fastify/autoload: 6.3.1 (verified 2026-03-19)

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/                    # CLI 入口和命令 (現有)
│   ├── index.ts           # CLI 入口點
│   ├── commands/
│   │   ├── config.ts      # asor config
│   │   ├── add.ts         # asor add
│   │   ├── ...
│   │   └── server.ts      # NEW: asor server --start/--stop/--status
│   └── output.ts          # 終端輸出格式化
├── server/                 # NEW: HTTP Server 模式
│   ├── index.ts           # Server entry point
│   ├── app.ts             # Fastify app factory
│   ├── routes/            # Route definitions
│   │   ├── v1/
│   │   │   ├── provision.ts
│   │   │   ├── resolve.ts
│   │   │   ├── rules.ts
│   │   │   └── webhook.ts
│   │   └── health.ts      # Health check (unauthenticated)
│   ├── middleware/         # Hooks and middleware
│   │   ├── auth.ts        # API key validation
│   │   └── envelope.ts    # Response wrapper
│   ├── errors/            # Error definitions
│   │   └── codes.ts       # Error code constants
│   └── daemon/            # Daemon management
│       ├── manager.ts     # Start/stop/status logic
│       └── pid.ts         # PID file handling
├── services/              # 業務邏輯（現有，與 Server 共用）
├── clients/               # 外部 API 客戶端（現有）
├── db/                    # 資料庫層（現有）
├── config/               # 設定管理（現有）
└── index.ts              # 模組導出
```

### Pattern 1: Fastify App Factory

**What:** Factory function that creates and configures Fastify instance
**When to use:** Standard pattern for testable Fastify apps
**Example:**
```typescript
// src/server/app.ts
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import autoload from '@fastify/autoload';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AppOptions {
  logger?: boolean;
}

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? {
      level: 'info',
      transport: process.env.NODE_ENV === 'development' 
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  // Register plugins
  await app.register(sensible);
  
  // Auto-load routes
  await app.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    options: { prefix: '/v1' },
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Error occurred');
    
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }
    
    const statusCode = error.statusCode ?? 500;
    return reply.code(statusCode).send({
      success: false,
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: statusCode >= 500 ? 'Internal server error' : error.message,
      },
    });
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });

  return app;
}
```

### Pattern 2: Response Envelope Wrapper

**What:** Consistent response format for all API endpoints
**When to use:** All successful responses
**Example:**
```typescript
// src/server/middleware/envelope.ts
import type { FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyReply {
    success: (data: unknown) => FastifyReply;
  }
}

export async function envelopePlugin(app: FastifyInstance) {
  app.decorateReply('success', function(this: FastifyReply, data: unknown) {
    return this.send({ success: true, data });
  });
}

// Usage in route:
fastify.get('/v1/resolve', async (request, reply) => {
  const result = await resolve(request.query.alias);
  return reply.success(result);
});
```

### Pattern 3: API Key Authentication via preHandler Hook

**What:** Hook that validates X-API-Key header before route handler
**When to use:** All authenticated routes
**Example:**
```typescript
// src/server/middleware/auth.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { configStore } from '../../config/store.js';

export async function authPlugin(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check
    if (request.url === '/health') {
      return;
    }
    
    const apiKey = request.headers['x-api-key'];
    const storedKey = configStore.get('api-key');
    
    if (!storedKey) {
      throw app.httpErrors.unauthorized('API key not configured. Run: asor config set api-key <key>');
    }
    
    if (!apiKey || typeof apiKey !== 'string') {
      throw app.httpErrors.unauthorized('Missing X-API-Key header');
    }
    
    // Use timing-safe comparison
    if (!timingSafeEqual(apiKey, storedKey)) {
      throw app.httpErrors.unauthorized('Invalid API key');
    }
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still perform comparison to maintain constant time
    const dummy = Buffer.from(a);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

### Pattern 4: Graceful Shutdown with onClose Hook

**What:** Clean server shutdown on SIGTERM/SIGINT signals
**When to use:** All production servers
**Example:**
```typescript
// src/server/index.ts
import { buildApp } from './app.js';

export async function startServer(port: number, host: string) {
  const app = await buildApp({ logger: true });
  
  // Cleanup hook
  app.addHook('onClose', async () => {
    // Close database connections
    // Flush logs
    app.log.info('Server shutdown complete');
  });
  
  // Handle signals
  const signals = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info({ signal }, 'Received shutdown signal');
      await app.close();
      process.exit(0);
    });
  }
  
  await app.listen({ port, host });
  return app;
}
```

### Pattern 5: GitHub Webhook HMAC Verification

**What:** Verify GitHub webhook signatures using HMAC-SHA256
**When to use:** Webhook endpoint only
**Example:**
```typescript
// src/server/routes/v1/webhook.ts
import crypto from 'crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { configStore } from '../../../config/store.js';
import { cleanupRules } from '../../../services/rule-manager.js';

interface GitHubWebhookPayload {
  ref?: string;
  deleted?: boolean;
  repository?: { full_name: string };
}

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/webhook/github', {
    config: { rawBody: true }, // Keep raw body for signature verification
  }, async (request: FastifyRequest<{ Body: GitHubWebhookPayload }>, reply) => {
    const signature = request.headers['x-hub-signature-256'];
    const event = request.headers['x-github-event'];
    const secret = configStore.get('webhook-secret');
    
    if (!secret) {
      throw app.httpErrors.internalServerError('Webhook secret not configured');
    }
    
    if (!signature || typeof signature !== 'string') {
      throw app.httpErrors.unauthorized('Missing X-Hub-Signature-256 header');
    }
    
    // Verify HMAC signature
    const rawBody = JSON.stringify(request.body);
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    
    if (!timingSafeEqual(signature, expectedSignature)) {
      throw app.httpErrors.unauthorized('Invalid webhook signature');
    }
    
    // Handle events
    if (event === 'push' || event === 'delete') {
      // Trigger cleanup for merged/deleted branches
      // Implementation depends on which repos have webhooks configured
      app.log.info({ event, ref: request.body.ref }, 'Webhook received');
    }
    
    return reply.success({ event, processed: true });
  });
}
```

### Anti-Patterns to Avoid

- **Using string comparison for API keys**: Vulnerable to timing attacks; always use `crypto.timingSafeEqual`
- **Storing API key in code**: Must use config file (`~/.asor/`)
- **Skipping webhook signature verification**: Security risk; always verify HMAC
- **Synchronous operations in daemon mode**: Node.js event loop must remain responsive
- **Hardcoding port/host**: Must be configurable via `~/.asor/config.json`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP server | Raw http module | Fastify | Performance, validation, ecosystem |
| Request validation | Custom validation | Fastify schema + zod | Type safety, automatic error responses |
| Error handling | Custom error objects | @fastify/sensible | Standard HTTP errors, less code |
| Logging | console.log | Pino (Fastify built-in) | Structured JSON, performance |
| API key comparison | `===` operator | `crypto.timingSafeEqual` | Timing attack prevention |

**Key insight:** Fastify's schema validation and error handling are battle-tested. Custom implementations introduce bugs.

## Common Pitfalls

### Pitfall 1: Timing Attacks on API Key Validation
**What goes wrong:** Using `===` for API key comparison leaks timing information
**Why it happens:** String comparison short-circuits on first character mismatch
**How to avoid:** Always use `crypto.timingSafeEqual` with equal-length buffers
**Warning signs:** API key validation that looks like `if (key === storedKey)`

### Pitfall 2: Webhook Signature Verification with Wrong Body
**What goes wrong:** Verifying parsed JSON instead of raw body
**Why it happens:** Fastify parses JSON by default, changing whitespace/formatting
**How to avoid:** Use `config: { rawBody: true }` or re-stringify with same whitespace
**Warning signs:** Signature verification fails for valid GitHub webhooks

### Pitfall 3: Daemon Doesn't Handle Signals on Windows
**What goes wrong:** SIGTERM/SIGINT don't work the same on Windows
**Why it happens:** Windows doesn't support POSIX signals
**How to avoid:** Use process events and possibly `ctrl-c` handling for Windows
**Warning signs:** Daemon doesn't shut down cleanly on Windows

### Pitfall 4: PID File Stale on Unclean Shutdown
**What goes wrong:** Old PID file prevents new daemon from starting
**Why it happens:** Process killed without cleanup
**How to avoid:** Check if PID in file is actually running before rejecting start
**Warning signs:** `asor server --start` fails with "already running" when it's not

### Pitfall 5: Logging to File in Daemon Mode
**What goes wrong:** Logs fill disk or can't be rotated
**Why it happens:** User constraint says JSON logging to stdout
**How to avoid:** Only log to stdout; let process manager (systemd, pm2) handle log rotation
**Warning signs:** Custom file logging implementation

## Code Examples

### Route Plugin with Schema Validation

```typescript
// src/server/routes/v1/provision.ts
import type { FastifyInstance } from 'fastify';
import { provisionRepo } from '../../../services/orchestrator.js';
import { z } from 'zod';

const ProvisionSchema = z.object({
  imageName: z.string().min(1),
  imageTag: z.string().min(1),
  alias: z.string().optional(),
  namespace: z.string().optional(),
  region: z.string().optional(),
});

export async function provisionRoutes(app: FastifyInstance) {
  app.post('/provision', {
    schema: {
      body: {
        type: 'object',
        required: ['imageName', 'imageTag'],
        properties: {
          imageName: { type: 'string' },
          imageTag: { type: 'string' },
          alias: { type: 'string' },
          namespace: { type: 'string' },
          region: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = ProvisionSchema.parse(request.body);
    const result = await provisionRepo(body);
    return reply.success({
      alias: result.alias,
      acrUrl: result.acrUrl,
      dockerPullCommand: result.dockerPullCommand,
    });
  });
}
```

### Daemon Manager

```typescript
// src/server/daemon/manager.ts
import { spawn, ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { configStore } from '../../config/store.js';

const PID_FILE = join(tmpdir(), 'asor-server.pid');
const LOG_FILE = join(tmpdir(), 'asor-server.log');

export interface ServerStatus {
  running: boolean;
  pid?: number;
  uptime?: string;
  port?: number;
  host?: string;
}

export class DaemonManager {
  private getPort(): number {
    return configStore.get('server-port') ?? 3000;
  }
  
  private getHost(): string {
    return configStore.get('server-host') ?? '0.0.0.0';
  }
  
  async start(): Promise<{ pid: number; port: number }> {
    const status = this.status();
    if (status.running) {
      throw new Error(`Server already running (PID: ${status.pid})`);
    }
    
    const port = this.getPort();
    const host = this.getHost();
    
    // Spawn detached process
    const child = spawn(process.execPath, [
      '--import', 'tsx',
      import.meta.resolve('../index.ts'),
      '--port', String(port),
      '--host', host,
    ], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
      windowsHide: true,
    });
    
    child.unref();
    
    // Write PID file
    writeFileSync(PID_FILE, String(child.pid));
    
    return { pid: child.pid!, port };
  }
  
  async stop(): Promise<void> {
    const status = this.status();
    if (!status.running) {
      throw new Error('Server is not running');
    }
    
    process.kill(status.pid!, 'SIGTERM');
    
    // Clean up PID file
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
  }
  
  status(): ServerStatus {
    if (!existsSync(PID_FILE)) {
      return { running: false };
    }
    
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8'), 10);
    
    // Check if process is actually running
    try {
      process.kill(pid, 0); // Signal 0 = check if process exists
      return {
        running: true,
        pid,
        port: this.getPort(),
        host: this.getHost(),
      };
    } catch {
      // Process doesn't exist, clean up stale PID file
      unlinkSync(PID_FILE);
      return { running: false };
    }
  }
}
```

### CLI Server Command

```typescript
// src/cli/commands/server.ts
import { Command } from 'commander';
import { DaemonManager } from '../../server/daemon/manager.js';
import { output } from '../output.js';

export function registerServerCommand(program: Command) {
  const server = program.command('server')
    .description('Manage HTTP server daemon');
  
  server.command('start')
    .description('Start the HTTP server daemon')
    .action(async () => {
      const manager = new DaemonManager();
      const { pid, port } = await manager.start();
      output.success(`Server started on port ${port} (PID: ${pid})`);
    });
  
  server.command('stop')
    .description('Stop the HTTP server daemon')
    .action(async () => {
      const manager = new DaemonManager();
      await manager.stop();
      output.success('Server stopped');
    });
  
  server.command('status')
    .description('Check server status')
    .action(async () => {
      const manager = new DaemonManager();
      const status = manager.status();
      
      if (status.running) {
        output.info(`Server running (PID: ${status.pid}, port: ${status.port})`);
      } else {
        output.info('Server is not running');
      }
    });
  
  server.command('restart')
    .description('Restart the HTTP server daemon')
    .action(async () => {
      const manager = new DaemonManager();
      const status = manager.status();
      
      if (status.running) {
        await manager.stop();
      }
      
      const { pid, port } = await manager.start();
      output.success(`Server restarted on port ${port} (PID: ${pid})`);
    });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express middleware | Fastify hooks | Fastify 3.x+ | Better performance, type safety |
| body-parser | Built-in | Fastify 3.x | Faster JSON parsing |
| Custom error classes | @fastify/sensible | Fastify 4.x+ | Standard HTTP errors |
| Callback hooks | Async/await hooks | Fastify 4.x+ | Cleaner code |

**Deprecated/outdated:**
- `fastify-autoload` → `@fastify/autoload` (scoped package)
- `fastify-sensible` → `@fastify/sensible` (scoped package)
- Express-style middleware (use hooks instead)

## Open Questions

1. **Cross-platform daemon behavior on Windows**
   - What we know: POSIX signals (SIGTERM, SIGINT) don't work the same on Windows
   - What's unclear: Best approach for graceful shutdown on Windows
   - Recommendation: Use `process.on('beforeExit')` as fallback, test thoroughly on Windows

2. **Multiple server instances**
   - What we know: PID file approach assumes single instance
   - What's unclear: Should we support multiple instances on different ports?
   - Recommendation: For v1, single instance is sufficient per the scale constraints (<1000 repos)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (already in project) |
| Config file | None detected — see Wave 0 |
| Quick run command | `npm test` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SERV-01 | HTTP server starts and listens | integration | `vitest run tests/server/start.test.ts` | ❌ Wave 0 |
| SERV-02 | POST /v1/provision creates repo | integration | `vitest run tests/server/provision.test.ts` | ❌ Wave 0 |
| SERV-03 | GET /v1/resolve returns alias info | integration | `vitest run tests/server/resolve.test.ts` | ❌ Wave 0 |
| SERV-04 | GET/POST /v1/rules manages rules | integration | `vitest run tests/server/rules.test.ts` | ❌ Wave 0 |
| SERV-05 | POST /v1/webhook/github handles events | integration | `vitest run tests/server/webhook.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run tests/server/{specific}.test.ts`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/server/start.test.ts` — covers SERV-01 (server lifecycle)
- [ ] `tests/server/provision.test.ts` — covers SERV-02
- [ ] `tests/server/resolve.test.ts` — covers SERV-03
- [ ] `tests/server/rules.test.ts` — covers SERV-04
- [ ] `tests/server/webhook.test.ts` — covers SERV-05 (HMAC verification)
- [ ] `tests/server/auth.test.ts` — API key validation
- [ ] `tests/helpers/app.ts` — Fastify app builder for testing

## Sources

### Primary (HIGH confidence)
- `/fastify/fastify` (Context7) - Plugin architecture, error handling, hooks, logging
- `/llmstxt/fastify_dev_llms_txt` (Context7) - Authentication hooks, graceful shutdown, route patterns

### Secondary (MEDIUM confidence)
- Node.js crypto documentation - timingSafeEqual API
- GitHub Webhook documentation - X-Hub-Signature-256 format

### Tertiary (LOW confidence)
- None — all core patterns verified through Context7

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Context7 documentation verified, versions checked against npm registry
- Architecture: HIGH - Fastify patterns are well-documented and battle-tested
- Pitfalls: HIGH - Based on common security mistakes and verified mitigation patterns
- Webhook security: HIGH - HMAC verification is standard practice with clear implementation
- Daemon management: MEDIUM - Cross-platform considerations need Windows testing

**Research date:** 2026-03-19
**Valid until:** 30 days - Fastify 5.x is stable, patterns unlikely to change significantly