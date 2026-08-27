import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { sessionApi } from '../api/session.api';

import { tokenStorage } from './token-storage';
import type { AuthTokens, LoginRequest, User } from './types';

import { configureHttpClientAuth } from '@shared/api';
import { getFeedback } from '@shared/lib';

export type SessionStatus = 'restoring' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: SessionStatus;
  user: User | null;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** accessToken живёт только в памяти модуля (недоступен XSS при перезапуске страницы) */
let memoryAccessToken: string | null = null;

/** Профиль не роли ADMIN: сессия закрывается сразу после логина */
export class AccessDeniedError extends Error {
  constructor() {
    super('Доступ только для администраторов');
    this.name = 'AccessDeniedError';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('restoring');
  const [user, setUser] = useState<User | null>(() => tokenStorage.getCachedUser());

  const refreshingRef = useRef<Promise<string | null> | null>(null);
  const bootstrappedRef = useRef(false);

  const applyTokens = useCallback((tokens: AuthTokens) => {
    memoryAccessToken = tokens.accessToken;
    tokenStorage.setRefreshToken(tokens.refreshToken);
  }, []);

  const clearSession = useCallback(() => {
    memoryAccessToken = null;
    tokenStorage.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  /** Единичный refresh с ротацией; повторные вызовы делят один запрос */
  const performRefresh = useCallback((): Promise<string | null> => {
    if (refreshingRef.current) return refreshingRef.current;

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return Promise.resolve(null);

    const promise = sessionApi
      .refresh(refreshToken)
      .then((tokens) => {
        applyTokens(tokens);
        return tokens.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshingRef.current = null;
      });

    refreshingRef.current = promise;
    return promise;
  }, [applyTokens]);

  // Вызывается интерцептором, когда refresh не удался.
  const handleSessionExpired = useCallback(() => {
    clearSession();
    try {
      getFeedback().notification.error({
        message: 'Сессия истекла',
        description: 'Войдите заново.',
      });
    } catch {
      // feedback ещё не привязан (ранний 401 до монтирования) — guard сам перенаправит на логин
    }
  }, [clearSession]);

  useEffect(() => {
    configureHttpClientAuth({
      getAccessToken: () => memoryAccessToken,
      refreshAccessToken: performRefresh,
      onUnauthorized: handleSessionExpired,
    });
  }, [performRefresh, handleSessionExpired]);

  // Восстановление сессии при старте приложения (StrictMode защищён ref-флагом).
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    void (async () => {
      if (!tokenStorage.getRefreshToken()) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const accessToken = await performRefresh();
        if (!accessToken) throw new Error('refresh failed');

        const me = await sessionApi.getMe();
        tokenStorage.setCachedUser(me);
        setUser(me);
        setStatus('authenticated');
      } catch {
        clearSession();
      }
    })();
  }, [performRefresh, clearSession]);

  const revokeQuietly = useCallback((refreshToken: string) => {
    return sessionApi.logout(refreshToken).catch(() => undefined);
  }, []);

  const login = useCallback(
    async (payload: LoginRequest) => {
      const tokens = await sessionApi.login(payload);
      applyTokens(tokens);

      let me: User;
      try {
        me = await sessionApi.getMe();
      } catch (error) {
        await revokeQuietly(tokens.refreshToken);
        clearSession();
        throw error;
      }

      // Роль из JWT не парсим — источник истины /auth/me.
      if (me.role !== 'ADMIN') {
        await revokeQuietly(tokens.refreshToken);
        clearSession();
        throw new AccessDeniedError();
      }

      tokenStorage.setCachedUser(me);
      setUser(me);
      setStatus('authenticated');
    },
    [applyTokens, clearSession, revokeQuietly],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      await revokeQuietly(refreshToken);
    }
    clearSession();
  }, [clearSession, revokeQuietly]);

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return ctx;
}
