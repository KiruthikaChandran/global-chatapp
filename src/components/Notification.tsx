import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Notification() {
  const { toasts, dismissToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.variant === 'success'
            ? CheckCircle2
            : toast.variant === 'error'
              ? AlertCircle
              : Info;
        const iconColor =
          toast.variant === 'success'
            ? 'text-emerald-600 dark:text-emerald-400'
            : toast.variant === 'error'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-violet-600 dark:text-violet-400';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700/80 shadow-lg transition-all duration-200"
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {toast.title}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
