---
phase: 02-http-server
plan: 04
subsystem: api
tags: [webhook, github, hmac, signature, cleanup]

# Dependency graph
requires:
  - phase: 02-01
    provides: Fastify app factory, auth middleware, error codes, envelope format
provides:
  - GitHub webhook endpoint at /v1/webhook/github
  - HMAC signature verification middleware
  - Webhook-triggered cleanup for merged/deleted branches
affects:
  - server routes
  - config commands

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HMAC-SHA256 signature verification with timing-safe comparison
    - Webhook preHandler hook pattern

key-files:
  created:
    - src/server/middleware/webhook-auth.ts
    - src/server/routes/v1/webhook.ts
    - tests/server/middleware/webhook-auth.test.ts
    - tests/server/routes/webhook.test.ts
    - tests/server/config.test.ts
  modified:
    - src/cli/commands/config.ts

key-decisions:
  - "Webhook endpoint does NOT use API key auth, uses HMAC signature instead"
  - "Cleanup triggers on both push events (deleted:true) and delete events (ref_type:branch)"
  - "Cleanup failures are logged but don't crash the webhook handler"

patterns-established:
  - "webhookAuthHook preHandler for HMAC verification"
  - "triggerCleanupForRepo helper for repo alias matching"

requirements-completed: [SERV-05]

# Metrics
duration: 9min
completed: 2026-03-19
---

# Phase 2 Plan 4: GitHub Webhook Endpoint Summary

**GitHub webhook endpoint with HMAC-SHA256 signature verification and automated cleanup for merged/deleted branches**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-19T11:01:03Z
- **Completed:** 2026-03-19T11:10:00Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- GitHub webhook endpoint accepting push/delete events with signature verification
- HMAC-SHA256 signature verification using timing-safe comparison to prevent timing attacks
- Automated cleanup triggering when branches are deleted/merged
- webhook-secret config support via CLI (`asor config set webhook-secret <secret>`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create webhook signature verification utility** - `7727270` (test)
2. **Task 2: Implement GitHub webhook endpoint** - `b0778f3` (feat)
3. **Task 3: Implement webhook-triggered cleanup logic** - `3719a49` (feat)
4. **Task 4: Add webhook-secret config support** - `a292315` (feat)

## Files Created/Modified

- `src/server/middleware/webhook-auth.ts` - HMAC signature verification with timing-safe comparison
- `src/server/routes/v1/webhook.ts` - GitHub webhook endpoint handling push/delete events
- `src/cli/commands/config.ts` - Added webhook-secret and api-key to VALID_KEYS
- `tests/server/middleware/webhook-auth.test.ts` - Unit tests for signature verification (12 tests)
- `tests/server/routes/webhook.test.ts` - Integration tests for webhook endpoint (13 tests)
- `tests/server/config.test.ts` - Tests for webhook-secret config storage (6 tests)

## Decisions Made

1. **Webhook endpoint skips API key auth** - Uses HMAC signature verification instead, matching GitHub's webhook security model
2. **Cleanup triggers on both event types** - Both `push` events with `deleted:true` and `delete` events with `ref_type:branch` trigger cleanup
3. **Cleanup failures don't crash webhook** - Errors are logged and the webhook returns success regardless, ensuring GitHub doesn't retry unnecessarily

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing test failures in `tests/server/cli.test.ts` for server command (from Plans 02-02/02-03 not yet executed) - out of scope for this plan

## User Setup Required

**External services require manual configuration.** To use the webhook endpoint:

1. Set webhook secret:
   ```bash
   asor config set webhook-secret <your-secret>
   ```

2. Configure GitHub webhook:
   - Go to Repository Settings → Webhooks → Add webhook
   - Payload URL: `http://your-server/v1/webhook/github`
   - Content type: `application/json`
   - Secret: Use the same secret configured above
   - Events: Select "Push" and "Branch or tag deletion"

## Next Phase Readiness

- Webhook endpoint fully functional and tested
- Cleanup integration with rule-manager working
- Config support for webhook-secret complete
- Ready for production deployment once server command (Plans 02-02/02-03) is implemented

---
*Phase: 02-http-server*
*Completed: 2026-03-19*