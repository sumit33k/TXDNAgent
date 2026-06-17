import type { WorkflowInput, WorkflowResult } from '../types.js';
import { AgentOrchestrator } from '../orchestrator.js';
import { codeReviewerAgent } from '../definitions/code-reviewer.js';
import { securityEngineerAgent } from '../definitions/security-engineer.js';
import { qaEngineerAgent } from '../definitions/qa-engineer.js';
import { devopsEngineerAgent } from '../definitions/devops-engineer.js';
import { getOrchestratorConfig } from '../config.js';

export interface CodeReviewInput {
  branch?: string;
  changedFiles: string[];
  prDescription?: string;
  featureContext?: string;
  includeMigrations?: boolean;
  includeInfraChanges?: boolean;
}

export async function runCodeReviewWorkflow(
  input: CodeReviewInput,
  orchestrator?: AgentOrchestrator
): Promise<WorkflowResult> {
  const orch = orchestrator ?? new AgentOrchestrator(getOrchestratorConfig());

  const workflowInput: WorkflowInput = {
    type: 'code-review',
    description: `Code review for: ${input.branch ?? 'provided files'}`,
    context: {
      changedFiles: input.changedFiles,
      prDescription: input.prDescription,
    },
  };

  const steps = [
    {
      agentName: 'code-reviewer',
      agent: codeReviewerAgent,
      taskPrompt: buildCodeReviewerPrompt(input),
    },
    {
      agentName: 'security-engineer',
      agent: securityEngineerAgent,
      taskPrompt: buildSecurityReviewPrompt(input),
    },
    {
      agentName: 'qa-engineer',
      agent: qaEngineerAgent,
      taskPrompt: buildQaReviewPrompt(input),
    },
    ...(input.includeInfraChanges
      ? [{
          agentName: 'devops-engineer',
          agent: devopsEngineerAgent,
          taskPrompt: buildDevOpsReviewPrompt(input),
        }]
      : []),
  ];

  return orch.runWorkflow(workflowInput, steps);
}

function buildFileList(files: string[]): string {
  return files.map(f => `- ${f}`).join('\n');
}

function buildCodeReviewerPrompt(input: CodeReviewInput): string {
  return `You are conducting a thorough code review for TransactionDNA.

${input.branch ? `Branch: ${input.branch}` : ''}
${input.prDescription ? `PR Description:\n${input.prDescription}` : ''}
${input.featureContext ? `Feature Context:\n${input.featureContext}` : ''}

Files changed:
${buildFileList(input.changedFiles)}

Instructions:
1. Read EVERY changed file using the read_file tool before commenting on it
2. For each backend file, read the corresponding entity/service/repository if relevant
3. For each frontend file, check the corresponding API type definitions
4. Check TenantContext usage on all data access paths
5. Check audit trail on all mutation paths
6. Check for alert() usage in frontend files
7. Check for pages/ imports in pages-new/ files

Produce a complete code review following your output format.
BLOCKING issues must have specific file:line references and suggested fixes.
Your final verdict must be one of: APPROVED / CONDITIONAL APPROVAL / REJECTED.`;
}

function buildSecurityReviewPrompt(input: CodeReviewInput): string {
  return `You are conducting a security review for the following code changes in TransactionDNA.

Files changed:
${buildFileList(input.changedFiles)}

The Code Reviewer's findings are in Prior Agent Outputs above.

Instructions:
1. Read all changed security-relevant files (controllers, services with auth, security/ package)
2. Specifically review: ${input.changedFiles.filter(f => f.includes('security') || f.includes('auth') || f.includes('jwt') || f.includes('jwt')).join(', ') || 'all controller and service files'}
3. Check TenantContext usage in ALL data access methods
4. Check for secrets in code or test files
5. Verify error handling doesn't expose stack traces

Complete the full security signoff checklist and provide your verdict.`;
}

function buildQaReviewPrompt(input: CodeReviewInput): string {
  return `You are reviewing test coverage for the following code changes in TransactionDNA.

Files changed:
${buildFileList(input.changedFiles)}

The Code Review and Security findings are in Prior Agent Outputs above.

Instructions:
1. Read all changed files and their corresponding test files
2. Identify what existing tests cover these changes
3. Identify what new tests are needed
4. Check if demo transactions are affected (read scripts/reseed-demo.sh if migrations are included)
5. Check for missing tenant isolation test cases

Produce a test coverage gap analysis and recommended new tests.`;
}

function buildDevOpsReviewPrompt(input: CodeReviewInput): string {
  return `You are reviewing infrastructure and deployment implications for the following code changes.

Files changed:
${buildFileList(input.changedFiles.filter(f =>
  f.includes('Dockerfile') ||
  f.includes('docker-compose') ||
  f.includes('.github/') ||
  f.includes('infra/') ||
  f.includes('helm/') ||
  f.includes('.sql')
))}

All review findings are in Prior Agent Outputs above.

Review for:
- Docker/build changes
- Kubernetes manifest changes
- CI/CD pipeline changes
- Migration safety (if .sql files are in the changeset)
- Secrets/config changes
- Rollback implications

Produce a deployment impact assessment.`;
}
