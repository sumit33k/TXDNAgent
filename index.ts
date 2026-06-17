#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { runFeatureDesignWorkflow } from './agents/workflows/feature-design-workflow.js';
import { runMicroserviceDesignWorkflow } from './agents/workflows/microservice-design-workflow.js';
import { runCodeReviewWorkflow } from './agents/workflows/code-review-workflow.js';
import { runDeploymentReadinessWorkflow } from './agents/workflows/deployment-readiness-workflow.js';
import { runImplementationPlanningWorkflow } from './agents/workflows/implementation-planning-workflow.js';
import { runSecurityReviewWorkflow } from './agents/workflows/security-review-workflow.js';
import type { WorkflowResult } from './agents/types.js';
import { getRiskSummary } from './agents/tools/risk-register.js';

const program = new Command();

program
  .name('txdna-agents')
  .description('TransactionDNA & EnterpriseOS Multi-Agent Engineering System')
  .version('1.0.0');

// ──────────────── Feature Design ─────────────────────────────────────────────
program
  .command('feature')
  .description('Run the Feature Design workflow')
  .requiredOption('-f, --feature <description>', 'Feature idea or description')
  .option('-c, --context <context>', 'Additional context')
  .option('-p, --personas <personas>', 'Target personas (comma-separated)')
  .action(async (opts) => {
    await runAndPrint(runFeatureDesignWorkflow({
      featureIdea: opts.feature,
      additionalContext: opts.context,
      targetPersonas: opts.personas?.split(','),
    }));
  });

// ──────────────── Microservice Design ────────────────────────────────────────
program
  .command('microservice')
  .description('Run the Microservice Design workflow')
  .requiredOption('-c, --capability <capability>', 'Business capability or domain module')
  .requiredOption('-d, --domain <domain>', 'Domain context description')
  .option('-s, --services <services>', 'Existing services (comma-separated)')
  .action(async (opts) => {
    await runAndPrint(runMicroserviceDesignWorkflow({
      businessCapability: opts.capability,
      domainContext: opts.domain,
      existingServices: opts.services?.split(','),
    }));
  });

// ──────────────── Code Review ─────────────────────────────────────────────────
program
  .command('review')
  .description('Run the Code Review workflow')
  .requiredOption('-F, --files <files>', 'Changed files (comma-separated paths)')
  .option('-b, --branch <branch>', 'Branch name')
  .option('-p, --pr-description <desc>', 'PR description')
  .option('--include-infra', 'Include infrastructure review')
  .option('--include-migrations', 'Flag that migrations are included')
  .action(async (opts) => {
    await runAndPrint(runCodeReviewWorkflow({
      changedFiles: opts.files.split(','),
      branch: opts.branch,
      prDescription: opts.prDescription,
      includeInfraChanges: opts.includeInfra,
      includeMigrations: opts.includeMigrations,
    }));
  });

// ──────────────── Deployment Readiness ───────────────────────────────────────
program
  .command('deploy')
  .description('Run the Deployment Readiness workflow')
  .requiredOption('-b, --branch <branch>', 'Release branch')
  .requiredOption('-e, --env <env>', 'Target environment (staging|production)')
  .option('-m, --migrations <files>', 'Migration files (comma-separated)')
  .option('-s, --services <services>', 'Changed services (comma-separated)')
  .option('-r, --release-notes <notes>', 'Release notes')
  .action(async (opts) => {
    if (opts.env !== 'staging' && opts.env !== 'production') {
      console.error('--env must be staging or production');
      process.exit(1);
    }
    await runAndPrint(runDeploymentReadinessWorkflow({
      branch: opts.branch,
      targetEnvironment: opts.env as 'staging' | 'production',
      migrationFiles: opts.migrations?.split(','),
      changedServices: opts.services?.split(','),
      releaseNotes: opts.releaseNotes,
    }));
  });

// ──────────────── Implementation Planning ────────────────────────────────────
program
  .command('plan')
  .description('Run the Implementation Planning workflow')
  .requiredOption('-s, --spec <spec>', 'Approved feature specification (file path or inline text)')
  .option('-a, --arch <decisions>', 'Architecture decisions')
  .option('-b, --branch <branch>', 'Target branch name')
  .action(async (opts) => {
    let spec = opts.spec;
    // If it looks like a file path, read it
    if (opts.spec.endsWith('.md') || opts.spec.endsWith('.txt')) {
      const fs = await import('fs');
      if (fs.existsSync(opts.spec)) {
        spec = fs.readFileSync(opts.spec, 'utf-8');
      }
    }
    await runAndPrint(runImplementationPlanningWorkflow({
      approvedSpec: spec,
      architectureDecisions: opts.arch,
      targetBranch: opts.branch,
    }));
  });

// ──────────────── Security Review ────────────────────────────────────────────
program
  .command('security')
  .description('Run a targeted Security Review')
  .requiredOption('-f, --focus <focus>', 'Focus area (e.g., "JWT auth", "tenant isolation")')
  .requiredOption('-F, --files <files>', 'Files to review (comma-separated)')
  .option('-c, --context <context>', 'Additional context')
  .action(async (opts) => {
    await runAndPrint(runSecurityReviewWorkflow({
      focusArea: opts.focus,
      filesToReview: opts.files.split(','),
      context: opts.context,
    }));
  });

// ──────────────── Risk Register ───────────────────────────────────────────────
program
  .command('risks')
  .description('Display the current risk register summary')
  .action(() => {
    console.log(getRiskSummary());
  });

async function runAndPrint(promise: Promise<WorkflowResult>): Promise<void> {
  try {
    console.log('Starting workflow...\n');
    const result = await promise;
    printResult(result);
  } catch (err) {
    console.error('Workflow failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function printResult(result: WorkflowResult): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`WORKFLOW: ${result.workflowType.toUpperCase()}`);
  console.log(`STATUS:   ${result.status.toUpperCase()}`);
  console.log(`STARTED:  ${result.startedAt}`);
  console.log(`ENDED:    ${result.completedAt ?? 'in progress'}`);
  console.log(`${'='.repeat(60)}\n`);

  for (const step of result.steps) {
    const icon = step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏳';
    console.log(`${icon} [${step.agentName.toUpperCase()}]`);
    if (step.approvalRequired) {
      console.log(`   ⚠️  AWAITING HUMAN APPROVAL`);
    }
    if (step.output) {
      console.log('\n' + step.output);
    }
    console.log('\n' + '-'.repeat(60) + '\n');
  }

  if (result.errors?.length) {
    console.log('ERRORS:');
    result.errors.forEach(e => console.log(`  ❌ ${e}`));
  }
}

program.parse();
