import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Check, Clock, MessageSquare, Settings, UserPlus } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import UserAvatar from '../components/UserAvatar';
import UserStatus from '../components/UserStatus';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { websocketService } from '../services/websocketService';
import type { User } from '../types';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, getPresenceStatus, addToast, refreshPendingRequests } = useAuth();

  const targetId = userId ? Number(userId) : currentUser?.id;
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!targetId) return;
    try {
      const data = await userService.getUserById(targetId);
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load user profile.'));
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    setLoading(true);
    loadProfile();
    const unsub = websocketService.on('request:updated', () => loadProfile());
    const unsubRec = websocketService.on('request:received', () => loadProfile());
    return () => {
      unsub();
      unsubRec();
    };
  }, [loadProfile]);

  const handleSendRequest = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await chatService.sendChatRequest(profile.id);
      addToast({
        title: 'Chat Request Sent',
        message: `Request delivered to ${profile.fullName}.`,
        variant: 'success',
      });
      await loadProfile();
    } catch (err) {
      addToast({
        title: 'Request Failed',
        message: extractErrorMessage(err, 'Unable to send chat request.'),
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!profile?.requestId) return;
    setBusy(true);
    try {
      const accepted = await chatService.acceptRequest(profile.requestId);
      await refreshPendingRequests();
      addToast({
        title: 'Connected',
        message: `You can now chat privately with ${profile.fullName}.`,
        variant: 'success',
      });
      navigate(`/private-chat/${accepted.conversationId}`);
    } catch (err) {
      addToast({
        title: 'Action Failed',
        message: extractErrorMessage(err, 'Unable to accept request.'),
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner label="Loading profile..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
        <p className="text-sm text-rose-600 dark:text-rose-400">{error || 'Profile not found.'}</p>
        <Link
          to="/discover"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Discover Users</span>
        </Link>
      </div>
    );
  }

  const isSelf = currentUser?.id === profile.id;
  const liveStatus = getPresenceStatus(profile.id);
  const joinedDate = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="max-w-3xl space-y-6 pb-8">
      <Link
        to="/discover"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Discover Users</span>
      </Link>

      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <UserAvatar
              name={profile.fullName}
              src={profile.profileImage}
              size="xl"
              status={liveStatus}
            />
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                {profile.fullName}
              </h2>
              <div className="flex items-center gap-2.5 mt-1 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="font-mono">@{profile.username}</span>
                <span aria-hidden="true">·</span>
                <UserStatus status={liveStatus} />
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {isSelf ? (
              <Link
                to="/settings"
                className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Settings className="w-4 h-4" />
                <span>Edit Profile</span>
              </Link>
            ) : profile.relationship === 'CONNECTED' && profile.conversationId ? (
              <Link
                to={`/private-chat/${profile.conversationId}`}
                className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Private Chat</span>
              </Link>
            ) : profile.relationship === 'PENDING_OUTGOING' ? (
              <span className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0">
                <Clock className="w-4 h-4" />
                <span>Request Pending</span>
              </span>
            ) : profile.relationship === 'PENDING_INCOMING' ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleAcceptRequest}
                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Accept Chat Request</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={handleSendRequest}
                className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{busy ? 'Sending...' : 'Send Chat Request'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">About</h3>
            <p className="mt-1 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {profile.bio || 'No bio added yet.'}
            </p>
          </div>

          <div className="flex items-center gap-6 flex-wrap text-xs text-slate-500 dark:text-slate-400 pt-2">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined {joinedDate}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {profile.globalMessageCount ?? 0} global messages sent
            </span>
            {isSelf && profile.email && (
              <>
                <span aria-hidden="true">·</span>
                <span>{profile.email}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
