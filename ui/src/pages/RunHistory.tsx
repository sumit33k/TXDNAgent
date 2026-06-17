import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import type { WorkflowRun } from '../types.ts';
import { workflowsApi } from '../api/client.ts';
import { formatDate, formatDuration, WORKFLOW_META } from '../utils.ts';

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="badge-ok">Completed</span>;
  if (status === 'failed') return <span className="badge-critical">Failed</span>;
  if (status === 'running') return <span className="badge-medium">Running</span>;
  if (status === 'awaiting-approval') return <span className="badge-high">Awaiting Approval</span>;
  return <span className="badge-low">{status}</span>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === 'running') return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
  if (status === 'awaiting-approval') return <AlertCircle className="w-4 h-4 text-amber-400" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
}

export default function RunHistory() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workflowsApi.list()
      .then(setRuns)
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="w-6 h-6 text-slate-500 animate-spin" />
        <span className="ml-3 text-slate-400">Loading run history...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Run History</h1>
          <p className="text-slate-400 mt-1 text-sm">All workflow executions and their results.</p>
        </div>
        <Link to="/workflows" className="btn-primary flex items-center gap-2">
          New Run
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="card p-16 text-center">
          <Clock className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No workflow runs yet.</p>
          <Link to="/workflows" className="text-brand-400 text-sm mt-2 inline-block hover:text-brand-300">
            Start your first workflow →
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-800">
          {runs.map(run => {
            const meta = WORKFLOW_META[run.type];
            return (
              <Link
                key={run.id}
                to={`/runs/${run.id}`}
                className="flex items-center gap-4 p-4 hover:bg-slate-800/50 transition-colors"
              >
                <StatusIcon status={run.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      {meta?.icon} {meta?.label ?? run.type}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(run.startedAt)} · {run.steps.length} steps
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{formatDuration(run.startedAt, run.completedAt)}</p>
                  {run.status === 'awaiting-approval' && (
                    <p className="text-xs text-amber-400 font-medium mt-0.5">Needs approval</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
