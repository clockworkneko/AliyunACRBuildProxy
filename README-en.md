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
- ❌ No background server or daemon

**Just one Node.js executable** to:
- ✅ Manage Alibaba Cloud ACR repositories
- ✅ Auto-sync GitHub repositories
- ✅ Create friendly alias system
- ✅ Manage build rules and cleanup

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

## 📖 Features

### CLI Swiss Knife Mode

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

## 🏗️ System Architecture

```
┌─────────────────┐
│   CLI Commands  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Core Services │
│  ┌───────────┐  │
│  │Orchestrator│  │
│  │(Create repos)│ │
│  └───────────┘  │
│  ┌───────────┐  │
│  │  Resolver │  │
│  │(Alias resolution)│ │
│  └───────────┘  │
│  ┌───────────┐  │
│  │Rule Manager│  │
│  │(Build rules)│  │
│  └───────────┘  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Data Layer    │
│   SQLite        │
└─────────────────┘
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
│   ├── clients/          # API clients
│   │   ├── acr.ts        # Alibaba Cloud ACR
│   │   └── github.ts     # GitHub
│   ├── services/         # Core business logic
│   │   ├── orchestrator.ts
│   │   ├── resolver.ts
│   │   └── rule-manager.ts
│   ├── config/           # Configuration management
│   └── db/               # Database layer
├── tests/                # Test files
├── README.md             # This document (Traditional Chinese)
├── README-sc.md          # Simplified Chinese documentation
├── README-en.md          # English documentation
└── package.json
```

## 📝 Changelog

### v1.0.0 (2026-03-19)
- ✅ CLI Swiss Knife Mode
  - Encrypted credential management
  - Repository orchestration and management
  - Alias resolution
  - Rule management and cleanup

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read the planning documents in `.planning/` directory for architecture decisions.

---

**Made with ❤️ for developers behind the GFW**

**Swiss Knife Mode** — Simple, Fast, Zero Dependencies
