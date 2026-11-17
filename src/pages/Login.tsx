import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Moon, Sun, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { extractErrorMessage } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please enter both your username/email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ identifier: identifier.trim(), password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to sign in. Please verify your credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      <header className="h-16 px-6 flex items-center justify-between max-w-[1200px] w-full mx-auto">
        <Link to="/login" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
            R
          </div>
          <span className="text-lg font-bold tracking-tight">RelayRoom</span>
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign in to RelayRoom
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Connect to the global room and private conversations in real time.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. alex_dev or alex@example.com"
                  className="w-full h-11 pl-10 pr-4 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 pl-10 pr-11 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            New to RelayRoom?{' '}
            <Link
              to="/register"
              className="font-semibold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
