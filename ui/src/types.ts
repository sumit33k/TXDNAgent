export type WorkflowType =
  | 'feature-design'
  | 'microservice-design'
  | 'implementation-planning'
  | 'code-review'
  | 'deployment-readiness'
  | 'security-review';

export type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'awaiting-approval';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type AgentRole = 'orchestration' | 'product-management' | 'product-design' | 'ui-ux'
  | 'architecture' | 'implementation' | 'code-review' | 'security' | 'devops' | 'qa';

export interface AgentConfig {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  role: AgentRole;
  model: string;
  maxTurns: number;
  systemPromptOverride?: string;
  enabled: boolean;
  boundaries: string[];
  escalationRules: string[];
  qualityGates: string[];
}

export interface WorkflowRun {
  id: string;
  type: WorkflowType;
  status: WorkflowStatus;
  startedAt: string;
  completedAt?: string;
  input: Record<string, unknown>;
  steps: StepRun[];
  errors?: string[];
}

export interface StepRun {
  agentName: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  output?: string;
  approvalRequired?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  tokensUsed?: number;
}

export interface RiskEntry {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
  owner: string;
  workflowId: string;
  agentName: string;
  createdAt: string;
  status: 'open' | 'mitigated' | 'accepted' | 'closed';
}

export interface SystemConfig {
  orchestratorModel: string;
  specialistModel: string;
  reviewerModel: string;
  requireApprovalForWrites: boolean;
  requireApprovalForDestructive: boolean;
  enableAuditTrail: boolean;
  enableRiskRegister: boolean;
  maxAgentTurns: number;
  txdnaRepoPath: string;
  enterpriseOsRepoPath: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}
