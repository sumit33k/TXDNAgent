#!/usr/bin/env node
/**
 * REST API server that bridges the Admin UI to the agent framework.
 * Start with: tsx server.ts
 * Default port: 3721
 */
import 'dotenv/config';
import http from 'http';
import { randomUUID } from 'crypto';
import type { WorkflowRun, WorkflowType, AgentDefinition } from './agents/types.js';
import { productManagerAgent } from './agents/definitions/product-manager.js';
import { productDesignerAgent } from './agents/definitions/product-designer.js';
import { uiUxExpertAgent } from './agents/definitions/ui-ux-expert.js';
import { microserviceArchitectAgent } from './agents/definitions/microservice-architect.js';
import { seniorDeveloperAgent } from './agents/definitions/senior-developer.js';
import { codeReviewerAgent } from './agents/definitions/code-reviewer.js';
import { securityEngineerAgent } from './agents/definitions/security-engineer.js';
import { devopsEngineerAgent } from './agents/definitions/devops-engineer.js';
import { qaEngineerAgent } from './agents/definitions/qa-engineer.js';
import { runFeatureDesignWorkflow } from './agents/workflows/feature-design-workflow.js';
import { runMicroserviceDesignWorkflow } from './agents/workflows/microservice-design-workflow.js';
import { runCodeReviewWorkflow } from './agents/workflows/code-review-workflow.js';
import { runDeploymentReadinessWorkflow } from './agents/workflows/deployment-readiness-workflow.js';
import { runImplementationPlanningWorkflow } from './agents/workflows/implementation-planning-workflow.js';
import { runSecurityReviewWorkflow } from './agents/workflows/security-review-workflow.js';
import { loadRiskRegister } from './agents/tools/risk-register.js';
import { getOrchestratorConfig } from './agents/config.js';

// ── In-memory state (use a real DB in production) ────────────────────────────
const agentConfigOverrides = new Map<string, Record<string, unknown>>();
const runs = new Map<string, WorkflowRun>();
let systemConfig = getOrchestratorConfig();

const AGENT_DEFINITIONS = [
  productManagerAgent, productDesignerAgent, uiUxExpertAgent,
  microserviceArchitectAgent, seniorDeveloperAgent, codeReviewerAgent,
  securityEngineerAgent, devopsEngineerAgent, qaEngineerAgent,
];

interface SerializedAgentConfig {
  name: string; displayName: string; description: string; icon: string; role: string;
  model: string; maxTurns: number; systemPromptOverride?: string; enabled: boolean;
  boundaries: string[]; escalationRules: string[]; qualityGates: string[];
}
function buildAgentConfig(def: AgentDefinition): SerializedAgentConfig {
  const override = agentConfigOverrides.get(def.name) ?? {};
  return {
    name: def.name, displayName: def.displayName, description: def.description,
    icon: def.icon, role: def.role,
    model: (override as { model?: string }).model ?? systemConfig.specialistModel,
    maxTurns: (override as { maxTurns?: number }).maxTurns ?? 20,
    systemPromptOverride: (override as { systemPromptOverride?: string }).systemPromptOverride,
    enabled: (override as { enabled?: boolean }).enabled ?? true,
    boundaries: def.boundaries, escalationRules: def.escalationRules, qualityGates: def.qualityGates,
  };
}

// ── Request routing ───────────────────────────────────────────────────────────
function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Invalid JSON')); }
    });
  });
}

function respond(res: http.ServerResponse, status: number, body: unknown) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(json);
}

