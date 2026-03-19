# Phase 2 Validation Architecture

## Overview

Phase 2 uses an **embedded TDD approach** where tests are created within each implementation task rather than in a separate Wave 0. This is valid because:

1. All tasks use `<type="auto" tdd="true">` pattern
2. Each task's `<behavior>` section defines test cases before implementation
3. Each task's `<verify>` section includes automated test commands
4. Tests validate both positive and negative cases

## Requirement Coverage Matrix

| Requirement | Test Files | Validation Method |
|-------------|------------|-------------------|
| SERV-01 (HTTP Server) | `tests/server/app.test.ts`<br>`tests/server/start.test.ts`<br>`tests/server/daemon.test.ts`<br>`tests/server/cli.test.ts` | Automated (Vitest) |
| SERV-02 (/provision) | `tests/server/routes/provision.test.ts` | Automated (Vitest) |
| SERV-03 (/resolve) | `tests/server/routes/resolve.test.ts` | Automated (Vitest) |
| SERV-04 (/rules) | `tests/server/routes/rules.test.ts` | Automated (Vitest) |
| SERV-05 (GitHub webhook) | `tests/server/webhook-auth.test.ts`<br>`tests/server/routes/webhook.test.ts` | Automated (Vitest) |
| API Authentication | `tests/server/auth.test.ts` | Automated (Vitest) |

## Test Execution

```bash
# Run all server tests
npm test -- --run tests/server/

# Run specific requirement tests
npm test -- --run tests/server/routes/provision.test.ts  # SERV-02
npm test -- --run tests/server/routes/resolve.test.ts    # SERV-03
npm test -- --run tests/server/routes/rules.test.ts      # SERV-04
npm test -- --run tests/server/routes/webhook.test.ts    # SERV-05
```

## Validation Commands by Plan

### Plan 02-01: HTTP Server Foundation
```bash
npm test -- --run tests/helpers/app.test.ts
npm test -- --run tests/server/app.test.ts
npm test -- --run tests/server/auth.test.ts
```

### Plan 02-02: Daemon Lifecycle
```bash
npm test -- --run tests/server/start.test.ts
npm test -- --run tests/server/daemon.test.ts
npm test -- --run tests/server/cli.test.ts
```

### Plan 02-03: REST API Endpoints
```bash
npm test -- --run tests/server/routes/provision.test.ts
npm test -- --run tests/server/routes/resolve.test.ts
npm test -- --run tests/server/routes/rules.test.ts
```

### Plan 02-04: GitHub Webhook Integration
```bash
npm test -- --run tests/server/webhook-auth.test.ts
npm test -- --run tests/server/routes/webhook.test.ts
```

## Success Criteria Validation

| Success Criteria | Validation Method |
|------------------|-------------------|
| User can set API key | CLI test in `tests/server/cli.test.ts` |
| User can start server | Daemon test in `tests/server/daemon.test.ts` |
| Server rejects unauthenticated requests | Auth test in `tests/server/auth.test.ts` |
| Health check works without auth | App test in `tests/server/app.test.ts` |
| All responses follow envelope format | App test in `tests/server/app.test.ts` |
| POST /v1/provision works | Route test in `tests/server/routes/provision.test.ts` |
| GET /v1/resolve works | Route test in `tests/server/routes/resolve.test.ts` |
| /v1/rules endpoints work | Route test in `tests/server/routes/rules.test.ts` |
| GitHub webhook verifies signatures | Webhook auth test in `tests/server/webhook-auth.test.ts` |
| Webhook triggers cleanup | Webhook route test in `tests/server/routes/webhook.test.ts` |

## Notes

- Tests use Vitest with `happy-dom` environment
- Test helper at `tests/helpers/app.ts` provides Fastify app builder
- All tests run with `npm test -- --run` (no watch mode in CI)
- Coverage reports generated with `npm test -- --coverage`
