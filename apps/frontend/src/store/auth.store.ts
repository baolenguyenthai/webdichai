import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role?: string;
  credits?: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken?: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, token, refreshToken) => set({ user, accessToken: token, refreshToken: refreshToken || null }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const refreshToken = useAuthStore.getState().refreshToken

    if (error.response?.status === 401 && refreshToken && !originalRequest?._retry) {
      originalRequest._retry = true
      try {
        const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
        useAuthStore.getState().setAuth(
          res.data.data.user,
          res.data.data.tokens.accessToken,
          res.data.data.tokens.refreshToken
        )
        originalRequest.headers.Authorization = `Bearer ${res.data.data.tokens.accessToken}`
        return api(originalRequest)
      } catch {
        useAuthStore.getState().logout()
      }
    }

    return Promise.reject(error)
  }
)
