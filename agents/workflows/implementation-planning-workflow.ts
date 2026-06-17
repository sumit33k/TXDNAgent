import type { WorkflowInput, WorkflowResult } from '../types.js';
import { AgentOrchestrator } from '../orchestrator.js';
import { seniorDeveloperAgent } from '../definitions/senior-developer.js';
import { uiUxExpertAgent } from '../definitions/ui-ux-expert.js';
import { securityEngineerAgent } from '../definitions/security-engineer.js';
import { qaEngineerAgent } from '../definitions/qa-engineer.js';
import { getOrchestratorConfig } from '../config.js';

export interface ImplementationPlanningInput {
  approvedSpec: string;
  architectureDecisions?: string;
  targetBranch?: string;
  constraints?: string[];
}

export async function runImplementationPlanningWorkflow(
  input: ImplementationPlanningInput,
  orchestrator?: AgentOrchestrator
): Promise<WorkflowResult> {
  const orch = orchestrator ?? new AgentOrchestrator(getOrchestratorConfig());

  const workflowInput: WorkflowInput = {
    type: 'implementation-planning',
    description: `Implementation plan for approved spec`,
  };

  const steps = [
    {
      agentName: 'senior-developer',
      agent: seniorDeveloperAgent,
      taskPrompt: buildDeveloperPrompt(input),
    },
    {
      agentName: 'ui-ux-expert',
      agent: uiUxExpertAgent,
      taskPrompt: buildUiUxPrompt(input),
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
  ];

  return orch.runWorkflow(workflowInput, steps);
}

function buildDeveloperPrompt(input: ImplementationPlanningInput): string {
  return `You are creating an implementation plan for an approved TransactionDNA feature.

Approved Spec:
${input.approvedSpec}

${input.architectureDecisions ? `Architecture Decisions:\n${input.architectureDecisions}` : ''}
${input.targetBranch ? `Target Branch: ${input.targetBranch}` : ''}
${input.constraints ? `Constraints: ${input.constraints.join(', ')}` : ''}

Instructions:
1. Use list_directory on backend/src/main/java/com/txdna/ to identify files to modify
2. Use list_directory on frontend/src/pages-new/ and frontend/src/components/
3. Use get_latest_flyway_version to plan migration numbering
4. Use search_files to find files that must be inspected before modification
5. Read the top 3-5 most relevant existing files to understand patterns

Produce a precise implementation plan with:
- **Exact files to inspect** (must read before touching)
- **Exact files to modify** (path + what changes)
- **Exact files to create** (path + purpose)
- **Backend changes** (controller/service/entity/migration — specific methods)
- **Frontend changes** (component/page/hook/service — specific props/state changes)
- **Migration changes** (V### filename, H2+PostgreSQL SQL, rollback migration)
- **Tests to add/update** (specific test class/file + test cases)
- **Risk checklist** ([RISK] tagged with severity)
- **Rollback plan** (step by step)
- **Approval gates** ([REQUIRES HUMAN APPROVAL] items)
- **Estimated story points** (1/2/3/5/8 scale)`;
}

function buildUiUxPrompt(input: ImplementationPlanningInput): string {
  return `You are producing the frontend implementation guide for an approved TransactionDNA feature.

Approved Spec:
${input.approvedSpec}

The backend implementation plan is in Prior Agent Outputs above.

Instructions:
1. Use list_directory on frontend/src/components/ to find reusable components
2. Use search_files for the toast notification system (search "toast" in frontend/)
3. Read the 2-3 most similar existing page components in pages-new/

Produce:
- Component hierarchy for this feature
- For each new component: TypeScript interface, state management, API integration, error/loading states
- For each modified component: exactly what changes and why
- CSS/Tailwind notes (use existing classes and patterns)
- Accessibility checklist
- Integration with backend API contracts from the Developer plan`;
}

function buildSecurityPrompt(input: ImplementationPlanningInput): string {
  return `You are reviewing the implementation plan for security correctness.

Approved Spec:
${input.approvedSpec}

The implementation plan (backend + frontend) is in Prior Agent Outputs above.

Verify:
1. Every new endpoint has tenant isolation documented
2. Every mutation has an audit trail in the plan
3. No frontend-only role enforcement in the UI plan
4. No secrets in planned code changes
5. Migration files don't expose sensitive data
6. New features with AI components keep Graph AI advisory-only

Complete the security implementation checklist and flag any BLOCKING issues that must be resolved in the plan before coding begins.`;
}

function buildQaPrompt(input: ImplementationPlanningInput): string {
  return `You are defining the test implementation plan for an approved TransactionDNA feature.

Approved Spec:
${input.approvedSpec}

The full implementation plan (backend, frontend, security) is in Prior Agent Outputs above.

Produce a concrete test implementation plan:
- For each new service method: specific unit test cases (file path, test method name, Given/When/Then)
- For each new controller endpoint: specific integration test cases
- For each new frontend component: Vitest test cases
- Regression tests to add (what existing tests to run, what new regression tests to write)
- Migration tests (pre/post data validation queries)
- Demo data protection verification steps
- Test data requirements (seed fixtures needed)`;
}
