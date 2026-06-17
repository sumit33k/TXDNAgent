import type { WorkflowInput, WorkflowResult } from '../types.js';
import { AgentOrchestrator } from '../orchestrator.js';
import { securityEngineerAgent } from '../definitions/security-engineer.js';
import { codeReviewerAgent } from '../definitions/code-reviewer.js';
import { getOrchestratorConfig } from '../config.js';

export interface SecurityReviewInput {
  focusArea: string;
  filesToReview: string[];
  context?: string;
}

export async function runSecurityReviewWorkflow(
  input: SecurityReviewInput,
  orchestrator?: AgentOrchestrator
): Promise<WorkflowResult> {
  const orch = orchestrator ?? new AgentOrchestrator(getOrchestratorConfig());

  const workflowInput: WorkflowInput = {
    type: 'code-review',
    description: `Security review: ${input.focusArea}`,
    requiresApproval: true,
  };

  const steps = [
    {
      agentName: 'security-engineer',
      agent: securityEngineerAgent,
      taskPrompt: buildSecurityPrompt(input),
    },
    {
      agentName: 'code-reviewer',
      agent: codeReviewerAgent,
      taskPrompt: buildCodeReviewPrompt(input),
    },
  ];

  return orch.runWorkflow(workflowInput, steps);
}

function buildSecurityPrompt(input: SecurityReviewInput): string {
  return `You are conducting a targeted security review of TransactionDNA code.

Focus Area: ${input.focusArea}
${input.context ? `Context: ${input.context}` : ''}

Files to review:
${input.filesToReview.map(f => `- ${f}`).join('\n')}

Instructions:
1. Read EVERY listed file using read_file
2. For each file, also read related security/ package files
3. Trace all auth and tenant isolation paths end-to-end
4. Check OWASP Top 10 specifically for this focus area

Produce a complete security assessment with CRITICAL/HIGH/MEDIUM/LOW findings.
Complete the full signoff checklist.`;
}

function buildCodeReviewPrompt(input: SecurityReviewInput): string {
  return `You are performing a code correctness review supporting the security assessment.

Focus Area: ${input.focusArea}

The security assessment is in Prior Agent Outputs above.

Review the same files for:
- Correctness issues that could have security implications
- Missing error handling that could cause unexpected state
- Test coverage gaps for the security-sensitive paths
- API contract issues

Produce a code quality review that complements the security assessment.`;
}
