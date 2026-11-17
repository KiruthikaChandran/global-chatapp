import { Radio } from 'lucide-react';
import type { PresenceStatus } from '../types';

interface UserStatusProps {
  status: PresenceStatus;
  compact?: boolean;
}

export default function UserStatus({ status, compact = false }: UserStatusProps) {
  if (status === 'LIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 whitespace-nowrap shrink-0">
        <Radio className="w-3.5 h-3.5 shrink-0" />
        <span>LIVE{compact ? '' : ' in chat'}</span>
      </span>
    );
  }

  if (status === 'ONLINE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span>Online</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
      <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
      <span>Offline</span>
    </span>
  );
}
