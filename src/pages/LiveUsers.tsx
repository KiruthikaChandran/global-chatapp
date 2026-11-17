import { useCallback, useEffect, useState } from 'react';
import { Globe, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import UserCard from '../components/UserCard';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { websocketService } from '../services/websocketService';
import type { User } from '../types';

export default function LiveUsers() {
  const { addToast, refreshPendingRequests } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const fetchLive = useCallback(async () => {
    try {
      const data = await userService.getLiveUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load LIVE users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const unsub = websocketService.on('presence:update', () => fetchLive());
    const unsubReq = websocketService.on('request:updated', () => fetchLive());
    return () => {
      unsub();
      unsubReq();
    };
  }, [fetchLive]);

  const handleSendRequest = async (receiverId: number) => {
    setBusyUserId(receiverId);
    try {
      await chatService.sendChatRequest(receiverId);
      addToast({
        title: 'Chat Request Sent',
        message: 'Your private chat request is now pending.',
        variant: 'success',
      });
      await fetchLive();
    } catch (err) {
      addToast({
        title: 'Request Failed',
        message: extractErrorMessage(err, 'Could not send chat request.'),
        variant: 'error',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await chatService.acceptRequest(requestId);
      addToast({
        title: 'Request Accepted',
        message: 'Private conversation unlocked.',
        variant: 'success',
      });
      await refreshPendingRequests();
      await fetchLive();
    } catch (err) {
      addToast({
        title: 'Action Failed',
        message: extractErrorMessage(err, 'Could not accept request.'),
        variant: 'error',
      });
    }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Members actively participating in Global Chat or messaging right now.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums font-semibold text-violet-700 dark:text-violet-400 whitespace-nowrap shrink-0">
            <Radio className="w-3.5 h-3.5" />
            <span>{users.length} LIVE</span>
          </span>
          <Link
            to="/global-chat"
            className="h-9 px-3.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Join Global Chat</span>
          </Link>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      {loading ? (
        <div className="py-16">
          <LoadingSpinner label="Checking LIVE participants..." />
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center">
          <Radio className="w-8 h-8 text-violet-500 mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No LIVE chat participants right now
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Open Global Chat to become LIVE and start conversing with others.
          </p>
          <Link
            to="/global-chat"
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
          >
            Enter Global Chat
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((person) => (
            <UserCard
              key={person.id}
              person={person}
              onSendRequest={handleSendRequest}
              onAcceptRequest={handleAcceptRequest}
              busyUserId={busyUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
