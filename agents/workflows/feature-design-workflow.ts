import type { WorkflowInput, WorkflowResult } from '../types.js';
import { AgentOrchestrator } from '../orchestrator.js';
import { productManagerAgent } from '../definitions/product-manager.js';
import { productDesignerAgent } from '../definitions/product-designer.js';
import { uiUxExpertAgent } from '../definitions/ui-ux-expert.js';
import { microserviceArchitectAgent } from '../definitions/microservice-architect.js';
import { securityEngineerAgent } from '../definitions/security-engineer.js';
import { qaEngineerAgent } from '../definitions/qa-engineer.js';
import { getOrchestratorConfig } from '../config.js';

export interface FeatureDesignInput {
  featureIdea: string;
  additionalContext?: string;
  targetPersonas?: string[];
  relatedFiles?: string[];
}

export async function runFeatureDesignWorkflow(
  input: FeatureDesignInput,
  orchestrator?: AgentOrchestrator
): Promise<WorkflowResult> {
  const orch = orchestrator ?? new AgentOrchestrator(getOrchestratorConfig());

  const workflowInput: WorkflowInput = {
    type: 'feature-design',
    description: input.featureIdea,
    context: { additionalContext: input.additionalContext },
  };

  const steps = [
    {
      agentName: 'product-manager',
      agent: productManagerAgent,
      taskPrompt: buildProductManagerPrompt(input),
    },
    {
      agentName: 'product-designer',
      agent: productDesignerAgent,
      taskPrompt: buildProductDesignerPrompt(input),
    },
    {
      agentName: 'ui-ux-expert',
      agent: uiUxExpertAgent,
      taskPrompt: buildUiUxPrompt(input),
    },
    {
      agentName: 'microservice-architect',
      agent: microserviceArchitectAgent,
      taskPrompt: buildArchitectPrompt(input),
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

function buildProductManagerPrompt(input: FeatureDesignInput): string {
  return `You are writing a product specification for a new feature in TransactionDNA.

Feature Idea: "${input.featureIdea}"

${input.additionalContext ? `Additional Context: ${input.additionalContext}` : ''}
${input.targetPersonas ? `Target Personas: ${input.targetPersonas.join(', ')}` : ''}

Before writing the spec:
1. Use the list_directory tool to inspect the current frontend/src/pages-new/ and backend/src/main/java/com/txdna/controller/ directories
2. Use search_files to find any existing features similar to this one
3. Use get_latest_flyway_version to know the current migration version

Then produce a complete product specification following your output format.
Include personas, acceptance criteria, tenant isolation requirements, audit trail requirements, and release gates.`;
}

function buildProductDesignerPrompt(input: FeatureDesignInput): string {
  return `You are designing the product experience for a new feature in TransactionDNA.

Feature: "${input.featureIdea}"

The Product Manager has provided a spec (see Prior Agent Outputs above).

Before designing:
1. Use list_directory to inspect frontend/src/pages-new/ and frontend/src/components/
2. Identify existing patterns, components, and navigation flows

Then produce a complete screen-by-screen design following your output format.
Include URL routes (/app-new/ prefix), all states (loading/empty/error/success), trust cues, and AI advisory labels.`;
}

function buildUiUxPrompt(input: FeatureDesignInput): string {
  return `You are converting the product design into React/Tailwind implementation guidance for TransactionDNA.

Feature: "${input.featureIdea}"

The Product Manager spec and Product Designer screens are in Prior Agent Outputs above.

Before writing component specs:
1. Use list_directory to inspect frontend/src/components/ for reusable components
2. Use search_files to find the toast/notification system currently in use
3. Use search_files to find existing Axios service patterns (search for "axios" in filename mode)

Then produce a complete component specification following your output format.
No alert() — specify the toast system found. All new pages in pages-new/. TypeScript interfaces required.`;
}

function buildArchitectPrompt(input: FeatureDesignInput): string {
  return `You are designing the backend architecture for a new feature in TransactionDNA.

Feature: "${input.featureIdea}"

The PM spec is in Prior Agent Outputs above.

Before designing:
1. Use list_directory to inspect backend/src/main/java/com/txdna/service/ and controller/
2. Use get_latest_flyway_version to know the current migration version
3. Use search_files to find TenantContext usage patterns (content search: "TenantContext")
4. Use read_file on DomainExecutionRouter to understand the routing boundary

Then produce a complete service design including APIs, events, data model changes, tenant model, auth model, migration strategy, and anti-patterns avoided.`;
}

function buildSecurityPrompt(input: FeatureDesignInput): string {
  return `You are conducting a security design review for a new feature in TransactionDNA.

Feature: "${input.featureIdea}"

The PM spec, design, UI spec, and architecture are in Prior Agent Outputs above.

Before reviewing:
1. Use read_file on backend/src/main/java/com/txdna/security/JwtAuthFilter.java
2. Use search_files for "TenantContext" to verify tenant isolation patterns
3. Use read_file on the GlobalExceptionHandler to verify error handling

Produce a security design assessment following your output format.
Check all 11 items in the security signoff checklist. Pay special attention to:
- Tenant isolation in the proposed data model
- External auditor/regulator read-only enforcement
- Graph AI advisory-only constraint (if the feature touches Graph AI)`;
}

function buildQaPrompt(input: FeatureDesignInput): string {
  return `You are defining the test plan for a new feature in TransactionDNA.

Feature: "${input.featureIdea}"

The full feature design (PM, Designer, UI/UX, Architect, Security) is in Prior Agent Outputs above.

Before writing the test plan:
1. Use list_directory to inspect backend/src/test/ for existing test patterns
2. Use search_files for test files related to this feature area
3. Use read_file on scripts/reseed-demo.sh to understand demo data

Produce a complete test plan including unit, integration, regression, smoke, security, and migration tests.
Protect demo transactions. Specify test data requirements.`;
}
