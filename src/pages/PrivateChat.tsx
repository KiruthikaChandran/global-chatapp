import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, MessageSquareLock } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import LoadingSpinner from '../components/LoadingSpinner';
import UserAvatar from '../components/UserAvatar';
import UserStatus from '../components/UserStatus';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import { chatService } from '../services/chatService';
import { websocketService } from '../services/websocketService';
import type { Conversation, PrivateMessage } from '../types';

export default function PrivateChat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, getPresenceStatus } = useAuth();

  const selectedId = conversationId ? Number(conversationId) : null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [typingName, setTypingName] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
      setListError(null);
      if (!selectedId && data.length > 0 && window.innerWidth >= 768) {
        navigate(`/private-chat/${data[0].id}`, { replace: true });
      }
    } catch (err) {
      setListError(extractErrorMessage(err, 'Unable to load private conversations.'));
    } finally {
      setLoadingList(false);
    }
  }, [navigate, selectedId]);

  useEffect(() => {
    websocketService.setInChatRoom(true);
    loadConversations();

    return () => {
      websocketService.setInChatRoom(false);
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setMsgError(null);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);
    setMsgError(null);
    setTypingName(null);

    async function fetchHistory() {
      try {
        const history = await chatService.getPrivateMessages(selectedId!);
        if (!cancelled) {
          setMessages(history);
        }
      } catch (err) {
        if (!cancelled) {
          setMsgError(extractErrorMessage(err, 'Unable to load private conversation.'));
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }
    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    const unsubMsg = websocketService.on('private:message', (incoming: PrivateMessage) => {
      if (incoming.conversationId === selectedId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === incoming.conversationId
            ? {
                ...c,
                lastMessage: {
                  id: incoming.id,
                  senderId: incoming.senderId,
                  message: incoming.message,
                  createdAt: incoming.createdAt,
                },
              }
            : c
        )
      );
    });

    const unsubTyping = websocketService.on(
      'typing:private',
      (payload: { conversationId: number; userId: number; fullName: string; isTyping: boolean }) => {
        if (payload.conversationId !== selectedId || payload.userId === user?.id) return;
        setTypingName(payload.isTyping ? payload.fullName : null);
      }
    );

    const unsubReq = websocketService.on('request:updated', () => {
      loadConversations();
    });

    return () => {
      unsubMsg();
      unsubTyping();
      unsubReq();
    };
  }, [selectedId, user?.id, loadConversations]);

  const activeConversation = conversations.find((c) => c.id === selectedId) || null;

  const handleSend = async (text: string) => {
    if (!selectedId) return;
    const sentViaWs = websocketService.send('private:send', {
      conversationId: selectedId,
      message: text,
    });
    if (!sentViaWs) {
      const saved = await chatService.postPrivateMessage(selectedId, text);
      setMessages((prev) => {
        if (prev.some((m) => m.id === saved.id)) return prev;
        return [...prev, saved];
      });
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!selectedId) return;
    websocketService.send('typing:private', { conversationId: selectedId, isTyping });
  };

  if (loadingList) {
    return (
      <div className="py-20">
        <LoadingSpinner label="Loading private conversations..." />
      </div>
    );
  }

  if (listError) {
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-rose-600 dark:text-rose-400">
        {listError}
      </div>
    );
  }

  if (conversations.length === 0 && !selectedId) {
    return (
      <div className="p-12 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto mt-6">
        <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-3">
          <MessageSquareLock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          No private conversations yet
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
          Send a chat request from Discover Users or accept an incoming request to start a private conversation.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/discover"
            className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold inline-flex items-center transition-colors"
          >
            Discover Users
          </Link>
          <Link
            to="/requests"
            className="h-9 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center transition-colors"
          >
            View Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex gap-5">
      <aside
        className={`${
          selectedId ? 'hidden md:flex' : 'flex'
        } w-full md:w-72 shrink-0 flex-col bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden`}
      >
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Conversations
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {conversations.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {conversations.map((conv) => {
            const partnerStatus = getPresenceStatus(conv.partner.id);
            const active = conv.id === selectedId;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => navigate(`/private-chat/${conv.id}`)}
                className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors cursor-pointer ${
                  active
                    ? 'bg-violet-50 dark:bg-violet-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <UserAvatar
                  name={conv.partner.fullName}
                  src={conv.partner.profileImage}
                  size="sm"
                  status={partnerStatus}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-semibold truncate ${
                        active
                          ? 'text-violet-700 dark:text-violet-300'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {conv.partner.fullName}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {conv.lastMessage ? conv.lastMessage.message : `@${conv.partner.username}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div
        className={`${
          selectedId ? 'flex' : 'hidden md:flex'
        } flex-1 min-w-0 min-h-0 flex-col`}
      >
        {selectedId ? (
          <>
            {activeConversation && (
              <div className="mb-3 px-4 py-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate('/private-chat')}
                    aria-label="Back to conversations"
                    className="p-1.5 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Link to={`/profile/${activeConversation.partner.id}`} className="shrink-0">
                    <UserAvatar
                      name={activeConversation.partner.fullName}
                      src={activeConversation.partner.profileImage}
                      size="sm"
                      status={getPresenceStatus(activeConversation.partner.id)}
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to={`/profile/${activeConversation.partner.id}`}
                      className="text-sm font-semibold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 truncate block"
                    >
                      {activeConversation.partner.fullName}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono">@{activeConversation.partner.username}</span>
                      <span aria-hidden="true">·</span>
                      <UserStatus status={getPresenceStatus(activeConversation.partner.id)} compact />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <ChatWindow
              messages={messages}
              loading={loadingMessages}
              error={msgError}
              emptyTitle="Start your private conversation"
              emptyDescription="Messages here are restricted exclusively to you and this recipient."
              placeholder={
                activeConversation
                  ? `Message ${activeConversation.partner.fullName}...`
                  : 'Write a private message...'
              }
              typingUsers={typingName ? [typingName] : []}
              onSendMessage={handleSend}
              onTypingChange={handleTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-8 text-center">
            <div>
              <MessageSquareLock className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Select a conversation
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Choose a contact from the left panel to view message history.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
