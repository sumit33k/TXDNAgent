import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Bot, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { WorkflowRun, RiskEntry } from '../types.ts';
import { workflowsApi, risksApi } from '../api/client.ts';
import { formatDate, formatDuration, WORKFLOW_META } from '../utils.ts';

export default function Dashboard() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([workflowsApi.list(), risksApi.list()])
      .then(([r, ri]) => { setRuns(r); setRisks(ri); })
      .catch(() => { setRuns([]); setRisks([]); })
      .finally(() => setLoading(false));
  }, []);

  const openRisks = risks.filter(r => r.status === 'open');
  const criticalRisks = openRisks.filter(r => r.severity === 'critical');
  const recentRuns = runs.slice(0, 5);
  const completed = runs.filter(r => r.status === 'completed').length;
  const failed = runs.filter(r => r.status === 'failed').length;

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (s === 'failed') return <XCircle className="w-4 h-4 text-red-400" />;
    if (s === 'running') return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
    return <Clock className="w-4 h-4 text-amber-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="w-6 h-6 text-slate-500 animate-spin" />
        <span className="ml-3 text-slate-400">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Agent Console</h1>
        <p className="text-slate-400 mt-1 text-sm">Multi-agent engineering team for TransactionDNA &amp; EnterpriseOS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Runs', value: runs.length, icon: Play, color: 'text-brand-400' },
          { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Failed', value: failed, icon: XCircle, color: 'text-red-400' },
          { label: 'Open Risks', value: openRisks.length, icon: AlertTriangle, color: criticalRisks.length > 0 ? 'text-red-400' : 'text-amber-400' },
        ].map(stat => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Critical Risks Banner */}
      {criticalRisks.length > 0 && (
        <div className="border border-red-800 bg-red-950/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">{criticalRisks.length} Critical Risk{criticalRisks.length > 1 ? 's' : ''} Open</span>
          </div>
          {criticalRisks.slice(0, 3).map(r => (
            <p key={r.id} className="text-xs text-red-300 mt-1">• {r.description}</p>
          ))}
          <Link to="/risks" className="text-xs text-red-400 underline mt-2 inline-block">View all risks →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {Object.entries(WORKFLOW_META).map(([type, meta]) => (
              <Link
                key={type}
                to={`/workflows?type=${type}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors group"
              >
                <span className="text-lg">{meta.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white">{meta.label}</p>
                  <p className="text-xs text-slate-500">{meta.agents.length} agents</p>
                </div>
                <Play className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-400" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Recent Runs</h2>
            <Link to="/runs" className="text-xs text-brand-400 hover:text-brand-300">View all →</Link>
          </div>
          {recentRuns.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No runs yet. Start a workflow to begin.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRuns.map(run => (
                <Link
                  key={run.id}
                  to={`/runs/${run.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {statusIcon(run.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {WORKFLOW_META[run.type]?.label ?? run.type}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(run.startedAt)}</p>
                  </div>
                  <span className="text-xs text-slate-600">
                    {formatDuration(run.startedAt, run.completedAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
