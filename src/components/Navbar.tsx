import { Menu, Moon, Sun } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserAvatar from './UserAvatar';

interface NavbarProps {
  onOpenSidebar: () => void;
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/global-chat')) return 'Global Public Chat';
  if (pathname.startsWith('/discover')) return 'Discover Users';
  if (pathname.startsWith('/online-users')) return 'Online Users';
  if (pathname.startsWith('/live-users')) return 'LIVE Chat Participants';
  if (pathname.startsWith('/requests')) return 'Chat Requests';
  if (pathname.startsWith('/private-chat')) return 'Private Messages';
  if (pathname.startsWith('/profile')) return 'User Profile';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'RelayRoom';
}

export default function Navbar({ onOpenSidebar }: NavbarProps) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, wsConnected, getPresenceStatus } = useAuth();

  const title = getPageTitle(pathname);
  const status = user ? getPresenceStatus(user.id) : 'OFFLINE';

  return (
    <header className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          className="p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
            wsConnected
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          <span>{wsConnected ? 'Socket Connected' : 'Reconnecting'}</span>
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {user && (
          <Link
            to={`/profile/${user.id}`}
            className="hidden sm:flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0"
          >
            <UserAvatar name={user.fullName} src={user.profileImage} size="xs" status={status} />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
              {user.fullName}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
