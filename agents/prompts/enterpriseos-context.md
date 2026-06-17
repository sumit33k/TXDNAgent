# EnterpriseOS Platform Context

## Platform Purpose
EnterpriseOS is the enterprise operating layer built around TransactionDNA. It is a microservice-based enterprise platform providing:
- Product modules and workflow automation
- AI-assisted enterprise operations
- Secure tenant isolation across all services
- Enterprise integrations (Salesforce, Oracle, etc.)
- Event-driven service communication
- Full observability stack
- DevOps automation and CI/CD
- Reusable platform services

## Architecture
EnterpriseOS shares the same Spring Boot + Java backend and React + TypeScript frontend stack as TransactionDNA, extended with:
- ACP routing (config/acp_routing.yaml) for AI Copilot Protocol
- MCP server configuration (config/mcp_servers.yaml)
- Caddy reverse proxy (caddy/Caddyfile)
- Helm charts and Helmfile for multi-service deployment
- Prometheus alerting (infra/prometheus-alerts.yml)
- Kubernetes manifests (infra/k8s/)

## Microservice Design Principles
1. **Bounded contexts** — each service owns its domain, its data, its API.
2. **Clear service ownership** — prefer isolated databases over shared ones.
3. **Event-driven cross-service communication** — use async events for cross-boundary work.
4. **Versioned, documented APIs** — every public API has a version prefix and OpenAPI spec.
5. **Independent deployability** — services deploy without coordinated downtime.
6. **Health checks, metrics, structured logs, tracing, audit hooks** — mandatory for every service.
7. **No service bypasses tenant isolation** — ever.
8. **Security, observability, testing, rollback, and migration strategy** — designed up front.
9. **Avoid distributed monolith patterns** — don't share databases, don't do synchronous chains.
10. **Avoid frontend-driven business rules** for compliance decisions.

## EnterpriseOS Open Questions / Assumptions
The following aspects of EnterpriseOS are inferred from the repository and may need verification:
- ACP routing configuration format (acp_routing.yaml) — assumed to route AI Copilot Protocol messages to correct service agents
- MCP server topology (mcp_servers.yaml) — assumed to define external tool integrations
- NextLedger integration (docker-compose.nextledger.yml) — purpose not fully documented; assumed to be a ledger microservice
- TX-LLM service (docker-compose.tx-llm.yml) — assumed to be the native AI runtime (Ollama/Llama.cpp/vLLM)

**Any agent generating EnterpriseOS-specific code must first inspect the repository and flag unresolved assumptions.**

## Observability Requirements
Every EnterpriseOS service must expose:
- `/actuator/health` (Spring Boot) or equivalent health endpoint
- Prometheus-compatible `/actuator/prometheus` metrics
- Structured JSON logs with trace ID, tenant ID, service name
- Distributed tracing (OpenTelemetry or Spring Sleuth compatible)
- Audit log hook for all mutation operations

## Security Baseline
- JWT authentication required on all non-public endpoints
- RBAC enforced at the service layer (not only the gateway)
- All secrets via environment variables or Kubernetes secrets — never in code
- TLS termination at Caddy/ingress layer
- Network policies enforced in Kubernetes (infra/k8s/50-networkpolicy.yaml)
- No service-to-service calls bypass tenant context
