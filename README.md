# ASOR - ACR Smart Orchestrator & Resolver

[![Tests](https://img.shields.io/badge/tests-85%2F85%20passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

> 消除 GFW 帶來的開發障礙，透過自動化編排阿里雲 ACR，將 GitHub 程式碼自動轉化為國內可高速拉取的容器映像。

ASOR (ACR Smart Orchestrator & Resolver) is a CLI tool and HTTP server that automates the orchestration of Alibaba Cloud Container Registry (ACR) repositories. It bridges GitHub repositories with ACR, enabling developers in China to pull container images at high speeds.

## Features

### CLI Mode (Phase 1)
- 🔐 **Secure credential management** - Encrypted storage for GitHub PAT and Alibaba Cloud credentials
- 📦 **Repository provisioning** - Automatically create ACR repositories from GitHub URLs
- 🔍 **Alias resolution** - Resolve friendly aliases to full ACR image paths
- 🧹 **Rule management** - Manage build rules with automatic cleanup for merged branches
- 🗄️ **SQLite database** - Local storage for repository metadata

### HTTP Server Mode (Phase 2)
- 🌐 **REST API** - Full HTTP API for CI/CD integration
- 🔑 **API key authentication** - Secure access with X-API-Key header
- 👻 **Daemon mode** - Background process management with PID files
- 🪝 **GitHub webhook** - Automated builds triggered by push/delete events
- ✅ **HMAC signature verification** - Secure webhook payload validation
- 📋 **Response envelope format** - Consistent `{success, data}` / `{success, error}` responses

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd asor

# Install dependencies
npm install

# Build the project
npm run build

# Link for global access
npm link
```

## Quick Start

### 1. Configure Credentials

```bash
# Set GitHub Personal Access Token
asor config set github-token <your-github-pat>

# Set Alibaba Cloud credentials
asor config set aliyun-access-key <your-access-key>
asor config set aliyun-secret-key <your-secret-key>
asor config set aliyun-region <region>  # e.g., cn-beijing

# Set API key for HTTP server (optional, for server mode)
asor config set api-key <your-api-key>
```

### 2. Add a Repository

```bash
# Add a GitHub repository with an alias
asor add https://github.com/username/repo --alias myapp

# List all repositories
asor list
```

### 3. Resolve an Alias

```bash
# Get the docker pull command for an alias
asor resolve myapp

# Output: docker pull registry.cn-beijing.aliyuncs.com/asor/myapp:latest
```

### 4. Start HTTP Server (Optional)

```bash
# Start the HTTP server daemon
asor server --start

# Check server status
asor server --status

# Stop the server
asor server --stop
```

## CLI Commands

### Configuration
```bash
asor config set <key> <value>    # Set configuration value
asor config get <key>            # Get configuration value
asor config delete <key>         # Delete configuration value
asor config list                 # List all configuration
```

### Repository Management
```bash
asor add <github-url> --alias <name> [--namespace <ns>] [--region <region>]
asor list                        # List all repositories
asor remove <alias> [--force] [--keep-acr]  # Remove a repository
```

### Alias Resolution
```bash
asor resolve <alias> [--tag <tag>]  # Resolve alias to docker pull command
```

### Rule Management
```bash
asor rules <alias> list          # List build rules
asor rules <alias> add <branch-pattern> <tag-template>  # Add build rule
asor rules <alias> remove <rule-id>  # Remove build rule
asor rules <alias> cleanup [--dry-run] [--force]  # Cleanup merged branch rules
```

### Server Management
```bash
asor server --start              # Start HTTP server daemon
asor server --stop               # Stop HTTP server daemon
asor server --status             # Check server status
asor server --restart            # Restart HTTP server daemon
```

## HTTP API

### Authentication
All API endpoints (except health) require the `X-API-Key` header:
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/v1/provision
```

### Endpoints

#### Health Check
```bash
GET /health
# Response: {"success": true, "data": {"status": "ok", "timestamp": "..."}}
```

#### Provision Repository
```bash
POST /v1/provision
Content-Type: application/json

{
  "imageName": "nginx",
  "imageTag": "latest",
  "alias": "nginx-latest"  // optional
}

# Response: {"success": true, "data": {"alias": "...", "acrUrl": "...", "dockerPullCommand": "..."}}
```

#### Resolve Alias
```bash
GET /v1/resolve?alias=nginx-latest

# Response: {"success": true, "data": {"alias": "...", "tag": "...", "acrUrl": "...", "fullImagePath": "...", "dockerPullCommand": "..."}}
```

#### List Rules
```bash
GET /v1/rules/:alias

# Response: {"success": true, "data": {"rules": [...]}}
```

#### Add Rule
```bash
POST /v1/rules/:alias
Content-Type: application/json

{
  "branchPattern": "feature/*",
  "tagTemplate": "dev-{branch}"
}
```

#### Remove Rule
```bash
DELETE /v1/rules/:alias/:ruleId
```

#### Cleanup Rules
```bash
POST /v1/rules/:alias/cleanup?dryRun=true
```

#### GitHub Webhook
```bash
POST /v1/webhook/github
X-Hub-Signature-256: sha256=<signature>

# GitHub webhook payload
```

## GitHub Webhook Setup

1. Configure webhook secret:
   ```bash
   asor config set webhook-secret <your-secret>
   ```

2. In your GitHub repository, go to Settings → Webhooks → Add webhook:
   - **Payload URL**: `http://your-server:3000/v1/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: Your webhook secret
   - **Events**: Select "Push" and "Branch or tag deletion"

## Configuration

Configuration is stored encrypted in `~/.asor/config.json`.

### Available Keys

| Key | Description | Required |
|-----|-------------|----------|
| `github-token` | GitHub Personal Access Token | Yes |
| `aliyun-access-key` | Alibaba Cloud Access Key ID | Yes |
| `aliyun-secret-key` | Alibaba Cloud Access Key Secret | Yes |
| `aliyun-region` | Alibaba Cloud region (e.g., cn-beijing) | Yes |
| `default-namespace` | Default ACR namespace | No |
| `api-key` | API key for HTTP server authentication | For server mode |
| `webhook-secret` | Secret for GitHub webhook verification | For webhooks |
| `server-port` | HTTP server port (default: 3000) | No |
| `server-host` | HTTP server host (default: 127.0.0.1) | No |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CLI Commands  │     │   HTTP Server   │     │  GitHub Webhook │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Core Services         │
                    │  ┌─────────────────────┐  │
                    │  │   Orchestrator      │  │
                    │  │   (Provision repos) │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │   Resolver          │  │
                    │  │   (Alias → ACR URL) │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │   Rule Manager      │  │
                    │  │   (Build rules)     │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Data Layer           │
                    │   SQLite (sql.js)         │
                    └───────────────────────────┘
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/server/routes/provision.test.ts
```

## Project Structure

```
.
├── src/
│   ├── cli/              # CLI commands
│   │   ├── commands/     # Command implementations
│   │   └── output.ts     # Output formatting
│   ├── server/           # HTTP server
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth, envelope, webhook
│   │   └── daemon/       # Daemon management
│   ├── services/         # Core business logic
│   │   ├── orchestrator.ts
│   │   ├── resolver.ts
│   │   └── rule-manager.ts
│   ├── config/           # Configuration management
│   └── db/               # Database layer
├── tests/                # Test files
├── .planning/            # Project planning documents
└── README.md
```

## Development

### Prerequisites
- Node.js 20+
- npm or yarn

### Setup
```bash
npm install
npm run build
npm test
```

### Build
```bash
npm run build        # Build once
npm run build:watch  # Build in watch mode
```

## Changelog

### v1.0.0 (2026-03-19)
- ✅ Phase 1: CLI Swiss Army Knife Mode
  - Config management with encrypted credentials
  - Repository provisioning and management
  - Alias resolution
  - Rule management with cleanup
- ✅ Phase 2: HTTP Server Mode
  - Fastify HTTP server
  - REST API endpoints
  - Daemon lifecycle management
  - GitHub webhook integration with HMAC verification

## License

MIT

## Contributing

Contributions are welcome! Please read the planning documents in `.planning/` for architecture decisions and requirements.

---

**Made with ❤️ for developers behind the GFW**
