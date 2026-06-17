import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Risk } from '../types.js';

const RISK_REGISTER_PATH = path.join(process.cwd(), 'logs', 'risk-register.json');

export interface RiskEntry extends Risk {
  id: string;
  workflowId: string;
  agentName: string;
  createdAt: string;
  status: 'open' | 'mitigated' | 'accepted' | 'closed';
}

export function loadRiskRegister(): RiskEntry[] {
  if (!fs.existsSync(RISK_REGISTER_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(RISK_REGISTER_PATH, 'utf-8')) as RiskEntry[];
  } catch {
    return [];
  }
}

export function saveRiskRegister(risks: RiskEntry[]): void {
  const dir = path.dirname(RISK_REGISTER_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(RISK_REGISTER_PATH, JSON.stringify(risks, null, 2));
}

export function addRisk(
  risk: Risk,
  workflowId: string,
  agentName: string
): RiskEntry {
  const entry: RiskEntry = {
    ...risk,
    id: randomUUID(),
    workflowId,
    agentName,
    createdAt: new Date().toISOString(),
    status: 'open',
  };

  const risks = loadRiskRegister();
  risks.push(entry);
  saveRiskRegister(risks);
  return entry;
}

export function getRiskSummary(): string {
  const risks = loadRiskRegister();
  const open = risks.filter(r => r.status === 'open');
  const critical = open.filter(r => r.severity === 'critical');
  const high = open.filter(r => r.severity === 'high');

  const lines = [
    `Risk Register: ${risks.length} total, ${open.length} open`,
    `  CRITICAL: ${critical.length}`,
    `  HIGH: ${high.length}`,
    `  MEDIUM: ${open.filter(r => r.severity === 'medium').length}`,
    `  LOW: ${open.filter(r => r.severity === 'low').length}`,
  ];

  if (critical.length > 0) {
    lines.push('\nCritical Open Risks:');
    critical.forEach(r => lines.push(`  [${r.id.slice(0, 8)}] ${r.description} (${r.agentName})`));
  }

  return lines.join('\n');
}
