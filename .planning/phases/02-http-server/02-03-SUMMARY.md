# Plan 02-03 Summary: REST API Endpoints

## Overview

Implemented REST API endpoints that expose existing CLI services via HTTP, providing HTTP interface for CI/CD integration.

## Tasks Completed

### Task 1: Setup @fastify/autoload and create route directory structure
- **Files:**
  - `src/server/routes/health.ts` - Health check endpoint
  - `src/server/app.ts` - Updated with autoload configuration
- **What:** Configured Fastify autoload to automatically load routes from the routes directory

### Task 2: Implement /v1/provision endpoint
- **Commit:** `24eba89`
- **Files:**
  - `src/server/routes/v1/provision.ts` - Provision endpoint
  - `tests/server/routes/provision.test.ts` - Tests
- **What:** POST endpoint to create new repo aliases with validation

### Task 3: Implement /v1/resolve endpoint
- **Commit:** `24eba89`
- **Files:**
  - `src/server/routes/v1/resolve.ts` - Resolve endpoint
  - `tests/server/routes/resolve.test.ts` - Tests
- **What:** GET endpoint to resolve aliases to ACR image paths

### Task 4: Implement /v1/rules endpoints
- **Commit:** `24eba89`
- **Files:**
  - `src/server/routes/v1/rules.ts` - Rules endpoints
  - `tests/server/routes/rules.test.ts` - Tests
- **What:** Full CRUD endpoints for rule management plus cleanup

### Task 5: Add tests
- **Commit:** `34d440c`
- **Files:**
  - `tests/server/routes/provision.test.ts`
  - `tests/server/routes/resolve.test.ts`
  - `tests/server/routes/rules.test.ts`
  - `tests/server/routes/health.test.ts`
- **What:** Comprehensive test coverage for all endpoints

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check (unauthenticated) |
| POST | /v1/provision | Create new repo alias |
| GET | /v1/resolve?alias=<name> | Resolve alias to image path |
| GET | /v1/rules/:alias | List rules for alias |
| POST | /v1/rules/:alias | Add new rule |
| DELETE | /v1/rules/:alias/:ruleId | Remove rule |
| POST | /v1/rules/:alias/cleanup | Cleanup merged branches |

## Key Features

- ✅ JSON Schema validation for request bodies
- ✅ Proper error codes (ALIAS_EXISTS, ALIAS_NOT_FOUND, VALIDATION_ERROR)
- ✅ All endpoints require X-API-Key authentication
- ✅ Responses follow envelope format
- ✅ Route auto-loading with @fastify/autoload
- ✅ URL versioning with /v1/ prefix

## Test Results

```
✓ tests/server/routes/provision.test.ts - Provision endpoint
✓ tests/server/routes/resolve.test.ts - Resolve endpoint
✓ tests/server/routes/rules.test.ts - Rules endpoints
✓ tests/server/routes/health.test.ts - Health endpoint
```

## Architecture

```
src/server/routes/
├── health.ts          # /health (unauthenticated)
└── v1/
    ├── provision.ts   # POST /v1/provision
    ├── resolve.ts     # GET /v1/resolve
    └── rules.ts       # /v1/rules/* endpoints
```

## Dependencies

- `@fastify/autoload` - Route auto-loading
- Existing services: orchestrator, resolver, rule-manager

## Notes

- All endpoints require valid X-API-Key header
- Health endpoint is public (no authentication required)
- Error responses follow consistent format with error codes
- Services from Phase 1 are reused without modification
