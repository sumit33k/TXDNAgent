import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast } from '../types.ts';
import { cx } from '../utils.ts';

interface Props {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const icons = {
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
};

const borders = {
  success: 'border-emerald-800',
  error: 'border-red-800',
  warning: 'border-amber-800',
  info: 'border-blue-800',
};

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cx('card border flex items-start gap-3 p-3 pr-4 min-w-[260px] max-w-sm shadow-xl', borders[t.type])}
        >
          <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
          <p className="text-sm text-slate-200 flex-1">{t.message}</p>
          <button
            onClick={() => onRemove(t.id)}
            className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
