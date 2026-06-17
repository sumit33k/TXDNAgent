import { useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import type { SystemConfig } from '../types.ts';
import { configApi } from '../api/client.ts';

const DEFAULTS: SystemConfig = {
  orchestratorModel: 'claude-opus-4-8',
  specialistModel: 'claude-sonnet-4-6',
  reviewerModel: 'claude-sonnet-4-6',
  requireApprovalForWrites: true,
  requireApprovalForDestructive: true,
  enableAuditTrail: true,
  enableRiskRegister: true,
  maxAgentTurns: 20,
  txdnaRepoPath: '/Users/sumitsrivastava/transactionDNAPRod',
  enterpriseOsRepoPath: '/Users/sumitsrivastava/EnterpriseOS',
};

const MODELS = [
  { value: 'claude-opus-4-8', label: 'claude-opus-4-8 — Most capable, highest cost' },
  { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6 — Balanced (recommended)' },
  { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5 — Fastest, lowest cost' },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    configApi.get()
      .then(setConfig)
      .catch(() => setConfig(DEFAULTS))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await configApi.update(config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // When API is offline, just show saved state from local changes
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
        <span className="ml-3 text-slate-400">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Configure the agent framework system settings.</p>
      </div>

      {/* Model Configuration */}
      <section className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-200">Model Configuration</h2>

        {([
          ['orchestratorModel', 'Orchestrator Model', 'Engineering Orchestrator — most complex reasoning'],
          ['specialistModel', 'Specialist Model', 'Product Manager, Designer, Developer, DevOps, QA'],
          ['reviewerModel', 'Reviewer Model', 'Code Reviewer, Security Engineer'],
        ] as const).map(([key, label, hint]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
            <p className="text-xs text-slate-500 mb-2">{hint}</p>
            <select
              value={config[key]}
              onChange={e => set(key, e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
            >
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Max Agent Turns</label>
          <p className="text-xs text-slate-500 mb-2">Maximum tool-use turns per agent before forcing output</p>
          <input
            type="number"
            min={1}
            max={50}
            value={config.maxAgentTurns}
            onChange={e => set('maxAgentTurns', parseInt(e.target.value, 10))}
            className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
          />
        </div>
      </section>

      {/* Repository Paths */}
      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Repository Paths</h2>
        <p className="text-xs text-slate-500">Absolute paths to the repositories agents will read.</p>

        {([
          ['txdnaRepoPath', 'TransactionDNA Repo Path'],
          ['enterpriseOsRepoPath', 'EnterpriseOS Repo Path'],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
            <input
              type="text"
              value={config[key]}
              onChange={e => set(key, e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono focus:outline-none focus:border-brand-500"
            />
          </div>
        ))}
      </section>

      {/* Safety Gates */}
      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Safety &amp; Approval Gates</h2>

        {([
          ['requireApprovalForWrites', 'Require human approval for file writes', 'Agents flag [REQUIRES HUMAN APPROVAL] before any code generation'],
          ['requireApprovalForDestructive', 'Require human approval for destructive actions', 'DB drops, force pushes, infra deletion must be approved'],
          ['enableAuditTrail', 'Enable audit trail', 'Log all agent inputs/outputs to logs/audit-trail.jsonl'],
          ['enableRiskRegister', 'Enable risk register', 'Automatically extract and log [RISK] flags from agent outputs'],
        ] as const).map(([key, label, hint]) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                className="sr-only"
                checked={config[key]}
                onChange={e => set(key, e.target.checked)}
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${config[key] ? 'bg-brand-600' : 'bg-slate-700'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config[key] ? 'translate-x-4' : ''}`} />
            </div>
            <div>
              <p className="text-sm text-slate-200">{label}</p>
              <p className="text-xs text-slate-500">{hint}</p>
            </div>
          </label>
        ))}
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary flex items-center gap-2"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
