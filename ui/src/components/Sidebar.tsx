import { NavLink } from 'react-router-dom';
import { Bot, Play, ShieldCheck, AlertTriangle, Settings, Activity } from 'lucide-react';
import { cx } from '../utils.ts';

const nav = [
  { to: '/', icon: Activity, label: 'Dashboard' },
  { to: '/workflows', icon: Play, label: 'Run Workflow' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/runs', icon: Activity, label: 'Run History' },
  { to: '/risks', icon: AlertTriangle, label: 'Risk Register' },
  { to: '/security', icon: ShieldCheck, label: 'Security' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
            TX
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100 leading-tight">Agent Console</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">TransactionDNA</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-brand-600/20 text-brand-400 font-medium'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider">v1.0.0 · Admin</p>
      </div>
    </aside>
  );
}
