import type { OrchestratorConfig } from './types.js';

export function getOrchestratorConfig(): OrchestratorConfig {
  return {
    orchestratorModel: process.env.ORCHESTRATOR_MODEL ?? 'claude-opus-4-8',
    specialistModel: process.env.SPECIALIST_MODEL ?? 'claude-sonnet-4-6',
    reviewerModel: process.env.REVIEWER_MODEL ?? 'claude-sonnet-4-6',
    maxWorkflowDurationMs: parseInt(process.env.MAX_WORKFLOW_DURATION_MS ?? '300000', 10),
    requireApprovalForWrites: process.env.REQUIRE_APPROVAL_FOR_WRITES !== 'false',
    requireApprovalForDestructive: process.env.REQUIRE_APPROVAL_FOR_DESTRUCTIVE !== 'false',
    enableAuditTrail: process.env.ENABLE_AUDIT_TRAIL !== 'false',
    enableRiskRegister: process.env.ENABLE_RISK_REGISTER !== 'false',
    repoPath: process.env.TXDNA_REPO_PATH,
  };
}
