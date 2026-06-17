import type { WorkflowInput, WorkflowResult } from '../types.js';
import { AgentOrchestrator } from '../orchestrator.js';
import { devopsEngineerAgent } from '../definitions/devops-engineer.js';
import { securityEngineerAgent } from '../definitions/security-engineer.js';
import { qaEngineerAgent } from '../definitions/qa-engineer.js';
import { microserviceArchitectAgent } from '../definitions/microservice-architect.js';
import { getOrchestratorConfig } from '../config.js';

export interface DeploymentReadinessInput {
  branch: string;
  targetEnvironment: 'staging' | 'production';
  changedServices?: string[];
  migrationFiles?: string[];
  releaseNotes?: string;
  rollbackBranch?: string;
}

export async function runDeploymentReadinessWorkflow(
  input: DeploymentReadinessInput,
  orchestrator?: AgentOrchestrator
): Promise<WorkflowResult> {
  const orch = orchestrator ?? new AgentOrchestrator(getOrchestratorConfig());

  const workflowInput: WorkflowInput = {
    type: 'deployment-readiness',
    description: `Deployment readiness for ${input.branch} → ${input.targetEnvironment}`,
    requiresApproval: input.targetEnvironment === 'production',
    context: {
      branch: input.branch,
      environment: input.targetEnvironment,
    },
  };

  const steps = [
    {
      agentName: 'devops-engineer',
      agent: devopsEngineerAgent,
      taskPrompt: buildDevOpsPrompt(input),
    },
    {
      agentName: 'security-engineer',
      agent: securityEngineerAgent,
      taskPrompt: buildSecurityPrompt(input),
    },
    {
      agentName: 'qa-engineer',
      agent: qaEngineerAgent,
      taskPrompt: buildQaPrompt(input),
    },
    {
      agentName: 'microservice-architect',
      agent: microserviceArchitectAgent,
      taskPrompt: buildArchitectPrompt(input),
    },
  ];

  return orch.runWorkflow(workflowInput, steps);
}

function buildDevOpsPrompt(input: DeploymentReadinessInput): string {
  return `You are conducting a deployment readiness assessment for TransactionDNA.

Branch: ${input.branch}
Target Environment: ${input.targetEnvironment}
${input.changedServices ? `Changed Services: ${input.changedServices.join(', ')}` : ''}
${input.migrationFiles ? `Migration Files: ${input.migrationFiles.join(', ')}` : ''}
${input.releaseNotes ? `Release Notes:\n${input.releaseNotes}` : ''}
${input.rollbackBranch ? `Rollback Branch: ${input.rollbackBranch}` : ''}

Instructions:
1. Use list_directory on infra/k8s/ to check Kubernetes manifests
2. Use list_directory on helm/ to check Helm values
3. Use list_directory on .github/workflows/ to verify CI/CD state
4. If migration files are listed, use read_file on each to check SQL safety
5. Use get_latest_flyway_version to verify migration ordering

${input.targetEnvironment === 'production' ? '⚠️ This is a PRODUCTION deployment. All [REQUIRES HUMAN APPROVAL] items must be explicitly resolved before proceeding.' : ''}

Produce a complete deployment readiness report including:
- Build readiness
- Migration readiness (with destructive operation flags)
- Secrets/config readiness
- Kubernetes/Helm readiness
- Terraform impact assessment
- Rollback plan (exact commands)
- Smoke test list
- Release checklist`;
}

function buildSecurityPrompt(input: DeploymentReadinessInput): string {
  return `You are conducting a pre-deployment security assessment for TransactionDNA.

Branch: ${input.branch}
Target Environment: ${input.targetEnvironment}

The DevOps readiness report is in Prior Agent Outputs above.

Instructions:
1. Review any secrets/config changes flagged by DevOps
2. Review migration files for security implications (${input.migrationFiles?.join(', ') ?? 'none listed'})
3. Verify RBAC has not changed in ways that elevate permissions unexpectedly
4. Check for any new API endpoints that bypass tenant isolation

${input.targetEnvironment === 'production' ? 'This is a PRODUCTION deployment — all security findings are BLOCKING.' : ''}

Complete the security signoff checklist and produce a pre-deployment security verdict.`;
}

function buildQaPrompt(input: DeploymentReadinessInput): string {
  return `You are defining pre-deployment QA validation for TransactionDNA.

Branch: ${input.branch}
Target Environment: ${input.targetEnvironment}

The DevOps and Security assessments are in Prior Agent Outputs above.

Define:
1. Smoke test suite (exact HTTP calls with expected responses)
2. Regression check list (what manual or automated checks to run)
3. Demo data validation (run scripts/reseed-demo.sh? or verify demo transactions remain valid)
4. Post-migration data integrity checks
5. Go/No-go criteria (what must be true before proceeding)

Format smoke tests as:
\`\`\`
GET /api/health → 200
GET /api/v1/transactions?tenantId=demo → 200, non-empty data
\`\`\``;
}

function buildArchitectPrompt(input: DeploymentReadinessInput): string {
  return `You are conducting an architecture compatibility review for a TransactionDNA deployment.

Branch: ${input.branch}
Target Environment: ${input.targetEnvironment}
${input.changedServices ? `Changed Services: ${input.changedServices.join(', ')}` : ''}

The DevOps, Security, and QA assessments are in Prior Agent Outputs above.

Review for:
1. Breaking API contract changes (check controller files for removed/changed endpoints)
2. Database schema changes that could cause backward-incompatibility
3. Event schema changes that could break consumers
4. DomainExecutionRouter compatibility (verify the router still handles all domains)
5. Distributed monolith risks in the deployment (shared database access, synchronous coupling)

Produce an architecture compatibility assessment and flag any [REQUIRES HUMAN APPROVAL] architectural concerns.`;
}
