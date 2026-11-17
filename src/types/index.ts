export type PresenceStatus = 'LIVE' | 'ONLINE' | 'OFFLINE';

export type RelationshipStatus =
  | 'SELF'
  | 'NONE'
  | 'PENDING_OUTGOING'
  | 'PENDING_INCOMING'
  | 'CONNECTED';

export interface User {
  id: number;
  fullName: string;
  username: string;
  email?: string;
  profileImage: string;
  bio: string;
  createdAt: string;
  presenceStatus: PresenceStatus;
  relationship?: RelationshipStatus;
  requestId?: number | null;
  conversationId?: number | null;
  globalMessageCount?: number;
}

export interface GlobalMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  senderStatus?: PresenceStatus;
  message: string;
  createdAt: string;
}

export interface ChatRequest {
  id: number;
  senderId: number;
  receiverId: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  conversationId: number | null;
  otherUser: {
    id: number;
    fullName: string;
    username: string;
    profileImage: string;
    bio?: string;
    presenceStatus: PresenceStatus;
  };
}

export interface Conversation {
  id: number;
  createdAt: string;
  partner: {
    id: number;
    fullName: string;
    username: string;
    profileImage: string;
    bio?: string;
    presenceStatus: PresenceStatus;
  };
  lastMessage: {
    id: number;
    senderId: number;
    message: string;
    createdAt: string;
  } | null;
}

export interface PrivateMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  message: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  onlineUsers: number;
  liveUsers: number;
  pendingRequests: number;
  recentGlobalMessages: GlobalMessage[];
  recentlyActiveUsers: User[];
}

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  variant: 'info' | 'success' | 'error';
}

export const PRESET_AVATARS = [
  {
    id: 'avatar-1',
    label: 'Portrait 1',
    url: '/src/assets/images/avatar_portrait_one_1794937598594.jpg',
  },
  {
    id: 'avatar-2',
    label: 'Portrait 2',
    url: '/src/assets/images/avatar_portrait_two_1794937598656.jpg',
  },
  {
    id: 'avatar-3',
    label: 'Portrait 3',
    url: '/src/assets/images/avatar_portrait_three_1794937598818.jpg',
  },
  {
    id: 'avatar-4',
    label: 'Portrait 4',
    url: '/src/assets/images/avatar_portrait_four_1794937599330.jpg',
  },
] as const;
