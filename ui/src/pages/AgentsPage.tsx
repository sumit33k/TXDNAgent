import { useEffect, useState } from 'react';
import { Bot, Edit3, RotateCcw, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { AgentConfig } from '../types.ts';
import { agentsApi } from '../api/client.ts';
import { cx, AGENT_ROLE_COLORS } from '../utils.ts';

// Static fallback when API not running
const STATIC_AGENTS: AgentConfig[] = [
  { name: 'product-manager', displayName: 'Product Manager', icon: '📋', role: 'product-management', description: 'Translates feature requests into product specs with personas, acceptance criteria, and release gates.', model: 'claude-sonnet-4-6', maxTurns: 20, enabled: true, boundaries: ['Read-only repository access', 'No code generation'], escalationRules: ['Conflicting requirements → Engineering Orchestrator'], qualityGates: ['All acceptance criteria are testable'] },
  { name: 'product-designer', displayName: 'Product Designer', icon: '🎨', role: 'product-design', description: 'Defines product experience, screen flows, states, and enterprise UX patterns.', model: 'claude-sonnet-4-6', maxTurns: 20, enabled: true, boundaries: ['Read-only repository access'], escalationRules: ['Design requires new API → Microservice Architect'], qualityGates: ['All states specified'] },
  { name: 'ui-ux-expert', displayName: 'UI/UX Expert', icon: '🖥️', role: 'ui-ux', description: 'Converts designs into React/Tailwind-ready UI specs with component guidance.', model: 'claude-sonnet-4-6', maxTurns: 20, enabled: true, boundaries: ['No alert() usage'], escalationRules: ['Missing API → Senior Developer'], qualityGates: ['TypeScript interfaces defined'] },
  { name: 'microservice-architect', displayName: 'Microservice Architect', icon: '🏗️', role: 'architecture', description: 'Designs service boundaries, APIs, events, tenancy model, and migration strategy.', model: 'claude-sonnet-4-6', maxTurns: 20, enabled: true, boundaries: ['No shared databases'], escalationRules: ['Security concern → Security Engineer'], qualityGates: ['All services independently deployable'] },
  { name: 'senior-developer', displayName: 'Senior Full-Stack Developer', icon: '👨‍💻', role: 'implementation', description: 'Implements safe, minimal changes following existing patterns across frontend and backend.', model: 'claude-sonnet-4-6', maxTurns: 20, enabled: true, boundaries: ['Cannot push to main'], escalationRules: ['Security concern → Security Engineer'], qualityGates: ['TypeScript strict mode, no any'] },
  { name: 'code-reviewer', displayName: 'Code Reviewer', icon: '🔍', role: 'code-review', description: 'Reviews correctness, maintainability, performance, error handling, and API contracts.', model: 'claude-sonnet-4-6', maxTurns: 10, enabled: true, boundaries: ['Read-only access'], escalationRules: ['Security finding → Security Engineer'], qualityGates: ['Every BLOCKING issue has file:line'] },
  { name: 'security-engineer', displayName: 'Security Engineer', icon: '🔒', role: 'security', description: 'Reviews auth, RBAC, tenant isolation, OWASP risks, and produces security signoff.', model: 'claude-sonnet-4-6', maxTurns: 15, enabled: true, boundaries: ['CRITICAL findings block merge'], escalationRules: ['CRITICAL → notify orchestrator immediately'], qualityGates: ['Full signoff checklist completed'] },
  { name: 'devops-engineer', displayName: 'DevOps Engineer', icon: '🚀', role: 'devops', description: 'Reviews Docker, Kubernetes, Helm, CI/CD, migrations, and release readiness.', model: 'claude-sonnet-4-6', maxTurns: 15, enabled: true, boundaries: ['Cannot execute deployments'], escalationRules: ['Destructive migration → human approval'], qualityGates: ['Release checklist completed'] },
  { name: 'qa-engineer', displayName: 'QA / Test Engineer', icon: '🧪', role: 'qa', description: 'Defines unit, integration, regression, smoke, security, and migration tests.', model: 'claude-sonnet-4-6', maxTurns: 15, enabled: true, boundaries: ['Cannot modify production data'], escalationRules: ['Demo data risk → Orchestrator'], qualityGates: ['Every feature has unit tests'] },
];

interface AgentCardProps {
  agent: AgentConfig;
  onUpdate: (name: string, update: Partial<AgentConfig>) => void;
  onReset: (name: string) => void;
}

function AgentCard({ agent, onUpdate, onReset }: AgentCardProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(agent.systemPromptOverride ?? '');

  const roleColor = AGENT_ROLE_COLORS[agent.role] ?? 'text-slate-400';

  return (
    <div className={cx('card transition-all', !agent.enabled && 'opacity-50')}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{agent.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">{agent.displayName}</h3>
                <span className={cx('text-[10px] font-medium uppercase tracking-wide', roleColor)}>
                  {agent.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{agent.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onUpdate(agent.name, { enabled: !agent.enabled })}
              className={cx(
                'text-xs px-2 py-1 rounded font-medium transition-colors',
                agent.enabled
                  ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900'
                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
              )}
              aria-label={agent.enabled ? 'Disable agent' : 'Enable agent'}
            >
              {agent.enabled ? 'Active' : 'Disabled'}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn-ghost p-1.5"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Model selector */}
        <div className="flex items-center gap-3 mt-4">
          <label className="text-xs text-slate-500 w-16 shrink-0">Model</label>
          <select
            value={agent.model}
            onChange={e => onUpdate(agent.name, { model: e.target.value })}
            className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="claude-opus-4-8">claude-opus-4-8 (most capable)</option>
            <option value="claude-sonnet-4-6">claude-sonnet-4-6 (balanced)</option>
            <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (fast)</option>
          </select>
          <label className="text-xs text-slate-500 w-16 shrink-0">Max turns</label>
          <input
            type="number"
            min={1}
            max={50}
            value={agent.maxTurns}
            onChange={e => onUpdate(agent.name, { maxTurns: parseInt(e.target.value, 10) })}
            className="w-16 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-800 p-5 space-y-5">
          {/* Boundaries */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Boundaries</h4>
            <ul className="space-y-1">
              {agent.boundaries.map((b, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-slate-600 mt-0.5">•</span>{b}
                </li>
              ))}
            </ul>
          </div>

          {/* Escalation rules */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Escalation Rules</h4>
            <ul className="space-y-1">
              {agent.escalationRules.map((r, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">↑</span>{r}
                </li>
              ))}
            </ul>
          </div>

          {/* Quality gates */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Quality Gates</h4>
            <ul className="space-y-1">
              {agent.qualityGates.map((g, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>{g}
                </li>
              ))}
            </ul>
          </div>

          {/* System Prompt Override */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-slate-400">System Prompt Override</h4>
              <div className="flex gap-1.5">
                {editing ? (
                  <>
                    <button
                      onClick={() => { onUpdate(agent.name, { systemPromptOverride: draft }); setEditing(false); }}
                      className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Save className="w-3 h-3" /> Save
                    </button>
                    <button
                      onClick={() => { setDraft(agent.systemPromptOverride ?? ''); setEditing(false); }}
                      className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-200"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    {agent.systemPromptOverride && (
                      <button
                        onClick={() => onReset(agent.name)}
                        className="text-xs flex items-center gap-1 text-amber-500 hover:text-amber-400"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            {editing ? (
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={10}
                placeholder="Override the system prompt for this agent. Leave blank to use the default."
                className="w-full text-xs bg-slate-800 border border-brand-600 rounded-lg p-3 text-slate-300 font-mono focus:outline-none resize-y"
              />
            ) : (
              <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3 font-mono min-h-[4rem]">
                {agent.systemPromptOverride
                  ? <span className="text-slate-300">{agent.systemPromptOverride.slice(0, 200)}…</span>
                  : <span className="text-slate-600 italic">Using default system prompt</span>
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentConfig[]>(STATIC_AGENTS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    agentsApi.list()
      .then(setAgents)
      .catch(() => setAgents(STATIC_AGENTS))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (name: string, update: Partial<AgentConfig>) => {
    setAgents(prev => prev.map(a => a.name === name ? { ...a, ...update } : a));
    try { await agentsApi.update(name, update); } catch { /* offline */ }
  };

  const handleReset = async (name: string) => {
    setAgents(prev => prev.map(a => a.name === name ? { ...a, systemPromptOverride: undefined } : a));
    try { await agentsApi.resetPrompt(name); } catch { /* offline */ }
  };

  const filtered = agents.filter(a =>
    filter === '' || a.displayName.toLowerCase().includes(filter.toLowerCase()) || a.role.includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Bot className="w-6 h-6 text-slate-500 animate-pulse" />
        <span className="ml-3 text-slate-400">Loading agents...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Agents</h1>
          <p className="text-slate-400 mt-1 text-sm">Configure model, turns, and system prompt overrides for each agent.</p>
        </div>
        <div className="text-xs text-slate-500">
          {agents.filter(a => a.enabled).length}/{agents.length} active
        </div>
      </div>

      <input
        type="search"
        placeholder="Filter agents by name or role..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-500"
      />

      <div className="space-y-3">
        {filtered.map(agent => (
          <AgentCard key={agent.name} agent={agent} onUpdate={handleUpdate} onReset={handleReset} />
        ))}
      </div>
    </div>
  );
}
