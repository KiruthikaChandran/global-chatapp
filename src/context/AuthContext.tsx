import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TOKEN_STORAGE_KEY } from '../services/api';
import { authService, type LoginPayload, type RegisterPayload } from '../services/authService';
import { chatService } from '../services/chatService';
import { websocketService } from '../services/websocketService';
import type { PresenceStatus, ToastItem, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  wsConnected: boolean;
  presenceMap: Record<number, 'LIVE' | 'ONLINE'>;
  pendingRequestCount: number;
  toasts: ToastItem[];
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  getPresenceStatus: (userId: number) => PresenceStatus;
  refreshPendingRequests: () => Promise<void>;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [presenceMap, setPresenceMap] = useState<Record<number, 'LIVE' | 'ONLINE'>>({});
  const [pendingRequestCount, setPendingRequestCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  const refreshPendingRequests = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) return;
    try {
      const incoming = await chatService.getIncomingRequests();
      setPendingRequestCount(incoming.filter((r) => r.status === 'PENDING').length);
    } catch {
      // Ignore transient error
    }
  }, []);

  const logout = useCallback(() => {
    websocketService.disconnect();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setPresenceMap({});
    setPendingRequestCount(0);
    setWsConnected(false);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('relayroom:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('relayroom:unauthorized', handleUnauthorized);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await authService.me();
        if (!cancelled) {
          setUser(me);
          setToken(storedToken);
        }
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token || !user) {
      websocketService.disconnect();
      return;
    }

    websocketService.connect(token);
    refreshPendingRequests();

    const unsubConn = websocketService.on('ws:connected', (payload: { connected: boolean }) => {
      setWsConnected(payload.connected);
    });

    const unsubSync = websocketService.on(
      'presence:sync',
      (payload: { presenceMap: Record<number, 'LIVE' | 'ONLINE'> }) => {
        setPresenceMap(payload.presenceMap || {});
      }
    );

    const unsubPresence = websocketService.on(
      'presence:update',
      (payload: { presenceMap: Record<number, 'LIVE' | 'ONLINE'> }) => {
        if (payload.presenceMap) {
          setPresenceMap(payload.presenceMap);
        }
      }
    );

    const unsubReqReceived = websocketService.on(
      'request:received',
      (payload: { sender?: { fullName: string; username: string } }) => {
        refreshPendingRequests();
        if (payload.sender) {
          addToast({
            title: 'New Chat Request',
            message: `${payload.sender.fullName} (@${payload.sender.username}) wants to connect.`,
            variant: 'info',
          });
        }
      }
    );

    const unsubReqUpdated = websocketService.on(
      'request:updated',
      (payload: { status: string; acceptedBy?: { fullName: string } }) => {
        refreshPendingRequests();
        if (payload.status === 'ACCEPTED' && payload.acceptedBy) {
          addToast({
            title: 'Request Accepted',
            message: `${payload.acceptedBy.fullName} accepted your private chat request.`,
            variant: 'success',
          });
        }
      }
    );

    return () => {
      unsubConn();
      unsubSync();
      unsubPresence();
      unsubReqReceived();
      unsubReqUpdated();
    };
  }, [token, user, refreshPendingRequests, addToast]);

  const login = async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
  };

  const getPresenceStatus = useCallback(
    (userId: number): PresenceStatus => {
      return presenceMap[userId] ?? 'OFFLINE';
    },
    [presenceMap]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        wsConnected,
        presenceMap,
        pendingRequestCount,
        toasts,
        login,
        register,
        logout,
        updateUser,
        getPresenceStatus,
        refreshPendingRequests,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
