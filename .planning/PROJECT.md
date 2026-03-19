# ASOR (ACR Smart Orchestrator & Resolver)

## What This Is

ASOR is an automation proxy that decouples Aliyun ACR (Container Registry) configuration from GitHub source repositories. It automates the tedious manual setup of ACR repositories and provides an alias-based resolution mechanism to simplify image pulls. Built specifically for developers in China dealing with GFW-related Docker Hub access issues.

## Core Value

Eliminate GFW-induced development friction by automatically orchestrating Aliyun ACR to transform GitHub code into domestically accessible container images with a simple alias resolver — making deployments feel like they're on a LAN.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can register GitHub PAT and Aliyun AK/SK credentials securely
- [ ] Users can onboard a GitHub repo by URL and have ACR repository auto-created
- [ ] Users can define aliases for repos and resolve them to full ACR image paths
- [ ] System automatically manages ACR's 10 build rule limit per repository
- [ ] System provides resolution API for CI/CD integration

### Out of Scope

- Container image data proxying — system only handles metadata/addresses
- Real-time chat or collaboration features — not core value
- Mobile application — web-first, mobile later
- OAuth login — PAT-based authentication sufficient for v1

## Context

### Background: GFW and Docker Problem

In China, `docker pull` from Docker Hub faces:
- Complete blocking or severe throttling since 2024
- Extremely slow download speeds (hours for hundreds of MB)
- GitHub Actions cannot easily deploy to domestic servers

Aliyun ACR serves as a bridge because:
- Domestic high-speed access via Alibaba Cloud nodes
- Overseas build nodes (Hong Kong, Singapore, US) can pull from GitHub and Docker Hub
- Acts as "overseas build -> domestic distribution" intermediary

### Management Pain Points Solved

- UI complexity: Each project requires dozens of manual clicks
- URL confusion: Different regions/namespaces have different URLs
- Rule rigidity: 10-rule limit restricts CI/CD flexibility

## Constraints

- **Cloud Platform**: Aliyun ACR — primary target platform, other registries out of scope
- **Source Control**: GitHub — GitLab/Bitbucket deferred
- **Rule Limit**: 10 build rules per ACR repository — hard constraint requiring intelligent management
- **Region**: Prefer overseas build nodes (cn-hongkong) for GFW bypass

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Zero-bandwidth mode (no image proxying) | Reduces infrastructure complexity, maintains pull speed | — Pending |
| Alias-based resolution | Simplifies developer experience, abstracts ACR URL complexity | — Pending |
| Event-driven rule cleanup | Automatically handles 10-rule limit without user intervention | — Pending |

---
*Last updated: 2026-03-19 after initialization*