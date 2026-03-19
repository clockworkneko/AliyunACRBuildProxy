# ASOR - 阿里云容器仓库智能编排解决方案

[![测试](https://img.shields.io/badge/测试-85%2F85%20通过-brightgreen)]()
[![版本](https://img.shields.io/badge/版本-1.0.0-blue)]()
[![授权](https://img.shields.io/badge/授权-MIT-green)]()

> 🚀 **瑞士刀模式** — 无需 Docker、无需 Kubernetes，单一可执行文件搞定所有容器仓库管理

ASOR（ACR Smart Orchestrator & Resolver）是一款专为 GFW 内开发者设计的容器仓库管理工具。它将 GitHub 仓库自动同步至阿里云 ACR，让你在国内也能高速拉取容器镜像，无需科学上网。

## ✨ 瑞士刀模式（Swiss Knife Mode）

**核心卖点：单一工具，完整功能**

与传统方案不同，ASOR 不需要：
- ❌ Docker 环境
- ❌ Kubernetes 集群
- ❌ 复杂的 CI/CD 流水线
- ❌ 多个工具协作
- ❌ 后台服务器或守护进程

**只需要一个 Node.js 可执行文件**，即可：
- ✅ 管理阿里云 ACR 仓库
- ✅ 自动同步 GitHub 仓库
- ✅ 创建友好的别名系统
- ✅ 管理构建规则和清理

## 🛒 所需材料（Ingredients）

开始使用前，请准备以下材料：

### 必需材料

| 材料 | 用途 | 获取方式 |
|------|------|----------|
| **GitHub Personal Access Token** | 访问 GitHub API，创建仓库 | [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) |
| **阿里云 AccessKey ID** | 访问阿里云 ACR API | [阿里云控制台 → AccessKey 管理](https://ram.console.aliyun.com/manage/ak) |
| **阿里云 AccessKey Secret** | 配合 AccessKey ID 使用 | 同上，创建时同时获得 |
| **阿里云账号** | 使用 ACR 服务 | [阿里云官网](https://www.aliyun.com/) 注册 |

### 可选材料

| 材料 | 用途 | 说明 |
|------|------|------|
| 自定义命名空间 | 仓库组织 | 默认使用 `asor`，可自定义 |

### 环境要求

- **Node.js**: >= 20.0.0
- **操作系统**: Windows / macOS / Linux
- **网络**: 能访问阿里云（国内网络即可）

## 🚀 快速开始

### 第一步：安装

```bash
# 克隆仓库
git clone https://github.com/clockworkneko/AliyunACRBuildProxy.git
cd AliyunACRBuildProxy

# 安装依赖
npm install

# 构建项目
npm run build

# 链接到全局（可选）
npm link
```

### 第二步：配置材料

```bash
# 配置 GitHub Token
asor config set github-token <你的-GitHub-PAT>

# 配置阿里云凭证
asor config set aliyun-access-key <你的-AccessKey-ID>
asor config set aliyun-secret-key <你的-AccessKey-Secret>
asor config set aliyun-region <区域>  # 例如：cn-beijing
```

### 第三步：添加仓库

```bash
# 添加 GitHub 仓库并创建别名
asor add https://github.com/用户名/仓库名 --alias 我的应用

# 查看所有仓库
asor list
```

### 第四步：使用别名

```bash
# 获取 docker pull 命令
asor resolve 我的应用

# 输出：docker pull registry.cn-beijing.aliyuncs.com/asor/我的应用:latest
```

## 📖 功能详情

### CLI 瑞士刀模式

#### 配置管理
```bash
asor config set <键> <值>    # 设置配置
asor config get <键>         # 获取配置
asor config delete <键>      # 删除配置
asor config list             # 列出所有配置
```

#### 仓库管理
```bash
asor add <GitHub-URL> --alias <别名> [--namespace <命名空间>] [--region <区域>]
asor list                    # 列出所有仓库
asor remove <别名> [--force] [--keep-acr]  # 删除仓库
```

#### 别名解析
```bash
asor resolve <别名> [--tag <标签>]  # 解析别名为 docker pull 命令
```

#### 规则管理
```bash
asor rules <别名> list       # 列出构建规则
asor rules <别名> add <分支模式> <标签模板>  # 添加规则
asor rules <别名> remove <规则-ID>  # 删除规则
asor rules <别名> cleanup [--dry-run] [--force]  # 清理已合并分支
```

## 🔧 配置说明

配置存储在 `~/.asor/config.json`，使用 AES-256-CBC 加密。

### 配置项

| 配置键 | 说明 | 必需 |
|--------|------|------|
| `github-token` | GitHub Personal Access Token | ✅ |
| `aliyun-access-key` | 阿里云 Access Key ID | ✅ |
| `aliyun-secret-key` | 阿里云 Access Key Secret | ✅ |
| `aliyun-region` | 阿里云区域（如 cn-beijing） | ✅ |
| `default-namespace` | 默认命名空间 | ❌ |

## 🏗️ 系统架构

```
┌─────────────────┐
│   CLI 命令      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   核心服务      │
│  ┌───────────┐  │
│  │ 编排器    │  │
│  │ (创建仓库)│  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ 解析器    │  │
│  │ (别名解析)│  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ 规则管理器│  │
│  │ (构建规则)│  │
│  └───────────┘  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   数据层        │
│  SQLite        │
└─────────────────┘
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 测试结果
# ✓ 12 个测试文件通过
# ✓ 85 个测试通过
# ✓ 0 个测试失败
```

## 📁 项目结构

```
.
├── src/
│   ├── cli/              # CLI 命令
│   │   ├── commands/     # 命令实现
│   │   └── output.ts     # 输出格式化
│   ├── clients/          # API 客户端
│   │   ├── acr.ts        # 阿里云 ACR
│   │   └── github.ts     # GitHub
│   ├── services/         # 核心业务逻辑
│   │   ├── orchestrator.ts
│   │   ├── resolver.ts
│   │   └── rule-manager.ts
│   ├── config/           # 配置管理
│   └── db/               # 数据库层
├── tests/                # 测试文件
├── README.md             # 本文档（繁体中文）
├── README-sc.md          # 简体中文文档
├── README-en.md          # 英文文档
└── package.json
```

## 📝 更新日志

### v1.0.0 (2026-03-19)
- ✅ CLI 瑞士刀模式
  - 加密凭证管理
  - 仓库编排与管理
  - 别名解析
  - 规则管理与清理

## 📄 授权

MIT

## 🤝 贡献

欢迎贡献！请阅读 `.planning/` 目录下的规划文档了解架构设计。

---

**用 ❤️ 为 GFW 后的开发者制作**

**瑞士刀模式** — 简单、快速、无依赖
