# TXDNAgent — CLAUDE.md

## Project Purpose
This repository is the **multi-agent engineering framework** for TransactionDNA and EnterpriseOS.
It defines a 9-agent product engineering team powered by the Claude Anthropic SDK and provides:
- TypeScript agent definitions with role-specific system prompts
- 6 orchestrated workflows (feature design, microservice design, code review, deployment readiness, implementation planning, security review)
- A React admin UI for running workflows and managing agent configs
- A REST API server bridging the UI to the agent framework

## Key Files
- `index.ts` — CLI entry point (`tsx index.ts feature -f "..."`)
- `server.ts` — REST API server for the admin UI (port 3721)
- `agents/orchestrator.ts` — Core orchestration engine
- `agents/definitions/` — 9 agent definitions
- `agents/workflows/` — 6 workflow implementations
- `agents/tools/` — Repository context tools (file read/search), risk register
- `agents/prompts/` — Shared context markdown files
- `ui/` — React + Vite admin console (port 3720)

## Running

```bash
# Install
cp .env.example .env  # fill in ANTHROPIC_API_KEY and repo paths
npm install
cd ui && npm install && cd ..

# CLI workflows
tsx index.ts feature -f "Add bulk exception close with audit"
tsx index.ts review -F "backend/src/main/java/.../ExceptionService.java"
tsx index.ts deploy -b release/v2.5 -e staging

# Admin UI + API
tsx server.ts &       # starts API on :3721
cd ui && npm run dev  # starts admin UI on :3720
```

## Safety Rules
- NEVER push directly to main — always feature branches
- NEVER run workflows without `ANTHROPIC_API_KEY` set
- `REQUIRE_APPROVAL_FOR_WRITES=true` by default — agents flag [REQUIRES HUMAN APPROVAL]
- All agent outputs are logged to `logs/audit-trail.jsonl`
- Risk register is maintained in `logs/risk-register.json`

## Referenced Repositories
- TransactionDNA: set `TXDNA_REPO_PATH` in `.env`
- EnterpriseOS: set `ENTERPRISEOS_REPO_PATH` in `.env`
Both repositories are read-only by the agents (file read/search only, no writes).
