---
status: testing
phase: 02-http-server
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
  - 02-03-SUMMARY.md
  - 02-04-SUMMARY.md
started: 2026-03-19T19:40:00Z
updated: 2026-03-19T19:40:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running server. Clear ephemeral state. Start the application from scratch with `npm run build` then `npm test -- --run`.
  Server boots without errors, all tests pass (including new server tests), and a basic health check returns live data.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Application builds and all tests pass on fresh start
result: pending

### 2. API Key Configuration
expected: Run `asor config set api-key my-secret-key`. Config is saved and encrypted. Run `asor config get api-key` to verify it retrieves correctly.
result: pending

### 3. Server Start Command
expected: Run `asor server --start`. Server starts as background daemon, shows PID and port (default 3000). PID file created in temp directory.
result: pending

### 4. Server Status Command
expected: Run `asor server --status`. Shows "Server running (PID: X, port: 3000)" if running, or "Server is not running" if stopped.
result: pending

### 5. Health Endpoint (Unauthenticated)
expected: With server running, curl `GET /health`. Returns `{status: 'ok', timestamp: '...'}` without requiring API key.
result: pending

### 6. Health Endpoint with v1 Prefix
expected: With server running, curl `GET /v1/health`. Should also return health status (or 404 if not configured).
result: pending

### 7. Authenticated Request Without API Key
expected: With server running, curl `GET /v1/resolve?alias=test` without X-API-Key header. Returns 401 with error code UNAUTHORIZED.
result: pending

### 8. Authenticated Request With Invalid API Key
expected: With server running, curl `GET /v1/resolve?alias=test` with header `X-API-Key: wrong-key`. Returns 401 with error code UNAUTHORIZED.
result: pending

### 9. Provision Endpoint
expected: With server running and valid API key, POST to `/v1/provision` with body `{"imageName": "nginx", "imageTag": "latest"}`. Returns success with alias, acrUrl, and dockerPullCommand.
result: pending

### 10. Resolve Endpoint
expected: With server running and valid API key, GET `/v1/resolve?alias=nginx-latest`. Returns success with alias, tag, acrUrl, fullImagePath, and dockerPullCommand.
result: pending

### 11. Resolve Non-Existent Alias
expected: With server running and valid API key, GET `/v1/resolve?alias=nonexistent`. Returns 404 with error code ALIAS_NOT_FOUND.
result: pending

### 12. Rules List Endpoint
expected: With server running, valid API key, and existing alias, GET `/v1/rules/:alias`. Returns list of rules with id, branchPattern, tagTemplate, acrRuleId, status.
result: pending

### 13. Rules Add Endpoint
expected: With server running and valid API key, POST `/v1/rules/:alias` with body `{"branchPattern": "feature/*", "tagTemplate": "dev-{branch}"}`. Returns 201 with created rule.
result: pending

### 14. Rules Delete Endpoint
expected: With server running, valid API key, and existing rule, DELETE `/v1/rules/:alias/:ruleId`. Returns success with removed: true.
result: pending

### 15. Response Envelope Format
expected: All API responses follow `{success: true/false, data: {...}}` or `{success: false, error: {code, message}}` format.
result: pending

### 16. Server Stop Command
expected: Run `asor server --stop`. Server stops gracefully, PID file removed. Status check shows "Server is not running".
result: pending

### 17. Webhook Secret Configuration
expected: Run `asor config set webhook-secret my-webhook-secret`. Config is saved and encrypted.
result: pending

### 18. GitHub Webhook Endpoint
expected: With webhook secret configured, POST to `/v1/webhook/github` with proper X-Hub-Signature-256 header. Returns success. Invalid signature returns 401.
result: pending

### 19. Server Restart Command
expected: With server running, run `asor server --restart`. Server stops and starts with new PID. Status shows new PID.
result: pending

### 20. Error Code Consistency
expected: Error responses include standardized error codes: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, ALIAS_NOT_FOUND, ALIAS_EXISTS, CONFIGURATION_ERROR.
result: pending

## Summary

total: 20
passed: 0
issues: 0
pending: 20
skipped: 0

## Gaps

[none yet]
