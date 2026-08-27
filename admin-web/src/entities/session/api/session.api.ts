import type { AuthTokens, LoginRequest, User } from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';


export const sessionApi = {
  async login(payload: LoginRequest): Promise<AuthTokens> {
    const { data } = await httpClient.post<AuthTokens>(API_ENDPOINTS.auth.login, payload);
    return data;
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await httpClient.post<AuthTokens>(API_ENDPOINTS.auth.refresh, { refreshToken });
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await httpClient.post(API_ENDPOINTS.auth.logout, { refreshToken });
  },

  async getMe(): Promise<User> {
    const { data } = await httpClient.get<User>(API_ENDPOINTS.auth.me);
    return data;
  },
};
