import { makeAutoObservable, runInAction } from 'mobx';

import { sessionApi } from '../api/session.api';

import type { AuthTokens, LoginRequest, RegisterRequest, UpdateProfileRequest, User, ChangePasswordRequest } from './types';

import { configureHttpClientAuth } from '@shared/api';
import { secureStorage, STORAGE_KEYS } from '@shared/lib';


type SessionStatus = 'restoring' | 'authenticated' | 'unauthenticated';

class SessionStore {
  status: SessionStatus = 'restoring';
  user: User | null = null;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });

    configureHttpClientAuth({
      getAccessToken: () => this.accessToken,
      refreshAccessToken: () => this.performRefresh(),
      onUnauthorized: () => this.forceLogout(),
    });

    this.restore();
  }

  private setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }

  private async persistTokens(tokens: AuthTokens) {
    await Promise.all([
      secureStorage.setItem(STORAGE_KEYS.session.accessToken, tokens.accessToken),
      secureStorage.setItem(STORAGE_KEYS.session.refreshToken, tokens.refreshToken),
    ]);
  }

  private async clearPersistedTokens() {
    await Promise.all([
        secureStorage.removeItem(STORAGE_KEYS.session.accessToken), 
        secureStorage.removeItem(STORAGE_KEYS.session.refreshToken)
    ]);
  }

  async restore() {
    const [storedAccess, storedRefresh] = await Promise.all([
      secureStorage.getItem(STORAGE_KEYS.session.accessToken),
      secureStorage.getItem(STORAGE_KEYS.session.refreshToken),
    ]);

    if (!storedAccess || !storedRefresh) {
      runInAction(() => {
        this.status = 'unauthenticated';
      });
      return;
    }

    this.accessToken = storedAccess;
    this.refreshToken = storedRefresh;

    try {
      const user = await sessionApi.getMe();
      runInAction(() => {
        this.user = user;
        this.status = 'authenticated';
      });
    } catch {
      await this.forceLogout();
    }
  }

  async register(payload: RegisterRequest) {
    const tokens = await sessionApi.register(payload);
    this.setTokens(tokens);
    await this.persistTokens(tokens);
    const user = await sessionApi.getMe();
    runInAction(() => {
      this.user = user;
      this.status = 'authenticated';
    });
  }

  async login(payload: LoginRequest) {
    const tokens = await sessionApi.login(payload);
    this.setTokens(tokens);
    await this.persistTokens(tokens);
    const user = await sessionApi.getMe();
    runInAction(() => {
      this.user = user;
      this.status = 'authenticated';
    });
  }

  private async performRefresh(): Promise<string | null> {
    if (!this.refreshToken) return null;

    try {
      const tokens = await sessionApi.refresh(this.refreshToken);
      this.setTokens(tokens);
      await this.persistTokens(tokens);
      return tokens.accessToken;
    } catch {
      return null;
    }
  }

  async logout() {
    try {
      if (this.refreshToken) {
        await sessionApi.logout(this.refreshToken);
      }
    } finally {
      await this.forceLogout();
    }
  }

  async logoutAll() {
    try {
      await sessionApi.logoutAll();
    } finally {
      await this.forceLogout();
    }
  }

  private async forceLogout() {
    this.accessToken = null;
    this.refreshToken = null;
    await this.clearPersistedTokens();
    runInAction(() => {
      this.user = null;
      this.status = 'unauthenticated';
    });
  }

  async updateProfile(payload: UpdateProfileRequest) {
    const user = await sessionApi.updateMe(payload);
    runInAction(() => {
      this.user = user;
    });
  }

  get isAuthenticated() {
    return this.status === 'authenticated';
  }

  async changePassword(payload: ChangePasswordRequest) {
    await sessionApi.changePassword(payload);
    await this.forceLogout();
  }
}

export const sessionStore = new SessionStore();