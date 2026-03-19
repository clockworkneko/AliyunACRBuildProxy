# ASOR - ACR Smart Orchestrator & Resolver

[![Tests](https://img.shields.io/badge/tests-85%2F85%20passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

> 🚀 **Swiss Knife Mode** — No Docker, No Kubernetes, just a single executable for all container registry management

ASOR (ACR Smart Orchestrator & Resolver) is a container registry management tool designed for developers behind the GFW (Great Firewall). It automatically syncs GitHub repositories to Alibaba Cloud ACR, enabling high-speed container image pulls within China without VPN.

## ✨ Swiss Knife Mode

**Core Value: Single Tool, Complete Functionality**

Unlike traditional solutions, ASOR requires:
- ❌ No Docker environment
- ❌ No Kubernetes cluster
- ❌ No complex CI/CD pipelines
- ❌ No multi-tool coordination

**Just one Node.js executable** to:
- ✅ Manage Alibaba Cloud ACR repositories
- ✅ Auto-sync GitHub repositories
- ✅ Create friendly alias system
- ✅ Run HTTP API server
- ✅ Receive GitHub webhooks

## 🛒 Ingredients (Prerequisites)

Before starting, please prepare the following:

### Required Ingredients

| Ingredient | Purpose | How to Obtain |
|------------|---------|---------------|
| **GitHub Personal Access Token** | Access GitHub API, create repositories | [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) |
| **Alibaba Cloud AccessKey ID** | Access Alibaba Cloud ACR API | [Alibaba Cloud Console → AccessKey Management](https://ram.console.aliyun.com/manage/ak) |
| **Alibaba Cloud AccessKey Secret** | Used with AccessKey ID | Same as above, obtained when creating |
| **Alibaba Cloud Account** | Use ACR services | Register at [Alibaba Cloud](https://www.aliyun.com/) |

### Optional Ingredients

| Ingredient | Purpose | Description |
|------------|---------|-------------|
| API Key | HTTP server authentication | Custom key for API access |
| Webhook Secret | GitHub Webhook verification | Custom key for secure webhook reception |
| Custom Namespace | Repository organization | Default is `asor`, customizable |

### Environment Requirements

- **Node.js**: >= 20.0.0
- **Operating System**: Windows / macOS / Linux
- **Network**: Can access Alibaba Cloud (domestic network is sufficient)

## 🚀 Quick Start

### Step 1: Installation

```bash
# Clone the repository
git clone https://github.com/clockworkneko/AliyunACRBuildProxy.git
cd AliyunACRBuildProxy

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

### Step 2: Configure Ingredients

```bash
# Configure GitHub Token
asor config set github-token <your-github-pat>

# Configure Alibaba Cloud credentials
asor config set aliyun-access-key <your-access-key-id>
asor config set aliyun-secret-key <your-access-key-secret>
asor config set aliyun-region <region>  # e.g., cn-beijing

# Configure API Key (required for HTTP server mode)
asor config set api-key <your-api-key>
```

### Step 3: Add Repository

```bash
# Add a GitHub repository and create an alias
asor add https://github.com/username/repo --alias myapp

# List all repositories
asor list
```

### Step 4: Use Alias

```bash
# Get docker pull command
asor resolve myapp

# Output: docker pull registry.cn-beijing.aliyuncs.com/asor/myapp:latest
```

### Step 5: Start HTTP Server (Optional)

```bash
# Start the server daemon
asor server --start

# Check server status
asor server --status

# Stop the server
asor server --stop
```

## 📖 Features

### Phase 1: CLI Swiss Knife Mode ✅

**Complete** — Full-featured command line tool

#### Configuration Management
```bash
asor config set <key> <value>    # Set configuration
asor config get <key>            # Get configuration
asor config delete <key>         # Delete configuration
asor config list                 # List all configurations
```

#### Repository Management
```bash
asor add <GitHub-URL> --alias <name> [--namespace <namespace>] [--region <region>]
asor list                        # List all repositories
asor remove <alias> [--force] [--keep-acr]  # Remove a repository
```

#### Alias Resolution
```bash
asor resolve <alias> [--tag <tag>]  # Resolve alias to docker pull command
```

#### Rule Management
```bash
asor rules <alias> list          # List build rules
asor rules <alias> add <branch-pattern> <tag-template>  # Add rule
asor rules <alias> remove <rule-id>  # Remove rule
asor rules <alias> cleanup [--dry-run] [--force]  # Cleanup merged branches
```

### Phase 2: HTTP Server Mode ✅

**Complete** — REST API and Webhook integration

#### Server Management
```bash
asor server --start              # Start HTTP server daemon
asor server --stop               # Stop server
asor server --status             # Check server status
asor server --restart            # Restart server
```

#### REST API

**Authentication**: All API endpoints (except health check) require `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/v1/provision
```

**Available Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (no auth required) |
| POST | `/v1/provision` | Create repository |
| GET | `/v1/resolve?alias=<name>` | Resolve alias |
| GET | `/v1/rules/:alias` | List rules |
| POST | `/v1/rules/:alias` | Add rule |
| DELETE | `/v1/rules/:alias/:ruleId` | Remove rule |
| POST | `/v1/rules/:alias/cleanup` | Cleanup rules |
| POST | `/v1/webhook/github` | GitHub Webhook |

#### GitHub Webhook Setup

1. Configure webhook secret:
   ```bash
   asor config set webhook-secret <your-secret>
   ```

2. In your GitHub repository, go to Settings → Webhooks → Add webhook:
   - **Payload URL**: `http://your-server:3000/v1/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: Your webhook secret
   - **Events**: Select "Push" and "Branch or tag deletion"

## 🔧 Configuration

Configuration is stored encrypted in `~/.asor/config.json` using AES-256-CBC.

### Configuration Items

| Config Key | Description | Required |
|------------|-------------|----------|
| `github-token` | GitHub Personal Access Token | ✅ |
| `aliyun-access-key` | Alibaba Cloud Access Key ID | ✅ |
| `aliyun-secret-key` | Alibaba Cloud Access Key Secret | ✅ |
| `aliyun-region` | Alibaba Cloud region (e.g., cn-beijing) | ✅ |
| `default-namespace` | Default namespace | ❌ |
| `api-key` | HTTP server API key | Server mode |
| `webhook-secret` | GitHub Webhook secret | Webhook |
| `server-port` | Server port (default: 3000) | ❌ |
| `server-host` | Server host (default: 127.0.0.1) | ❌ |

## 🏗️ System Architecture

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
                    │  │   (Create repos)    │  │
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

## 🧪 Testing

```bash
# Run all tests
npm test

# Test Results
# ✓ 12 test files passed
# ✓ 85 tests passed
# ✓ 0 tests failed
```

## 📁 Project Structure

```
.
├── src/
│   ├── cli/              # CLI commands
│   │   ├── commands/     # Command implementations
│   │   └── output.ts     # Output formatting
│   ├── server/           # HTTP server
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Middleware
│   │   └── daemon/       # Daemon management
│   ├── services/         # Core business logic
│   │   ├── orchestrator.ts
│   │   ├── resolver.ts
│   │   └── rule-manager.ts
│   ├── config/           # Configuration management
│   └── db/               # Database layer
├── tests/                # Test files
├── .planning/            # Project planning documents
├── README.md             # This document (Traditional Chinese)
├── README-sc.md          # Simplified Chinese documentation
├── README-en.md          # English documentation
└── package.json
```

## 📝 Changelog

### v1.0.0 (2026-03-19)
- ✅ Phase 1: CLI Swiss Knife Mode
  - Encrypted credential management
  - Repository orchestration and management
  - Alias resolution
  - Rule management and cleanup
- ✅ Phase 2: HTTP Server Mode
  - Fastify HTTP server
  - REST API endpoints
  - Daemon lifecycle management
  - GitHub Webhook integration with HMAC verification

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read the planning documents in `.planning/` directory for architecture decisions.

---

**Made with ❤️ for developers behind the GFW**

**Swiss Knife Mode** — Simple, Fast, Zero Dependencies
