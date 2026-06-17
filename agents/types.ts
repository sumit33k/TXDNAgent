export interface AgentDefinition {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  role: AgentRole;
  systemPrompt: string;
  allowedTools: string[];
  boundaries: string[];
  escalationRules: string[];
  qualityGates: string[];
}

export type AgentRole =
  | 'orchestration'
  | 'product-management'
  | 'product-design'
  | 'ui-ux'
  | 'architecture'
  | 'implementation'
  | 'code-review'
  | 'security'
  | 'devops'
  | 'qa';

export type WorkflowType =
  | 'feature-design'
  | 'microservice-design'
  | 'implementation-planning'
  | 'code-review'
  | 'deployment-readiness'
  | 'security-review';

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

export type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'awaiting-approval';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowInput {
  type: WorkflowType;
  description: string;
  context?: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface WorkflowStep {
  agentName: string;
  taskDescription: string;
  inputs: Record<string, unknown>;
  dependsOn?: string[];
  requiresApproval?: boolean;
}

export interface WorkflowResult {
  workflowType: WorkflowType;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'awaiting-approval';
  steps: StepResult[];
  finalOutput?: WorkflowOutput;
  errors?: string[];
}

export interface StepResult {
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  output?: string;
  approvalRequired?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  tokensUsed?: number;
}

export interface WorkflowOutput {
  summary: string;
  artifacts: Artifact[];
  approvalGates: ApprovalGate[];
  risks: Risk[];
  nextSteps: string[];
}

export interface Artifact {
  type: 'spec' | 'design' | 'code' | 'test' | 'review' | 'deployment-plan' | 'security-report';
  title: string;
  content: string;
  agentAuthor: string;
  requiresReview?: boolean;
}

export interface ApprovalGate {
  description: string;
  requiredBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Risk {
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
  owner: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentRunConfig {
  model: string;
  maxTokens?: number;
  maxTurns?: number;
  systemPrompt: string;
  tools?: AnthropicTool[];
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AgentConfig {
  definition: AgentDefinition;
  runConfig: AgentRunConfig;
}

export interface OrchestratorConfig {
  orchestratorModel: string;
  specialistModel: string;
  reviewerModel: string;
  maxWorkflowDurationMs: number;
  requireApprovalForWrites: boolean;
  requireApprovalForDestructive: boolean;
  enableAuditTrail: boolean;
  enableRiskRegister: boolean;
  repoPath?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  workflowId: string;
  agentName: string;
  action: string;
  input?: string;
  output?: string;
  tokensUsed?: number;
  durationMs?: number;
}
