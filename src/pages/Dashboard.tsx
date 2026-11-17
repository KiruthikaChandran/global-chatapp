import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Compass, Globe, Inbox, Radio, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import UserAvatar from '../components/UserAvatar';
import UserStatus from '../components/UserStatus';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import { userService } from '../services/userService';
import { websocketService } from '../services/websocketService';
import type { DashboardStats, GlobalMessage } from '../types';

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const { user, getPresenceStatus } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await userService.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load dashboard data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const unsubPresence = websocketService.on('presence:update', () => {
      fetchStats();
    });
    const unsubGlobal = websocketService.on('global:message', (msg: GlobalMessage) => {
      setStats((prev) => {
        if (!prev) return prev;
        if (prev.recentGlobalMessages.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          recentGlobalMessages: [...prev.recentGlobalMessages, msg].slice(-8),
        };
      });
    });
    const unsubReq = websocketService.on('request:received', () => {
      fetchStats();
    });
    const unsubRegistered = websocketService.on('user:registered', () => {
      fetchStats();
    });

    return () => {
      unsubPresence();
      unsubGlobal();
      unsubReq();
      unsubRegistered();
    };
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <LoadingSpinner label="Loading workspace overview..." />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
        <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">
          {error || 'Dashboard data is unavailable.'}
        </p>
        <button
          type="button"
          onClick={fetchStats}
          className="mt-3 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const statItems = [
    {
      label: 'Registered Users',
      value: stats.totalUsers,
      icon: Users,
      link: '/discover',
      accent: 'text-slate-900 dark:text-white',
    },
    {
      label: 'Online Now',
      value: stats.onlineUsers,
      icon: Globe,
      link: '/online-users',
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'LIVE in Chat',
      value: stats.liveUsers,
      icon: Radio,
      link: '/live-users',
      accent: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Pending Requests',
      value: stats.pendingRequests,
      icon: Inbox,
      link: '/requests',
      accent: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.fullName}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor live community presence, catch up on public messages, and manage private requests.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <Link
            to="/global-chat"
            className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Globe className="w-4 h-4" />
            <span>Open Global Chat</span>
          </Link>
          <Link
            to="/discover"
            className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Users</span>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.link}
              className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700/70 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">{item.label}</span>
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <p className={`mt-3 text-3xl font-bold font-mono tabular-nums ${item.accent}`}>
                {item.value}
              </p>
            </Link>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Global Messages
            </h3>
            <Link
              to="/global-chat"
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Join Room</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {stats.recentGlobalMessages.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No global messages yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Head into the Global Chat room to start the conversation.
                </p>
              </div>
            ) : (
              stats.recentGlobalMessages.map((msg) => (
                <div key={msg.id} className="px-5 py-3.5 flex items-start gap-3">
                  <Link to={`/profile/${msg.senderId}`} className="shrink-0 mt-0.5">
                    <UserAvatar
                      name={msg.senderName}
                      src={msg.senderAvatar}
                      size="sm"
                      status={getPresenceStatus(msg.senderId)}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Link
                        to={`/profile/${msg.senderId}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-violet-600 dark:hover:text-violet-400 truncate"
                      >
                        {msg.senderName}
                      </Link>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                        {formatShortTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 break-words line-clamp-2">
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recently Active Users
            </h3>
            <Link
              to="/discover"
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {stats.recentlyActiveUsers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No other registered users yet.
                </p>
              </div>
            ) : (
              stats.recentlyActiveUsers.map((person) => {
                const liveStatus = getPresenceStatus(person.id);
                return (
                  <Link
                    key={person.id}
                    to={`/profile/${person.id}`}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={person.fullName}
                        src={person.profileImage}
                        size="sm"
                        status={liveStatus}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {person.fullName}
                        </p>
                        <p className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                          @{person.username}
                        </p>
                      </div>
                    </div>
                    <UserStatus status={liveStatus} compact />
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
