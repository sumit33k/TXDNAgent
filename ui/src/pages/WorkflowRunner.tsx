import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Play, ChevronRight, Bot } from 'lucide-react';
import type { WorkflowType } from '../types.ts';
import { workflowsApi } from '../api/client.ts';
import { WORKFLOW_META } from '../utils.ts';

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

const WORKFLOW_FIELDS: Record<WorkflowType, FieldDef[]> = {
  'feature-design': [
    { key: 'featureIdea', label: 'Feature Idea', type: 'textarea', placeholder: 'Describe the feature you want to design...', required: true },
    { key: 'additionalContext', label: 'Additional Context', type: 'textarea', placeholder: 'Business context, constraints, related features...' },
    { key: 'targetPersonas', label: 'Target Personas', type: 'text', placeholder: 'Auditor, Compliance Officer, Admin (comma-separated)' },
  ],
  'microservice-design': [
    { key: 'businessCapability', label: 'Business Capability', type: 'textarea', placeholder: 'Describe the business capability or domain module...', required: true },
    { key: 'domainContext', label: 'Domain Context', type: 'textarea', placeholder: 'What domain does this belong to? How does it relate to TransactionDNA?', required: true },
    { key: 'existingServices', label: 'Existing Services', type: 'text', placeholder: 'List existing services it will interact with (comma-separated)' },
    { key: 'constraints', label: 'Constraints', type: 'textarea', placeholder: 'Performance targets, compliance requirements, deployment constraints...' },
  ],
  'implementation-planning': [
    { key: 'approvedSpec', label: 'Approved Spec', type: 'textarea', placeholder: 'Paste the approved feature specification...', required: true },
    { key: 'architectureDecisions', label: 'Architecture Decisions', type: 'textarea', placeholder: 'Any architecture decisions already made...' },
    { key: 'targetBranch', label: 'Target Branch', type: 'text', placeholder: 'feature/my-feature' },
  ],
  'code-review': [
    { key: 'changedFiles', label: 'Changed Files', type: 'textarea', placeholder: 'One file path per line, e.g.:\nbackend/src/main/java/com/txdna/service/ExceptionService.java\nfrontend/src/pages-new/DnaDetail.tsx', required: true },
    { key: 'branch', label: 'Branch Name', type: 'text', placeholder: 'feature/my-feature' },
    { key: 'prDescription', label: 'PR Description', type: 'textarea', placeholder: 'What does this PR do? What should reviewers focus on?' },
  ],
  'deployment-readiness': [
    { key: 'branch', label: 'Release Branch', type: 'text', placeholder: 'release/v2.5.0', required: true },
    { key: 'targetEnvironment', label: 'Target Environment', type: 'select', required: true, options: [{ value: 'staging', label: 'Staging' }, { value: 'production', label: 'Production' }] },
    { key: 'changedServices', label: 'Changed Services', type: 'text', placeholder: 'service names (comma-separated)' },
    { key: 'migrationFiles', label: 'Migration Files', type: 'text', placeholder: 'V157__my_migration.sql (comma-separated)' },
    { key: 'releaseNotes', label: 'Release Notes', type: 'textarea', placeholder: 'What is in this release?' },
  ],
  'security-review': [
    { key: 'focusArea', label: 'Focus Area', type: 'text', placeholder: 'e.g. JWT auth, tenant isolation, RBAC for new endpoints', required: true },
    { key: 'filesToReview', label: 'Files to Review', type: 'textarea', placeholder: 'One file path per line', required: true },
    { key: 'context', label: 'Context', type: 'textarea', placeholder: 'Why is this security review needed? What changed?' },
  ],
};

function toInput(form: Record<string, string>, type: WorkflowType): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    if (!v.trim()) continue;
    if (k === 'changedFiles' || k === 'filesToReview') {
      out[k] = v.split('\n').map(l => l.trim()).filter(Boolean);
    } else if (k === 'existingServices' || k === 'changedServices' || k === 'migrationFiles' || k === 'targetPersonas') {
      out[k] = v.split(',').map(l => l.trim()).filter(Boolean);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default function WorkflowRunner() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const defaultType = (params.get('type') as WorkflowType) ?? 'feature-design';
  const [selectedType, setSelectedType] = useState<WorkflowType>(defaultType);
  const [form, setForm] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = WORKFLOW_META[selectedType];
  const fields = WORKFLOW_FIELDS[selectedType];

  const handleRun = async () => {
    const requiredMissing = fields.filter(f => f.required && !form[f.key]?.trim());
    if (requiredMissing.length > 0) {
      setError(`Required: ${requiredMissing.map(f => f.label).join(', ')}`);
      return;
    }
    setError(null);
    setRunning(true);
    try {
      const run = await workflowsApi.run(selectedType, toInput(form, selectedType));
      navigate(`/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workflow. Is the API server running?');
      setRunning(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Run Workflow</h1>
        <p className="text-slate-400 mt-1 text-sm">Select a workflow and configure inputs to engage the agent team.</p>
      </div>

      {/* Workflow type selector */}
      <div className="card p-2">
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(WORKFLOW_META) as WorkflowType[]).map(type => {
            const m = WORKFLOW_META[type];
            return (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setForm({}); setError(null); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  selectedType === type
                    ? 'bg-brand-600/20 text-brand-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{m.icon}</span>
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected workflow info */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>Agents involved:</span>
        {meta.agents.map(a => (
          <span key={a} className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{a}</span>
        ))}
      </div>

      {/* Form */}
      <div className="card p-6 space-y-5">
        {fields.map(field => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {field.type === 'select' ? (
              <select
                value={form[field.key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select...</option>
                {field.options?.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                rows={field.key === 'approvedSpec' ? 10 : 4}
                value={form[field.key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-500 resize-y"
              />
            ) : (
              <input
                type="text"
                value={form[field.key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            )}
          </div>
        ))}

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={running}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {running ? (
            <>
              <Bot className="w-4 h-4 animate-pulse" />
              Starting agents...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run {meta.label}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
