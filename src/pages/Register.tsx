import React, { useState } from 'react';
import { AtSign, Check, Eye, EyeOff, Lock, Mail, Moon, Sun, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { extractErrorMessage } from '../services/api';
import { PRESET_AVATARS } from '../types';

export default function Register() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string>(PRESET_AVATARS[0].url);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): string | null => {
    if (fullName.trim().length < 2) return 'Full name must be at least 2 characters.';
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) {
      return 'Username must be 3–24 characters using letters, numbers, or underscores.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (password !== confirmPassword) {
      return 'Password and Confirm Password do not match.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        profileImage,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Registration failed. Please check your details.'));
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

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Create your account
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Register to join global discussions, discover members, and send private chat requests.
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
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Select Profile Avatar
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_AVATARS.map((avatar) => {
                  const selected = profileImage === avatar.url;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setProfileImage(avatar.url)}
                      className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-transform cursor-pointer ${
                        selected
                          ? 'border-violet-600 scale-105'
                          : 'border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {selected && (
                        <span className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setProfileImage('')}
                  className={`h-12 px-3.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    profileImage === ''
                      ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Use Initials
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-fullname"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Maya Lin"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-username"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="maya_lin"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maya@example.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full h-11 pl-10 pr-10 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600"
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

              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already registered?{' '}
            <Link
              to="/login"
              className="font-semibold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
