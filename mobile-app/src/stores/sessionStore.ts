import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@shared/lib/storage/secure-storage';
import { STORAGE_KEYS } from '@shared/lib/storage/storage-keys';
import { configureHttpClientAuth } from '@shared/api';

import { sessionApi } from '../entities/session/api/session.api';
import type { AuthTokens, LoginRequest, RegisterRequest, UpdateProfileRequest, User, ChangePasswordRequest } from '../entities/session/model/types';

type SessionStatus = 'restoring' | 'authenticated' | 'unauthenticated';

interface SessionState {
  status: SessionStatus;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  setTokens: (tokens: AuthTokens) => void;
  setTokensSimple: (accessToken: string, refreshToken: string) => void;
  persistTokens: (tokens: AuthTokens) => Promise<void>;
  clearPersistedTokens: () => Promise<void>;
  restore: () => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  performRefresh: () => Promise<string | null>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  forceLogout: () => Promise<void>;
  updateProfile: (payload: UpdateProfileRequest) => Promise<void>;
  changePassword: (payload: ChangePasswordRequest) => Promise<void>;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      status: 'restoring' as SessionStatus,
      user: null,
      accessToken: null,
      refreshToken: null,

      setTokens: (tokens: AuthTokens) => {
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      },

      setTokensSimple: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      persistTokens: async (tokens: AuthTokens) => {
        await Promise.all([
          secureStorage.setItem(STORAGE_KEYS.session.accessToken, tokens.accessToken),
          secureStorage.setItem(STORAGE_KEYS.session.refreshToken, tokens.refreshToken),
        ]);
      },

      clearPersistedTokens: async () => {
        await Promise.all([
          secureStorage.removeItem(STORAGE_KEYS.session.accessToken),
          secureStorage.removeItem(STORAGE_KEYS.session.refreshToken),
        ]);
      },

      restore: async () => {
        const [storedAccess, storedRefresh] = await Promise.all([
          secureStorage.getItem(STORAGE_KEYS.session.accessToken),
          secureStorage.getItem(STORAGE_KEYS.session.refreshToken),
        ]);

        if (!storedAccess || !storedRefresh) {
          set({ status: 'unauthenticated' });
          return;
        }

        const currentState = get();
        currentState.setTokensSimple(storedAccess, storedRefresh);

        try {
          const user = await sessionApi.getMe();
          set({ user, status: 'authenticated' });
        } catch {
          await currentState.forceLogout();
        }
      },

      register: async (payload: RegisterRequest) => {
        const tokens = await sessionApi.register(payload);
        const currentState = get();
        currentState.setTokensSimple(tokens.accessToken, tokens.refreshToken);
        await currentState.persistTokens(tokens);
        const user = await sessionApi.getMe();
        set({ user, status: 'authenticated' });
      },

      login: async (payload: LoginRequest) => {
        const tokens = await sessionApi.login(payload);
        const currentState = get();
        currentState.setTokensSimple(tokens.accessToken, tokens.refreshToken);
        await currentState.persistTokens(tokens);
        const user = await sessionApi.getMe();
        set({ user, status: 'authenticated' });
      },

      performRefresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return null;

        try {
          const tokens = await sessionApi.refresh(refreshToken);
          const currentState = get();
          currentState.setTokensSimple(tokens.accessToken, tokens.refreshToken);
          await currentState.persistTokens(tokens);
          return tokens.accessToken;
        } catch {
          return null;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await sessionApi.logout(refreshToken);
          }
        } finally {
          await get().forceLogout();
        }
      },

      logoutAll: async () => {
        try {
          await sessionApi.logoutAll();
        } finally {
          await get().forceLogout();
        }
      },

      forceLogout: async () => {
        await get().clearPersistedTokens();
        set({ accessToken: null, refreshToken: null, user: null, status: 'unauthenticated' });
      },

      updateProfile: async (payload: UpdateProfileRequest) => {
        const user = await sessionApi.updateMe(payload);
        set({ user });
      },

      changePassword: async (payload: ChangePasswordRequest) => {
        await sessionApi.changePassword(payload);
        await get().forceLogout();
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          if (name === 'session-storage') {
            const data = await secureStorage.getItem(STORAGE_KEYS.session.accessToken);
            return data ? JSON.stringify({ state: { accessToken: data, refreshToken: await secureStorage.getItem(STORAGE_KEYS.session.refreshToken) } }) : null;
          }
          return null;
        },
        setItem: async (name, value) => {
        },
        removeItem: async (name) => {
        },
      })),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

configureHttpClientAuth({
  getAccessToken: () => useSessionStore.getState().accessToken,
  refreshAccessToken: () => useSessionStore.getState().performRefresh(),
  onUnauthorized: () => useSessionStore.getState().forceLogout(),
});

export function useSessionRestore() {
  const restore = useSessionStore((s) => s.restore);
  const status = useSessionStore((s) => s.status);

  React.useEffect(() => {
    if (status === 'restoring') {
      restore();
    }
  }, [status, restore]);
}