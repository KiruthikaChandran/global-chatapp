import api from './api';
import type { User } from '../types';

export interface RegisterPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  profileImage?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  },
};
