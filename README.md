# TXDNAgent — Multi-Agent Engineering Framework

> A Claude Agent SDK-powered team of 9 specialized engineering agents for TransactionDNA and EnterpriseOS.

---

## What This Is

A production-ready multi-agent system that replaces ad-hoc AI prompting with a disciplined, role-based engineering team. Each agent has a defined role, bounded scope, escalation rules, quality gates, and TransactionDNA-specific guardrails.

Ships with:
- **9 specialized agents** (Product Manager → DevOps Engineer)
- **6 orchestrated workflows** covering the full feature lifecycle
- **Admin UI** for running workflows and configuring agents
- **Audit trail** and **risk register** built in
- **caveman** + **ECC** installed for token efficiency

---

## Agents

| Agent | Role | Key Responsibility |
|---|---|---|
| 📋 Product Manager | `product-management` | Feature specs, personas, acceptance criteria |
| 🎨 Product Designer | `product-design` | Screen flows, IA, states, trust cues |
| 🖥️ UI/UX Expert | `ui-ux` | React/Tailwind component specs, accessibility |
| 🏗️ Microservice Architect | `architecture` | Service boundaries, APIs, events, tenancy model |
| 👨‍💻 Senior Full-Stack Developer | `implementation` | Safe, minimal changes across frontend & backend |
| 🔍 Code Reviewer | `code-review` | Correctness, performance, API contracts, tests |
| 🔒 Security Engineer | `security` | Auth, RBAC, tenant isolation, OWASP, signoff |
| 🚀 DevOps Engineer | `devops` | K8s/Helm/Terraform, migrations, release readiness |
| 🧪 QA / Test Engineer | `qa` | Unit, integration, regression, smoke, migration tests |

---

## Workflows

### 1. Feature Design
```bash
tsx index.ts feature -f "Add bulk exception close with mandatory audit comment"
```
Agents: PM → Designer → UI/UX → Architect → Security → QA

### 2. Microservice Design
```bash
tsx index.ts microservice -c "Notification Service" -d "Send alerts when exceptions breach materiality"
```

### 3. Implementation Planning
```bash
tsx index.ts plan --spec approved-spec.md --branch feature/bulk-close
```

### 4. Code Review
```bash
tsx index.ts review -F "backend/.../ExceptionService.java,frontend/.../ExceptionDetail.tsx" -b feature/bulk-close
```

### 5. Deployment Readiness
```bash
tsx index.ts deploy -b release/v2.5.0 -e staging -m "V157__bulk_close_audit.sql"
```

### 6. Security Review
```bash
tsx index.ts security -f "JWT auth and tenant isolation" -F "backend/.../JwtAuthFilter.java"
```

---

## Setup

```bash
# 1. Install
npm install && cd ui && npm install && cd ..

# 2. Configure
cp .env.example .env
# Set ANTHROPIC_API_KEY, TXDNA_REPO_PATH, ENTERPRISEOS_REPO_PATH

# 3a. CLI mode
tsx index.ts feature -f "your feature idea"

# 3b. Admin UI mode
tsx server.ts &          # API on :3721
cd ui && npm run dev     # UI on :3720 → http://localhost:3720
```

---

## Project Structure

```
agents/
  orchestrator.ts         # Core orchestration engine
  types.ts                # TypeScript interfaces
  definitions/            # 9 agent definitions
  prompts/                # Platform context markdown
  workflows/              # 6 workflow implementations
  tools/                  # Repository read/search, risk register
ui/
  src/pages/              # Dashboard, AgentsPage, WorkflowRunner, RunHistory, RisksPage, SettingsPage
index.ts                  # CLI entry point
server.ts                 # REST API server for admin UI
```

---

## Critical TransactionDNA Rules (Enforced by All Agents)

1. Tenant isolation mandatory — `TenantContext.currentTenantId()` on every data access
2. Backend authorization is authoritative — no frontend-only role checks
3. Audit trail on all mutations
4. No stack traces exposed to users
5. H2 + PostgreSQL migrations must stay in sync
6. Graph AI is advisory only — never executes or certifies
7. No `alert()` in frontend — use toast
8. Never push directly to main
9. DomainExecutionRouter must not be bypassed

---

## Installed Enhancements

- **[caveman](https://github.com/JuliusBrussee/caveman)** — Claude Code token efficiency plugin
- **[ECC](https://github.com/affaan-m/ECC)** — Agent harness skills (`~/.claude/skills/ecc/`)

---

## Future Enhancements

- MCP tools for GitHub, Jira, Slack integration
- Auto code review on PR open with inline comment posting
- CI/CD trigger on release branch creation
- Graphify-powered repository intelligence
- Real-time streaming output in admin UI
- In-browser approval gate for `[REQUIRES HUMAN APPROVAL]` items