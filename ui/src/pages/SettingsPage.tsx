import { useEffect, useState } from 'react';
import { Save, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { SystemConfig, LlmProviderKind, ProviderStatus } from '../types.ts';
import { configApi, providerApi } from '../api/client.ts';

const DEFAULTS: SystemConfig = {
  llmProvider: 'anthropic',
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

const ANTHROPIC_MODELS = [
  { value: 'claude-opus-4-8', label: 'claude-opus-4-8 — Most capable, highest cost' },
  { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6 — Balanced (recommended)' },
  { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5 — Fastest, lowest cost' },
];

const NVIDIA_ORCHESTRATOR_MODELS = [
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/llama-3.3-nemotron-super-49b-v1',
  'meta/llama-3.1-70b-instruct',
];

const NVIDIA_SPECIALIST_MODELS = [
  'meta/llama-3.1-8b-instruct',
  'meta/llama-3.1-70b-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
];

const PROVIDERS: { value: LlmProviderKind; label: string; description: string }[] = [
  { value: 'anthropic', label: 'Anthropic Claude', description: 'Cloud API — best reasoning, requires ANTHROPIC_API_KEY' },
  { value: 'ollama', label: 'Ollama (local)', description: 'Local models via Ollama — GLM-4, Llama, Mistral, Qwen, etc.' },
  { value: 'nvidia', label: 'NVIDIA NIM', description: 'NVIDIA inference microservices — requires NVIDIA_API_KEY' },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    configApi.get()
      .then(setConfig)
      .catch(() => setConfig(DEFAULTS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setStatusLoading(true);
    providerApi.status()
      .then(setProviderStatus)
      .catch(() => setProviderStatus(null))
      .finally(() => setStatusLoading(false));
  }, []);

  const refreshOllamaStatus = () => {
    setStatusLoading(true);
    providerApi.status()
      .then(setProviderStatus)
      .catch(() => setProviderStatus(null))
      .finally(() => setStatusLoading(false));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await configApi.update(config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const ollamaModels = providerStatus?.ollamaModels ?? [];
  const isOllamaUp = providerStatus?.ollamaReachable ?? false;

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

      {/* LLM Provider */}
      <section className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-200">LLM Provider</h2>

        <div className="grid grid-cols-1 gap-2">
          {PROVIDERS.map(p => (
            <label
              key={p.value}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                config.llmProvider === p.value
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <input
                type="radio"
                name="llmProvider"
                value={p.value}
                checked={config.llmProvider === p.value}
                onChange={() => set('llmProvider', p.value)}
                className="mt-0.5 accent-brand-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-200">{p.label}</p>
                <p className="text-xs text-slate-500">{p.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Ollama status badge */}
        {config.llmProvider === 'ollama' && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Ollama Status</span>
              <button
                onClick={refreshOllamaStatus}
                disabled={statusLoading}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isOllamaUp
                ? <Wifi className="w-4 h-4 text-green-400" />
                : <WifiOff className="w-4 h-4 text-red-400" />
              }
              <span className={`text-xs ${isOllamaUp ? 'text-green-400' : 'text-red-400'}`}>
                {isOllamaUp
                  ? `Connected — ${ollamaModels.length} model${ollamaModels.length !== 1 ? 's' : ''} available`
                  : 'Ollama not reachable — is it running?'
                }
              </span>
              {providerStatus && (
                <span className="text-xs text-slate-600 ml-1">({providerStatus.ollamaBaseUrl})</span>
              )}
            </div>

            {isOllamaUp && ollamaModels.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Available models:</p>
                <div className="flex flex-wrap gap-1">
                  {ollamaModels.map(m => (
                    <span key={m} className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300 font-mono">{m}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Set <code className="font-mono text-brand-400">OLLAMA_MODEL</code> or per-role overrides in <code className="font-mono text-brand-400">.env</code> to select a model.
                </p>
              </div>
            )}

            {!isOllamaUp && (
              <p className="text-xs text-slate-500">
                Start Ollama with <code className="font-mono text-brand-400">ollama serve</code> then pull a model:
                <code className="font-mono text-brand-400 block mt-1">ollama pull glm4:latest</code>
              </p>
            )}
          </div>
        )}

        {/* NVIDIA hint */}
        {config.llmProvider === 'nvidia' && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-xs text-slate-400 space-y-1">
            <p>Set <code className="font-mono text-brand-400">NVIDIA_API_KEY</code> in <code className="font-mono text-brand-400">.env</code>.</p>
            <p>Default orchestrator: <code className="font-mono text-brand-400">nvidia/llama-3.1-nemotron-70b-instruct</code></p>
            <p>Default specialist: <code className="font-mono text-brand-400">meta/llama-3.1-8b-instruct</code></p>
          </div>
        )}
      </section>

      {/* Model Configuration */}
      <section className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-200">Model Configuration</h2>
        {config.llmProvider === 'anthropic' && (
          <>
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
                  {ANTHROPIC_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            ))}
          </>
        )}

        {config.llmProvider === 'ollama' && (
          <div className="space-y-3">
            {([
              ['orchestratorModel', 'Orchestrator Model'],
              ['specialistModel', 'Specialist Model'],
              ['reviewerModel', 'Reviewer Model'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
                {ollamaModels.length > 0 ? (
                  <select
                    value={config[key]}
                    onChange={e => set(key, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500 font-mono"
                  >
                    {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={config[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder="e.g. glm4:latest"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono focus:outline-none focus:border-brand-500"
                  />
                )}
              </div>
            ))}
            <p className="text-xs text-slate-500">Models override OLLAMA_ORCHESTRATOR_MODEL / OLLAMA_SPECIALIST_MODEL / OLLAMA_REVIEWER_MODEL in .env.</p>
          </div>
        )}

        {config.llmProvider === 'nvidia' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Orchestrator Model</label>
              <select
                value={config.orchestratorModel}
                onChange={e => set('orchestratorModel', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
              >
                {NVIDIA_ORCHESTRATOR_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Specialist / Reviewer Model</label>
              <select
                value={config.specialistModel}
                onChange={e => { set('specialistModel', e.target.value); set('reviewerModel', e.target.value); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
              >
                {NVIDIA_SPECIALIST_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        )}

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
