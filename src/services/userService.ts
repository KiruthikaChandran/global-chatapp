import api from './api';
import type { DashboardStats, User } from '../types';

export interface UpdateSettingsPayload {
  fullName?: string;
  bio?: string;
  profileImage?: string;
  currentPassword?: string;
  newPassword?: string;
}

export const userService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>('/dashboard/stats');
    return data;
  },

  async getAllUsers(q = '', filter: 'all' | 'online' | 'live' = 'all'): Promise<User[]> {
    const { data } = await api.get<{ users: User[] }>('/users', {
      params: { q, filter },
    });
    return data.users;
  },

  async getOnlineUsers(): Promise<User[]> {
    const { data } = await api.get<{ users: User[] }>('/users/online');
    return data.users;
  },

  async getLiveUsers(): Promise<User[]> {
    const { data } = await api.get<{ users: User[] }>('/users/live');
    return data.users;
  },

  async getUserById(userId: number): Promise<User> {
    const { data } = await api.get<{ user: User }>(`/users/${userId}`);
    return data.user;
  },

  async updateSettings(payload: UpdateSettingsPayload): Promise<User> {
    const { data } = await api.put<{ user: User }>('/users/me', payload);
    return data.user;
  },
};
