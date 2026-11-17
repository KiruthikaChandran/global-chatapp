import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, Inbox, MessageSquare, Send, X, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import UserAvatar from '../components/UserAvatar';
import UserStatus from '../components/UserStatus';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import { chatService } from '../services/chatService';
import { websocketService } from '../services/websocketService';
import type { ChatRequest } from '../types';

function RequestStatusBadge({ status }: { status: ChatRequest['status'] }) {
  if (status === 'ACCEPTED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <Check className="w-3.5 h-3.5" />
        <span>Accepted</span>
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
        <XCircle className="w-3.5 h-3.5" />
        <span>Rejected</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
      <Clock className="w-3.5 h-3.5" />
      <span>Pending</span>
    </span>
  );
}

export default function ChatRequests() {
  const navigate = useNavigate();
  const { getPresenceStatus, refreshPendingRequests, addToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incoming, setIncoming] = useState<ChatRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [inc, out] = await Promise.all([
        chatService.getIncomingRequests(),
        chatService.getOutgoingRequests(),
      ]);
      setIncoming(inc);
      setOutgoing(out);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load chat requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const unsub1 = websocketService.on('request:received', () => loadAll());
    const unsub2 = websocketService.on('request:updated', () => loadAll());
    return () => {
      unsub1();
      unsub2();
    };
  }, [loadAll]);

  const handleAccept = async (requestId: number) => {
    setBusyId(requestId);
    try {
      const res = await chatService.acceptRequest(requestId);
      await refreshPendingRequests();
      await loadAll();
      addToast({
        title: 'Request Accepted',
        message: 'Private chat is now enabled.',
        variant: 'success',
      });
      if (res.conversationId) {
        navigate(`/private-chat/${res.conversationId}`);
      }
    } catch (err) {
      addToast({
        title: 'Action Failed',
        message: extractErrorMessage(err, 'Could not accept request.'),
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setBusyId(requestId);
    try {
      await chatService.rejectRequest(requestId);
      await refreshPendingRequests();
      await loadAll();
      addToast({
        title: 'Request Declined',
        message: 'The chat request has been rejected.',
        variant: 'info',
      });
    } catch (err) {
      addToast({
        title: 'Action Failed',
        message: extractErrorMessage(err, 'Could not reject request.'),
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const items = activeTab === 'incoming' ? incoming : outgoing;
  const pendingIncomingCount = incoming.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Private messaging is unlocked once a chat request is accepted.
        </p>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/90 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'incoming'
                ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Incoming ({pendingIncomingCount} pending)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'outgoing'
                ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Outgoing ({outgoing.length})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16">
          <LoadingSpinner label="Loading chat requests..." />
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center">
          <Inbox className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {activeTab === 'incoming' ? 'No incoming chat requests' : 'No outgoing chat requests'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === 'incoming'
              ? 'When another member invites you to a private chat, it will appear here.'
              : 'Visit Discover Users to invite someone to a private conversation.'}
          </p>
          {activeTab === 'outgoing' && (
            <Link
              to="/discover"
              className="mt-4 inline-flex items-center h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
            >
              Discover Users
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((req) => {
            const person = req.otherUser;
            const liveStatus = getPresenceStatus(person.id);
            const isBusy = busyId === req.id;

            return (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Link to={`/profile/${person.id}`} className="shrink-0">
                    <UserAvatar
                      name={person.fullName}
                      src={person.profileImage}
                      size="md"
                      status={liveStatus}
                    />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/profile/${person.id}`}
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-violet-600 dark:hover:text-violet-400 truncate"
                      >
                        {person.fullName}
                      </Link>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <RequestStatusBadge status={req.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono">@{person.username}</span>
                      <span aria-hidden="true">·</span>
                      <UserStatus status={liveStatus} compact />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeTab === 'incoming' && req.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAccept(req.id)}
                        className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReject(req.id)}
                        className="h-9 px-3.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {req.status === 'ACCEPTED' && req.conversationId && (
                    <Link
                      to={`/private-chat/${req.conversationId}`}
                      className="h-9 px-3.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open Chat</span>
                    </Link>
                  )}

                  <Link
                    to={`/profile/${person.id}`}
                    className="h-9 px-3.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium inline-flex items-center transition-colors whitespace-nowrap shrink-0"
                  >
                    Profile
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
