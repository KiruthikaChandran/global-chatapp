import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { PresenceStatus } from '../types';
import LoadingSpinner from './LoadingSpinner';
import MessageBubble from './MessageBubble';

export interface ChatMessageItem {
  id: number;
  senderId: number;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  senderStatus?: PresenceStatus;
  message: string;
  createdAt: string;
}

interface ChatWindowProps {
  messages: ChatMessageItem[];
  loading: boolean;
  error?: string | null;
  emptyTitle: string;
  emptyDescription: string;
  placeholder?: string;
  typingUsers?: string[];
  onSendMessage: (text: string) => Promise<void> | void;
  onTypingChange?: (isTyping: boolean) => void;
}

export default function ChatWindow({
  messages,
  loading,
  error,
  emptyTitle,
  emptyDescription,
  placeholder = 'Write a message...',
  typingUsers = [],
  onSendMessage,
  onTypingChange,
}: ChatWindowProps) {
  const { user, getPresenceStatus } = useAuth();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!onTypingChange) return;
    onTypingChange(value.trim().length > 0);
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
    if (value.trim().length > 0) {
      typingTimerRef.current = window.setTimeout(() => {
        onTypingChange(false);
      }, 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSendMessage(trimmed);
      setDraft('');
      onTypingChange?.(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50/70 dark:bg-[#0E1629] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
        {loading ? (
          <div className="h-full flex items-center justify-center py-12">
            <LoadingSpinner label="Loading messages..." />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center py-12">
            <div className="text-center max-w-md px-4">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-14 px-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {emptyTitle}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {emptyDescription}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              senderId={msg.senderId}
              senderName={msg.senderName}
              senderUsername={msg.senderUsername}
              senderAvatar={msg.senderAvatar}
              senderStatus={getPresenceStatus(msg.senderId)}
              message={msg.message}
              createdAt={msg.createdAt}
              isOwn={user?.id === msg.senderId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="px-5 py-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium border-t border-slate-200/70 dark:border-slate-800/80 bg-white/60 dark:bg-[#111827]/60">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          placeholder={placeholder}
          maxLength={2000}
          className="flex-1 min-w-0 h-11 px-4 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-violet-600/30 focus:border-violet-600 transition-colors"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}
