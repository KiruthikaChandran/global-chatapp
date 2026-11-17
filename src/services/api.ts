import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'relayroom_jwt_token';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('relayroom:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(err)) {
    const apiErr = err.response?.data as { error?: string; message?: string } | undefined;
    if (apiErr?.error) return apiErr.error;
    if (apiErr?.message) return apiErr.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default api;
