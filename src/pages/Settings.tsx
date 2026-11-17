import React, { useState } from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { extractErrorMessage } from '../services/api';
import { userService } from '../services/userService';
import { PRESET_AVATARS } from '../types';

export default function Settings() {
  const { user, updateUser, addToast, getPresenceStatus } = useAuth();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (fullName.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters.');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await userService.updateSettings({
        fullName: fullName.trim(),
        bio: bio.trim(),
        profileImage,
      });
      updateUser(updated);
      addToast({
        title: 'Profile Updated',
        message: 'Your profile preferences have been saved.',
        variant: 'success',
      });
    } catch (err) {
      setProfileError(extractErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!currentPassword || !newPassword) {
      setPasswordError('Please provide both your current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      await userService.updateSettings({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      addToast({
        title: 'Password Changed',
        message: 'Your account password has been updated securely.',
        variant: 'success',
      });
    } catch (err) {
      setPasswordError(extractErrorMessage(err, 'Failed to update password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 pb-10">
      <section className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Appearance
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Choose between light and dark interface themes.
        </p>

        <div className="mt-4 inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#0B1120] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark Mode</span>
          </button>
        </div>
      </section>

      <section className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-6">
          {user && (
            <UserAvatar
              name={fullName || user.fullName}
              src={profileImage}
              size="lg"
              status={getPresenceStatus(user.id)}
            />
          )}
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Profile Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update your display name, avatar, and public bio.
            </p>
          </div>
        </div>

        {profileError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-700 dark:text-rose-300">
            {profileError}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Avatar
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
                htmlFor="settings-fullname"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="settings-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600"
              />
            </div>
            <div>
              <label
                htmlFor="settings-username"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                disabled
                value={user ? `@${user.username}` : ''}
                className="w-full h-10 px-3.5 rounded-xl text-sm font-mono bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="settings-bio"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Bio
            </label>
            <textarea
              id="settings-bio"
              rows={3}
              maxLength={240}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share a brief note about yourself..."
              className="w-full p-3.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </section>

      <section className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Security & Password
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Update your password. Passwords are encrypted with BCrypt on the server.
        </p>

        {passwordError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-700 dark:text-rose-300">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="settings-cur-pw"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Current Password
              </label>
              <input
                id="settings-cur-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600"
              />
            </div>
            <div>
              <label
                htmlFor="settings-new-pw"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                New Password
              </label>
              <input
                id="settings-new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full h-10 px-3.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="h-10 px-5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  );
}
