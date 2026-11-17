import { useCallback, useEffect, useState } from 'react';
import { Radio, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { websocketService } from '../services/websocketService';
import type { GlobalMessage, User } from '../types';

export default function GlobalChat() {
  const { user, getPresenceStatus } = useAuth();
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [liveUsers, setLiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingMap, setTypingMap] = useState<Record<number, string>>({});

  const loadLiveParticipants = useCallback(async () => {
    try {
      const data = await userService.getLiveUsers();
      setLiveUsers(data);
    } catch {
      // Ignore transient error
    }
  }, []);

  useEffect(() => {
    websocketService.setInChatRoom(true);

    let cancelled = false;
    async function init() {
      try {
        const [history, live] = await Promise.all([
          chatService.getGlobalMessages(),
          userService.getLiveUsers(),
        ]);
        if (!cancelled) {
          setMessages(history);
          setLiveUsers(live);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractErrorMessage(err, 'Unable to load global chat messages.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();

    const unsubMsg = websocketService.on('global:message', (incoming: GlobalMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });

    const unsubPresence = websocketService.on('presence:update', () => {
      loadLiveParticipants();
    });

    const unsubTyping = websocketService.on(
      'typing:global',
      (payload: { userId: number; fullName: string; isTyping: boolean }) => {
        if (payload.userId === user?.id) return;
        setTypingMap((prev) => {
          const next = { ...prev };
          if (payload.isTyping) {
            next[payload.userId] = payload.fullName;
          } else {
            delete next[payload.userId];
          }
          return next;
        });
      }
    );

    return () => {
      cancelled = true;
      websocketService.setInChatRoom(false);
      unsubMsg();
      unsubPresence();
      unsubTyping();
    };
  }, [loadLiveParticipants, user?.id]);

  const handleSend = async (text: string) => {
    const sentViaWs = websocketService.send('global:send', { message: text });
    if (!sentViaWs) {
      const saved = await chatService.postGlobalMessage(text);
      setMessages((prev) => {
        if (prev.some((m) => m.id === saved.id)) return prev;
        return [...prev, saved];
      });
    }
  };

  const handleTyping = (isTyping: boolean) => {
    websocketService.send('typing:global', { isTyping });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5">
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Shared real-time channel for all registered RelayRoom members.
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 font-mono tabular-nums whitespace-nowrap shrink-0">
            <Radio className="w-3.5 h-3.5" />
            <span>{liveUsers.length} LIVE</span>
          </span>
        </div>

        <ChatWindow
          messages={messages}
          loading={loading}
          error={error}
          emptyTitle="No messages in Global Chat yet"
          emptyDescription="Be the first to say hello to the community. Messages appear live for everyone connected."
          placeholder="Message Global Chat..."
          typingUsers={Object.values(typingMap)}
          onSendMessage={handleSend}
          onTypingChange={handleTyping}
        />
      </div>

      <aside className="hidden xl:flex w-64 shrink-0 flex-col bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Active in Room</span>
          </span>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {liveUsers.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {liveUsers.length === 0 ? (
            <div className="p-5 text-xs text-slate-500 dark:text-slate-400 text-center">
              You are entering the room...
            </div>
          ) : (
            liveUsers.map((member) => (
              <Link
                key={member.id}
                to={`/profile/${member.id}`}
                className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <UserAvatar
                  name={member.fullName}
                  src={member.profileImage}
                  size="sm"
                  status={getPresenceStatus(member.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {member.fullName}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 truncate">
                    @{member.username}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
