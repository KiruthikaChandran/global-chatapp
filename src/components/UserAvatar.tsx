import { useState } from 'react';
import type { PresenceStatus } from '../types';

interface UserAvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: PresenceStatus;
}

const SIZE_MAP = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

const DOT_SIZE_MAP = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border-2',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserAvatar({ name, src, size = 'md', status }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(src && !imgFailed);

  const dotColor =
    status === 'LIVE'
      ? 'bg-violet-600'
      : status === 'ONLINE'
        ? 'bg-emerald-500'
        : 'bg-slate-400';

  return (
    <div className={`relative inline-flex shrink-0 ${SIZE_MAP[size]}`}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
        />
      ) : (
        <div
          aria-label={name}
          className="w-full h-full rounded-full flex items-center justify-center font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-200 border border-violet-200 dark:border-violet-800/60 select-none"
        >
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span
          title={status === 'LIVE' ? 'LIVE in chat' : status === 'ONLINE' ? 'Online' : 'Offline'}
          className={`absolute bottom-0 right-0 rounded-full border-white dark:border-[#111827] ${DOT_SIZE_MAP[size]} ${dotColor}`}
        />
      )}
    </div>
  );
}