const PORT = parseInt(process.env.AGENT_API_PORT ?? '3721', 10);

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? 'GET';

  try {
    // GET /api/agents
    if (method === 'GET' && path === '/api/agents') {
      return respond(res, 200, AGENT_DEFINITIONS.map(buildAgentConfig));
    }

    // GET /api/agents/:name
    if (method === 'GET' && path.startsWith('/api/agents/')) {
      const name = path.slice('/api/agents/'.length);
      const def = AGENT_DEFINITIONS.find(a => a.name === name);
      if (!def) return respond(res, 404, { error: 'Agent not found' });
      return respond(res, 200, buildAgentConfig(def));
    }

    // PATCH /api/agents/:name
    if (method === 'PATCH' && path.startsWith('/api/agents/')) {
      const name = path.slice('/api/agents/'.length);
      const def = AGENT_DEFINITIONS.find(a => a.name === name);
      if (!def) return respond(res, 404, { error: 'Agent not found' });
      const body = await parseBody(req) as Record<string, unknown>;
      agentConfigOverrides.set(name, { ...(agentConfigOverrides.get(name) ?? {}), ...body });
      return respond(res, 200, buildAgentConfig(def));
    }

    // POST /api/agents/:name/reset-prompt
    if (method === 'POST' && path.endsWith('/reset-prompt')) {
      const name = path.slice('/api/agents/'.length).replace('/reset-prompt', '');
      const existing = agentConfigOverrides.get(name) ?? {};
      delete (existing as Record<string, unknown>)['systemPromptOverride'];
      agentConfigOverrides.set(name, existing);
      const def = AGENT_DEFINITIONS.find(a => a.name === name);
      if (!def) return respond(res, 404, { error: 'Agent not found' });
      return respond(res, 200, buildAgentConfig(def));
    }

    // GET /api/workflows
    if (method === 'GET' && path === '/api/workflows') {
      return respond(res, 200, Array.from(runs.values()).sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      ));
    }

    // GET /api/workflows/:id
    if (method === 'GET' && path.startsWith('/api/workflows/')) {
      const id = path.slice('/api/workflows/'.length);
      const run = runs.get(id);
      if (!run) return respond(res, 404, { error: 'Run not found' });
      return respond(res, 200, run);
    }

    // POST /api/workflows/run
    if (method === 'POST' && path === '/api/workflows/run') {
      const body = await parseBody(req) as { type: WorkflowType; input: Record<string, unknown> };
      const runId = randomUUID();

      const run: WorkflowRun = {
        id: runId,
        type: body.type,
        status: 'running',
        startedAt: new Date().toISOString(),
        input: body.input,
        steps: [],
      };
      runs.set(runId, run);

      // Fire and forget — client polls for updates
      void (async () => {
        try {
          let result;
          const input = body.input;
          switch (body.type) {
            case 'feature-design':
              result = await runFeatureDesignWorkflow(input as never);
              break;
            case 'microservice-design':
              result = await runMicroserviceDesignWorkflow(input as never);
              break;
            case 'code-review':
              result = await runCodeReviewWorkflow(input as never);
              break;
            case 'deployment-readiness':
              result = await runDeploymentReadinessWorkflow(input as never);
              break;
            case 'implementation-planning':
              result = await runImplementationPlanningWorkflow(input as never);
              break;
            case 'security-review':
              result = await runSecurityReviewWorkflow(input as never);
              break;
            default:
              throw new Error(`Unknown workflow type: ${body.type}`);
          }
          runs.set(runId, { ...run, ...result, id: runId });
        } catch (err) {
          runs.set(runId, {
            ...run,
            status: 'failed',
            completedAt: new Date().toISOString(),
            errors: [err instanceof Error ? err.message : String(err)],
          });
        }
      })();

      return respond(res, 202, run);
    }

    // GET /api/risks
    if (method === 'GET' && path === '/api/risks') {
      return respond(res, 200, loadRiskRegister());
    }

    // GET /api/config
    if (method === 'GET' && path === '/api/config') {
      return respond(res, 200, {
        orchestratorModel: systemConfig.orchestratorModel,
        specialistModel: systemConfig.specialistModel,
        reviewerModel: systemConfig.reviewerModel,
        requireApprovalForWrites: systemConfig.requireApprovalForWrites,
        requireApprovalForDestructive: systemConfig.requireApprovalForDestructive,
        enableAuditTrail: systemConfig.enableAuditTrail,
        enableRiskRegister: systemConfig.enableRiskRegister,
        maxAgentTurns: parseInt(process.env.MAX_AGENT_TURNS ?? '20', 10),
        txdnaRepoPath: process.env.TXDNA_REPO_PATH ?? '',
        enterpriseOsRepoPath: process.env.ENTERPRISEOS_REPO_PATH ?? '',
      });
    }

    // PATCH /api/config
    if (method === 'PATCH' && path === '/api/config') {
      const body = await parseBody(req) as Partial<typeof systemConfig>;
      systemConfig = { ...systemConfig, ...body };
      return respond(res, 200, systemConfig);
    }

    respond(res, 404, { error: 'Not found' });
  } catch (err) {
    respond(res, 500, { error: err instanceof Error ? err.message : 'Internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`\n🤖 TransactionDNA Agent API running on http://localhost:${PORT}`);
  console.log(`   Admin UI:  http://localhost:3720`);
  console.log(`   Audit log: logs/audit-trail.jsonl`);
  console.log(`   Risk log:  logs/risk-register.json\n`);
});
