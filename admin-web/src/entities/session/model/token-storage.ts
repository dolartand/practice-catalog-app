// Хранилище сессии (docs/frontend/web/04-auth.md §2):
// accessToken — только в памяти; refreshToken и кэш профиля — localStorage.

import type { User } from './types';

const REFRESH_TOKEN_KEY = 'admin.refreshToken';
const USER_KEY = 'admin.user';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export const tokenStorage = {
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getCachedUser(): User | null {
    return readJson<User>(USER_KEY);
  },
  setCachedUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
