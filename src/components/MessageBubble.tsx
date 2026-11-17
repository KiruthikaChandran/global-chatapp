import { Link } from 'react-router-dom';
import type { PresenceStatus } from '../types';
import UserAvatar from './UserAvatar';

interface MessageBubbleProps {
  senderId: number;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  senderStatus?: PresenceStatus;
  message: string;
  createdAt: string;
  isOwn: boolean;
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({
  senderId,
  senderName,
  senderUsername,
  senderAvatar,
  senderStatus,
  message,
  createdAt,
  isOwn,
}: MessageBubbleProps) {
  return (
    <div className={`flex items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <Link to={`/profile/${senderId}`} className="shrink-0 mb-0.5">
        <UserAvatar name={senderName} src={senderAvatar} size="sm" status={senderStatus} />
      </Link>

      <div className={`flex flex-col max-w-[78%] sm:max-w-[68%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`flex items-center gap-1.5 text-xs mb-1 px-1 ${
            isOwn ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <Link
            to={`/profile/${senderId}`}
            className="font-semibold text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate max-w-[160px]"
          >
            {isOwn ? 'You' : senderName}
          </Link>
          <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px] tabular-nums">
            @{senderUsername}
          </span>
          <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
            ·
          </span>
          <time
            dateTime={createdAt}
            className="text-slate-400 dark:text-slate-500 font-mono text-[11px] tabular-nums shrink-0"
          >
            {formatMessageTime(createdAt)}
          </time>
        </div>

        <div
          className={`px-4 py-2.5 rounded-2xl text-[14.5px] leading-relaxed break-words whitespace-pre-wrap ${
            isOwn
              ? 'bg-violet-600 text-white rounded-br-sm'
              : 'bg-white dark:bg-[#161F33] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-sm'
          }`}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
