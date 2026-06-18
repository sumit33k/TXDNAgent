import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  AgentDefinition,
  WorkflowInput,
  WorkflowResult,
  StepResult,
  AuditEntry,
  OrchestratorConfig,
} from './types.js';
import type { LlmProvider, ProviderMessage } from './llm/types.js';
import { createProvider, resolveModel } from './llm/provider-factory.js';
import { buildRepositoryContextTools, executeRepositoryTool } from './tools/repository-context.js';
import { addRisk } from './tools/risk-register.js';
import { getArchitectureContext } from './tools/architecture-map.js';
import { loadContextFiles } from './context-loader.js';

const AUDIT_LOG_PATH = path.join(process.cwd(), 'logs', 'audit-trail.jsonl');

export class AgentOrchestrator {
  private provider: LlmProvider;
  private config: OrchestratorConfig;
  private contextFiles: Record<string, string>;
  private toolDefs: ReturnType<typeof buildRepositoryContextTools>;

  constructor(config: OrchestratorConfig) {
    this.provider = createProvider(config.llmProvider);
    this.config = config;
    this.contextFiles = loadContextFiles();
    this.toolDefs = buildRepositoryContextTools();
  }

  async runWorkflow(
    input: WorkflowInput,
    steps: Array<{ agentName: string; agent: AgentDefinition; taskPrompt: string }>
  ): Promise<WorkflowResult> {
    const workflowId = randomUUID();

    const result: WorkflowResult = {
      workflowType: input.type,
      startedAt: new Date().toISOString(),
      status: 'running',
      steps: [],
    };

    const stepOutputs: Record<string, string> = { workflow_input: input.description };

    for (const step of steps) {
      const stepResult: StepResult = {
        agentName: step.agentName,
        status: 'running',
        startedAt: new Date().toISOString(),
      };
      result.steps.push(stepResult);

      try {
        const systemPrompt = this.buildSystemPrompt(step.agent);
        const userPrompt = this.buildUserPrompt(step.taskPrompt, stepOutputs);

        const output = await this.runAgent(step.agentName, systemPrompt, userPrompt, workflowId);

        stepResult.output = output;
        stepResult.status = 'completed';
        stepResult.completedAt = new Date().toISOString();
        stepOutputs[step.agentName] = output;

        this.extractAndRegisterRisks(output, workflowId, step.agentName);

        if (this.config.enableAuditTrail) {
          this.writeAuditEntry({
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            workflowId,
            agentName: step.agentName,
            action: `workflow-step:${input.type}`,
            input: userPrompt.slice(0, 500),
            output: output.slice(0, 1000),
          });
        }

        if (this.outputRequiresApproval(output) && this.config.requireApprovalForWrites) {
          stepResult.approvalRequired = true;
          stepResult.approvalStatus = 'pending';
          result.status = 'awaiting-approval';
        }
      } catch (err) {
        stepResult.status = 'failed';
        stepResult.completedAt = new Date().toISOString();
        stepResult.output = `Error: ${err instanceof Error ? err.message : String(err)}`;
        result.errors = result.errors ?? [];
        result.errors.push(`${step.agentName}: ${stepResult.output}`);
      }
    }

    result.completedAt = new Date().toISOString();
    result.status = result.errors?.length ? 'failed' : 'completed';
    return result;
  }

  async runAgent(
    agentName: string,
    systemPrompt: string,
    userPrompt: string,
    _workflowId: string
  ): Promise<string> {
    const model = resolveModel(agentName, this.provider, {
      orchestrator: this.config.orchestratorModel,
      specialist: this.config.specialistModel,
      reviewer: this.config.reviewerModel,
    });

    // When the provider doesn't support tool use, inject repository context
    // into the system prompt so the agent still has structural awareness.
    const effectiveSystem = this.provider.supportsToolUse
      ? systemPrompt
      : systemPrompt + '\n\n' + this.buildNoToolFallbackContext();

    const messages: ProviderMessage[] = [{ role: 'user', content: userPrompt }];
    const maxTurns = parseInt(process.env.MAX_AGENT_TURNS ?? '20', 10);
    let fullOutput = '';

    for (let turn = 0; turn < maxTurns; turn++) {
      const response = await this.provider.sendMessage({
        model,
        system: effectiveSystem,
        messages,
        tools: this.provider.supportsToolUse ? this.toolDefs : [],
        maxTokens: 8096,
      });

      if (response.text) fullOutput += response.text;

      if (response.stopReason === 'end_turn') break;

      if (response.stopReason === 'tool_use' && response.toolCalls.length > 0) {
        messages.push(response.assistantMessage);

        const toolResults = response.toolCalls.map(tc => ({
          toolUseId: tc.id,
          content: executeRepositoryTool(tc.name, tc.input),
        }));

        messages.push(this.provider.buildToolResultMessage(toolResults));
        continue;
      }

      break;
    }

    return fullOutput;
  }

  /** Context injected into system prompt when tool use is disabled (e.g. small local models). */
  private buildNoToolFallbackContext(): string {
    return [
      '## Repository Context (pre-loaded — tool use not available for this model)',
      getArchitectureContext(),
      '',
      '> Note: You cannot call repository tools directly. Reference the architecture map above',
      '> and ask the user to provide specific file contents if needed.',
    ].join('\n');
  }

  private buildSystemPrompt(agent: AgentDefinition): string {
    const ctx = this.contextFiles;
    return [
      agent.systemPrompt,
      '',
      '---',
      '## Platform Context',
      ctx['transaction-dna-context'] ?? '',
      '',
      ctx['enterpriseos-context'] ?? '',
      '',
      ctx['shared-engineering-rules'] ?? '',
      '',
      '---',
      getArchitectureContext(),
    ].join('\n');
  }

  private buildUserPrompt(taskPrompt: string, priorOutputs: Record<string, string>): string {
    const priorContext = Object.entries(priorOutputs)
      .filter(([k]) => k !== 'workflow_input')
      .map(([k, v]) => `### Output from ${k}:\n${v.slice(0, 3000)}`)
      .join('\n\n');

    return [
      `## Task\n${taskPrompt}`,
      priorContext ? `\n## Prior Agent Outputs\n${priorContext}` : '',
    ].filter(Boolean).join('\n\n');
  }

  private outputRequiresApproval(output: string): boolean {
    return output.includes('[REQUIRES HUMAN APPROVAL]') || output.includes('[REQUIRES HUMAN ACTION NOW]');
  }

  private extractAndRegisterRisks(output: string, workflowId: string, agentName: string): void {
    if (!this.config.enableRiskRegister) return;

    const risks = [
      ...[...output.matchAll(/\[RISK\]\s+(.+?)(?=\[|$)/gs)].map(m => ({
        severity: 'medium' as const,
        description: m[1].trim().slice(0, 200),
        mitigation: 'Review and mitigate',
        owner: agentName,
      })),
      ...[...output.matchAll(/CRITICAL[:\s]+(.+?)(?=\n\n|\n#|$)/gs)].map(m => ({
        severity: 'critical' as const,
        description: m[1].trim().slice(0, 200),
        mitigation: 'Immediate human review required',
        owner: agentName,
      })),
    ];

    risks.forEach(r => addRisk(r, workflowId, agentName));
  }

  private writeAuditEntry(entry: AuditEntry): void {
    const dir = path.dirname(AUDIT_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n');
  }
}
