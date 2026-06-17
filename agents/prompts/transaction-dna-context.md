# TransactionDNA Platform Context

## Platform Purpose
TransactionDNA is an enterprise transaction auditing and compliance platform. It ingests cross-system transaction data from Salesforce CRM, Oracle Order Management, Oracle AR, Oracle RMCS, and related systems. It detects exceptions against configurable rules, maintains cryptographic lineage through a DNA hash, and supports AI-assisted audit workflows.

## Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 19.x, TypeScript 6, Vite, Tailwind CSS 3, Axios |
| Backend | Spring Boot 3.2.5, Java 17, Maven |
| ORM | JPA/Hibernate with Flyway migrations |
| Database | PostgreSQL (prod), H2 (dev) |
| Auth | JWT via JwtAuthFilter, stored in HttpOnly cookie `txdna_auth` |
| Multi-tenancy | TenantContext.currentTenantId() — all data access must be scoped |
| AI/ML | Ollama, Llama.cpp, vLLM, Graphify graph engine |
| Infra | Kubernetes, Helm, Terraform (AWS EKS + RDS + ECR) |
| Migrations | Current: V156 (value_intelligence_schema) |

## Architecture: Horizontal Assurance Platform
TransactionDNA is a HORIZONTAL assurance platform:
- Revenue Assurance is the BUILT_IN domain (CorrelationService + ExceptionDetectionService)
- All other domains (Supply Chain, P2P, Healthcare Claims) install at runtime via Solution Pack manifests
- DomainExecutionRouter is the boundary — never bypass it, never hardcode domain logic outside its two paths

## Frontend Routing
- Legacy UI: `/app` prefix → `pages/` directory
- New UI: `/app-new` prefix → `pages-new/` directory (canonical, standalone implementations)
- `/app-new/dna/:id` is the canonical Transaction Detail workspace
- All pages-new are standalone — do NOT import from pages/ in pages-new/ (ESLint enforced)

## Backend Package Layout
```
com.txdna/
├── controller/   REST endpoints (77+ classes, /api prefix)
├── service/      Business logic + generic domain engines
├── domain/       JPA entities (99+ entity classes)
├── dto/          Request/response objects
├── repository/   Spring Data JPA repositories
├── security/     JWT filter, RBAC, rate limiting
├── util/         GlobalExceptionHandler, TenantContext, NotFoundException
├── graphify/     Graph engine (Graphify integration + adapters)
```

## Domain Language (use exactly these terms)
- **Transaction DNA** — the core audit record
- **DNA Hash** — cryptographic lineage proof
- **Exception** — detected compliance/audit violation
- **Lineage Graph** — visual/programmatic traversal of transaction relationships
- **Transaction Flow** — the path a transaction takes through systems
- **Evidence** — supporting data attached to an exception or audit record
- **Audit Trail** — immutable log of all state-changing operations
- **Remediation** — the workflow to resolve an exception
- **Canonical State** — the authoritative reconciled view of a transaction
- **Source Trace** — provenance tracking back to source system records
- **Materiality** — financial significance threshold for an exception
- **CFRE** — Cash Flow Reconciliation Engine
- **Graph AI** — AI advisory layer on the lineage graph (never executes, never certifies)
- **Graphify** — the graph engine integration
- **Revenue Path** — the expected revenue lifecycle for a transaction

## Critical Rules (MUST enforce)
1. **Tenant isolation is mandatory.** Every data access must be scoped through `TenantContext.currentTenantId()`. No exceptions.
2. **Backend authorization is authoritative.** Never rely on frontend-only role checks.
3. **Audit records are mandatory.** Every state-changing operation must write an audit record.
4. **Never expose stack traces** or raw JSON errors to users.
5. **H2 and PostgreSQL migrations must stay in sync.** Both dialects required.
6. **Never remove legacy `/app` routes** without a safe migration plan.
7. **Graph AI is advisory only.** It must not execute, approve, certify, close, or mutate financial/audit state without explicit user action.
8. **Graph quality, ownership, materiality, and authorization** are server-computed — never client-derived.
9. **Never use `alert()` in frontend.** Use toast or inline error states.
10. **Never push directly to main.** Always use feature branches.
11. **Do not bypass DomainExecutionRouter.** All domain execution flows through it.
12. **Never hardcode domain-specific logic** outside the router's two paths (BUILT_IN / GENERIC).
