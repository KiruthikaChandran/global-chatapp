import { Check, Clock, MessageSquare, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import UserAvatar from './UserAvatar';
import UserStatus from './UserStatus';

interface UserCardProps {
  person: User;
  onSendRequest?: (userId: number) => Promise<void> | void;
  onAcceptRequest?: (requestId: number) => Promise<void> | void;
  busyUserId?: number | null;
}

export default function UserCard({
  person,
  onSendRequest,
  onAcceptRequest,
  busyUserId,
}: UserCardProps) {
  const { user: currentUser, getPresenceStatus } = useAuth();
  const status = getPresenceStatus(person.id);
  const isSelf = currentUser?.id === person.id;
  const isBusy = busyUserId === person.id;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-3.5 min-w-0">
        <Link to={`/profile/${person.id}`} className="shrink-0">
          <UserAvatar name={person.fullName} src={person.profileImage} size="md" status={status} />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/profile/${person.id}`}
              className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate"
            >
              {person.fullName}
            </Link>
            {isSelf && (
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                (You)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono truncate">@{person.username}</span>
            <span aria-hidden="true">·</span>
            <UserStatus status={status} compact />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={`/profile/${person.id}`}
          className="h-9 px-3.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center transition-colors whitespace-nowrap shrink-0"
        >
          View Profile
        </Link>

        {!isSelf && person.relationship === 'CONNECTED' && person.conversationId && (
          <Link
            to={`/private-chat/${person.conversationId}`}
            className="h-9 px-3.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Message</span>
          </Link>
        )}

        {!isSelf && person.relationship === 'PENDING_OUTGOING' && (
          <span className="h-9 px-3.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>Request Sent</span>
          </span>
        )}

        {!isSelf && person.relationship === 'PENDING_INCOMING' && person.requestId && onAcceptRequest && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onAcceptRequest(person.requestId!)}
            className="h-9 px-3.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept Request</span>
          </button>
        )}

        {!isSelf && (!person.relationship || person.relationship === 'NONE') && onSendRequest && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onSendRequest(person.id)}
            className="h-9 px-3.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isBusy ? 'Sending...' : 'Send Request'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
