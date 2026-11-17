import { useCallback, useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import UserCard from '../components/UserCard';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { websocketService } from '../services/websocketService';
import type { User } from '../types';

type FilterMode = 'all' | 'online' | 'live';

export default function DiscoverUsers() {
  const { addToast, refreshPendingRequests } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await userService.getAllUsers(search.trim(), filter);
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to fetch registered users.'));
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchUsers();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    const unsubPresence = websocketService.on('presence:update', () => fetchUsers());
    const unsubReg = websocketService.on('user:registered', () => fetchUsers());
    const unsubReq = websocketService.on('request:updated', () => fetchUsers());
    const unsubReqRec = websocketService.on('request:received', () => fetchUsers());

    return () => {
      unsubPresence();
      unsubReg();
      unsubReq();
      unsubReqRec();
    };
  }, [fetchUsers]);

  const handleSendRequest = async (receiverId: number) => {
    setBusyUserId(receiverId);
    try {
      await chatService.sendChatRequest(receiverId);
      addToast({
        title: 'Chat Request Sent',
        message: 'Waiting for the user to accept your request.',
        variant: 'success',
      });
      await fetchUsers();
    } catch (err) {
      addToast({
        title: 'Request Failed',
        message: extractErrorMessage(err, 'Unable to send chat request.'),
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
        message: 'You can now exchange private messages.',
        variant: 'success',
      });
      await refreshPendingRequests();
      await fetchUsers();
    } catch (err) {
      addToast({
        title: 'Action Failed',
        message: extractErrorMessage(err, 'Unable to accept chat request.'),
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search registered users by name or @username..."
        />

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/90 shrink-0 self-start md:self-auto">
          {(
            [
              { id: 'all', label: 'All Users' },
              { id: 'online', label: 'Online Users' },
              { id: 'live', label: 'LIVE Users' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16">
          <LoadingSpinner label="Searching registered users..." />
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center">
          <Compass className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No users match your filters
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try clearing your search or switching back to All Users.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((person) => (
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
