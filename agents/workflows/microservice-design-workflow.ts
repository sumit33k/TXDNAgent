import type { WorkflowInput, WorkflowResult } from '../types.js';
import { AgentOrchestrator } from '../orchestrator.js';
import { microserviceArchitectAgent } from '../definitions/microservice-architect.js';
import { seniorDeveloperAgent } from '../definitions/senior-developer.js';
import { securityEngineerAgent } from '../definitions/security-engineer.js';
import { devopsEngineerAgent } from '../definitions/devops-engineer.js';
import { qaEngineerAgent } from '../definitions/qa-engineer.js';
import { getOrchestratorConfig } from '../config.js';

export interface MicroserviceDesignInput {
  businessCapability: string;
  domainContext: string;
  existingServices?: string[];
  constraints?: string[];
}

export async function runMicroserviceDesignWorkflow(
  input: MicroserviceDesignInput,
  orchestrator?: AgentOrchestrator
): Promise<WorkflowResult> {
  const orch = orchestrator ?? new AgentOrchestrator(getOrchestratorConfig());

  const workflowInput: WorkflowInput = {
    type: 'microservice-design',
    description: input.businessCapability,
    context: { domainContext: input.domainContext },
  };

  const steps = [
    {
      agentName: 'microservice-architect',
      agent: microserviceArchitectAgent,
      taskPrompt: buildArchitectPrompt(input),
    },
    {
      agentName: 'senior-developer',
      agent: seniorDeveloperAgent,
      taskPrompt: buildDeveloperPrompt(input),
    },
    {
      agentName: 'security-engineer',
      agent: securityEngineerAgent,
      taskPrompt: buildSecurityPrompt(input),
    },
    {
      agentName: 'devops-engineer',
      agent: devopsEngineerAgent,
      taskPrompt: buildDevOpsPrompt(input),
    },
    {
      agentName: 'qa-engineer',
      agent: qaEngineerAgent,
      taskPrompt: buildQaPrompt(input),
    },
  ];

  return orch.runWorkflow(workflowInput, steps);
}

function buildArchitectPrompt(input: MicroserviceDesignInput): string {
  return `You are designing a new microservice for TransactionDNA / EnterpriseOS.

Business Capability: "${input.businessCapability}"
Domain Context: "${input.domainContext}"
${input.existingServices ? `Existing Services: ${input.existingServices.join(', ')}` : ''}
${input.constraints ? `Constraints: ${input.constraints.join(', ')}` : ''}

Before designing:
1. Use list_directory to inspect backend/src/main/java/com/txdna/service/ for existing services
2. Use read_file on the DomainExecutionRouter to understand domain routing
3. Use get_latest_flyway_version for current migration version
4. Use list_directory on infra/k8s/ to understand existing Kubernetes setup
5. Use list_directory on helm/ to understand existing Helm chart structure

Produce a complete microservice design including:
- Bounded context and service name
- Service responsibilities (what it does, what it explicitly does NOT do)
- REST API design (versioned, documented)
- Async event contracts
- Database ownership (Flyway migration V-number plan)
- Tenancy model
- Auth model
- Deployment model
- Observability requirements
- Migration strategy from current state
- Anti-patterns explicitly avoided
- Compatibility with DomainExecutionRouter`;
}

function buildDeveloperPrompt(input: MicroserviceDesignInput): string {
  return `You are reviewing the microservice architecture design for implementability.

Business Capability: "${input.businessCapability}"

The Microservice Architect's design is in Prior Agent Outputs above.

Review the design for:
1. Implementation feasibility with the current Spring Boot stack
2. Correct Flyway migration numbering (verify with get_latest_flyway_version)
3. Proper use of existing patterns (check service/ and controller/ directories)
4. Frontend contract implications (if any)

Produce an implementation feasibility assessment with:
- Feasibility verdict per component
- Implementation risks and complexity estimates
- Suggested implementation order (what to build first)
- Dependencies on existing code
- Files that will need to be created or modified`;
}

function buildSecurityPrompt(input: MicroserviceDesignInput): string {
  return `You are conducting a security design review for a new microservice.

Business Capability: "${input.businessCapability}"

The architecture design is in Prior Agent Outputs above.

Review the design for:
- Tenant isolation in the service boundary
- Auth/JWT requirements
- API security (input validation, rate limiting)
- Secrets management
- Service-to-service auth
- Audit hooks
- OWASP API Security Top 10

Produce a security design assessment with the full signoff checklist and any BLOCKING issues.`;
}

function buildDevOpsPrompt(input: MicroserviceDesignInput): string {
  return `You are reviewing the deployment model for a new microservice.

Business Capability: "${input.businessCapability}"

The architecture design is in Prior Agent Outputs above.

Before reviewing:
1. Use list_directory on infra/k8s/ to see existing manifests
2. Use list_directory on helm/ to see existing Helm charts
3. Use list_directory on .github/workflows/ to see CI/CD pipelines

Produce a deployment readiness plan including:
- Kubernetes manifest requirements (new manifests needed)
- Helm chart requirements (new chart or values addition)
- CI/CD pipeline changes required
- Secrets/config requirements
- Health check / readiness probe specification
- Resource limits and HPA configuration
- Rollback plan`;
}

function buildQaPrompt(input: MicroserviceDesignInput): string {
  return `You are defining the testing strategy for a new microservice.

Business Capability: "${input.businessCapability}"

The full design (architecture, implementation feasibility, security, devops) is in Prior Agent Outputs above.

Produce a comprehensive testing strategy including:
- Unit test strategy (service layer, event handlers)
- Integration test strategy (API-level, H2 database)
- Contract testing (if async events are involved)
- Tenant isolation test cases
- Performance test plan (load targets)
- Migration test cases
- Smoke tests for post-deployment validation`;
}
