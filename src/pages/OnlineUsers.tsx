import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import UserCard from '../components/UserCard';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { websocketService } from '../services/websocketService';
import type { User } from '../types';

export default function OnlineUsers() {
  const { addToast, refreshPendingRequests } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const fetchOnline = useCallback(async () => {
    try {
      const data = await userService.getOnlineUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load online users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnline();
    const unsub = websocketService.on('presence:update', () => fetchOnline());
    const unsubReq = websocketService.on('request:updated', () => fetchOnline());
    return () => {
      unsub();
      unsubReq();
    };
  }, [fetchOnline]);

  const handleSendRequest = async (receiverId: number) => {
    setBusyUserId(receiverId);
    try {
      await chatService.sendChatRequest(receiverId);
      addToast({
        title: 'Chat Request Sent',
        message: 'Your private chat request is now pending.',
        variant: 'success',
      });
      await fetchOnline();
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
      await fetchOnline();
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
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Members currently connected to RelayRoom across active browser sessions.
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
          {users.length} Online
        </span>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      {loading ? (
        <div className="py-16">
          <LoadingSpinner label="Checking online users..." />
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No matching online users
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {search ? 'Try adjusting your search query.' : 'No users are currently connected.'}
          </p>
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
