import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { RiskEntry } from '../types.ts';
import { risksApi } from '../api/client.ts';
import { formatDate, cx } from '../utils.ts';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const STATUS_OPTIONS: RiskEntry['status'][] = ['open', 'mitigated', 'accepted', 'closed'];

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  };
  return <span className={map[severity] ?? 'badge-low'}>{severity}</span>;
}

// Static sample for when API is offline
const SAMPLE_RISKS: RiskEntry[] = [
  { id: '1', severity: 'critical', description: 'Example: Tenant isolation bypass detected in DAO layer', mitigation: 'Add TenantContext.currentTenantId() filter to all repository queries', owner: 'security-engineer', workflowId: 'demo', agentName: 'security-engineer', createdAt: new Date().toISOString(), status: 'open' },
  { id: '2', severity: 'high', description: 'Example: Flyway migration V157 drops a column with existing data', mitigation: 'Add backward-compatible migration step, verify data can be migrated first', owner: 'devops-engineer', workflowId: 'demo', agentName: 'devops-engineer', createdAt: new Date().toISOString(), status: 'open' },
  { id: '3', severity: 'medium', description: 'Example: Missing audit trail on bulk exception close operation', mitigation: 'Add AuditService.log() call in ExceptionBulkService.closeAll()', owner: 'senior-developer', workflowId: 'demo', agentName: 'code-reviewer', createdAt: new Date().toISOString(), status: 'open' },
];

export default function RisksPage() {
  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('open');

  useEffect(() => {
    risksApi.list()
      .then(r => setRisks(r.length > 0 ? r : SAMPLE_RISKS))
      .catch(() => setRisks(SAMPLE_RISKS))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: string, status: RiskEntry['status']) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    try { await risksApi.update(id, status); } catch { /* offline */ }
  };

  const displayed = risks
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const counts = {
    all: risks.length,
    open: risks.filter(r => r.status === 'open').length,
    mitigated: risks.filter(r => r.status === 'mitigated').length,
    accepted: risks.filter(r => r.status === 'accepted').length,
    closed: risks.filter(r => r.status === 'closed').length,
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Risk Register</h1>
        <p className="text-slate-400 mt-1 text-sm">Risks surfaced by agents during workflow runs.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {(['open', 'mitigated', 'accepted', 'closed', 'all'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cx(
              'px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize',
              filter === s
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {s} <span className="ml-1 text-slate-600">({counts[s]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <AlertTriangle className="w-5 h-5 animate-pulse" /> Loading risks...
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <p className="text-slate-400">No {filter !== 'all' ? filter : ''} risks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(risk => (
            <div key={risk.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className={cx(
                    'w-4 h-4 mt-0.5 shrink-0',
                    risk.severity === 'critical' ? 'text-red-400' :
                    risk.severity === 'high' ? 'text-orange-400' :
                    risk.severity === 'medium' ? 'text-yellow-400' : 'text-slate-400'
                  )} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={risk.severity} />
                      <span className="text-xs text-slate-500">{risk.agentName}</span>
                      <span className="text-xs text-slate-600">{formatDate(risk.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-200">{risk.description}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      <span className="text-slate-500">Mitigation: </span>{risk.mitigation}
                    </p>
                  </div>
                </div>
                <select
                  value={risk.status}
                  onChange={e => handleStatusChange(risk.id, e.target.value as RiskEntry['status'])}
                  className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-brand-500 shrink-0"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
