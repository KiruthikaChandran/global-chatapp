import {
  Compass,
  Globe,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquareLock,
  Radio,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import UserStatus from './UserStatus';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout, pendingRequestCount, getPresenceStatus } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/global-chat', label: 'Global Chat', icon: Globe },
    { to: '/discover', label: 'Discover Users', icon: Compass },
    { to: '/online-users', label: 'Online Users', icon: Users },
    { to: '/live-users', label: 'LIVE Users', icon: Radio },
    {
      to: '/requests',
      label: 'Chat Requests',
      icon: Inbox,
      count: pendingRequestCount,
    },
    { to: '/private-chat', label: 'Private Messages', icon: MessageSquareLock },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const myStatus = user ? getPresenceStatus(user.id) : 'OFFLINE';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-out lg:static lg:translate-x-0 shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
              R
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              RelayRoom
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`
                }
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="font-mono tabular-nums text-xs font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          {user && (
            <NavLink
              to={`/profile/${user.id}`}
              onClick={onClose}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
            >
              <UserAvatar
                name={user.fullName}
                src={user.profileImage}
                size="sm"
                status={myStatus}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user.fullName}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono truncate">@{user.username}</span>
                  <span aria-hidden="true">·</span>
                  <UserStatus status={myStatus} compact />
                </div>
              </div>
            </NavLink>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
