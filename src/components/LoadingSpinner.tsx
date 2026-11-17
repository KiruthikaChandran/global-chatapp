import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ label, size = 'md' }: LoadingSpinnerProps) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <div className="flex items-center justify-center gap-2.5 text-slate-500 dark:text-slate-400">
      <Loader2 className={`${iconSize} animate-spin text-violet-600 dark:text-violet-400`} />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}
