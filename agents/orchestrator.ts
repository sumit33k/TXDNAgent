import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  AgentDefinition,
  AgentRunConfig,
  WorkflowInput,
  WorkflowResult,
  StepResult,
  AuditEntry,
  OrchestratorConfig,
} from './types.js';
import { buildRepositoryContextTools, executeRepositoryTool } from './tools/repository-context.js';
import { addRisk } from './tools/risk-register.js';
import { getArchitectureContext } from './tools/architecture-map.js';
import { loadContextFiles } from './context-loader.js';

const AUDIT_LOG_PATH = path.join(process.cwd(), 'logs', 'audit-trail.jsonl');

export class AgentOrchestrator {
  private client: Anthropic;
  private config: OrchestratorConfig;
  private contextFiles: Record<string, string>;
  private tools: Anthropic.Tool[];

  constructor(config: OrchestratorConfig) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.config = config;
    this.contextFiles = loadContextFiles();
    this.tools = buildRepositoryContextTools() as Anthropic.Tool[];
  }

  async runWorkflow(
    input: WorkflowInput,
    steps: Array<{ agentName: string; agent: AgentDefinition; taskPrompt: string }>
  ): Promise<WorkflowResult> {
    const workflowId = randomUUID();
    const startedAt = new Date().toISOString();

    const result: WorkflowResult = {
      workflowType: input.type,
      startedAt,
      status: 'running',
      steps: [],
    };

    const stepOutputs: Record<string, string> = {};
    stepOutputs['workflow_input'] = input.description;

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

        const output = await this.runAgent(
          step.agentName,
          systemPrompt,
          userPrompt,
          workflowId
        );

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
    workflowId: string
  ): Promise<string> {
    const model = this.selectModel(agentName);
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userPrompt },
    ];

    let fullOutput = '';
    const maxTurns = parseInt(process.env.MAX_AGENT_TURNS ?? '20', 10);

    for (let turn = 0; turn < maxTurns; turn++) {
      const response = await this.client.messages.create({
        model,
        max_tokens: 8096,
        system: systemPrompt,
        tools: this.tools,
        messages,
      });

      const textParts = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text);

      if (textParts.length > 0) {
        fullOutput += textParts.join('\n');
      }

      if (response.stop_reason === 'end_turn') break;

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        );

        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(tu => ({
          type: 'tool_result' as const,
          tool_use_id: tu.id,
          content: executeRepositoryTool(tu.name, tu.input as Record<string, unknown>),
        }));

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      break;
    }

    return fullOutput;
  }

  private buildSystemPrompt(agent: AgentDefinition): string {
    const contextMd = this.contextFiles;
    return [
      agent.systemPrompt,
      '',
      '---',
      '## Platform Context',
      contextMd['transaction-dna-context'] ?? '',
      '',
      contextMd['enterpriseos-context'] ?? '',
      '',
      contextMd['shared-engineering-rules'] ?? '',
      '',
      '---',
      getArchitectureContext(),
    ].join('\n');
  }

  private buildUserPrompt(
    taskPrompt: string,
    priorOutputs: Record<string, string>
  ): string {
    const priorContext = Object.entries(priorOutputs)
      .filter(([k]) => k !== 'workflow_input')
      .map(([k, v]) => `### Output from ${k}:\n${v.slice(0, 3000)}`)
      .join('\n\n');

    return [
      `## Task\n${taskPrompt}`,
      priorContext ? `\n## Prior Agent Outputs\n${priorContext}` : '',
    ].filter(Boolean).join('\n\n');
  }

  private selectModel(agentName: string): string {
    if (agentName === 'engineering-orchestrator') {
      return this.config.orchestratorModel;
    }
    if (agentName === 'code-reviewer' || agentName === 'security-engineer') {
      return this.config.reviewerModel;
    }
    return this.config.specialistModel;
  }

  private outputRequiresApproval(output: string): boolean {
    return output.includes('[REQUIRES HUMAN APPROVAL]') ||
      output.includes('[REQUIRES HUMAN ACTION NOW]');
  }

  private extractAndRegisterRisks(
    output: string,
    workflowId: string,
    agentName: string
  ): void {
    if (!this.config.enableRiskRegister) return;

    const riskPattern = /\[RISK\]\s+(.+?)(?=\[|$)/gs;
    const criticalPattern = /CRITICAL[:\s]+(.+?)(?=\n\n|\n#|$)/gs;

    const risks = [
      ...[...output.matchAll(riskPattern)].map(m => ({
        severity: 'medium' as const,
        description: m[1].trim().slice(0, 200),
        mitigation: 'Review and mitigate',
        owner: agentName,
      })),
      ...[...output.matchAll(criticalPattern)].map(m => ({
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
