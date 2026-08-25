import type {
  AuthTokens,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  User,
} from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';


export const sessionApi = {
  async register(payload: RegisterRequest): Promise<AuthTokens> {
    const { data } = await httpClient.post<AuthTokens>(API_ENDPOINTS.auth.register, payload);
    return data;
  },

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

  async logoutAll(): Promise<void> {
    await httpClient.post(API_ENDPOINTS.auth.logoutAll);
  },

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await httpClient.post(API_ENDPOINTS.auth.changePassword, payload);
  },

  async getMe(): Promise<User> {
    const { data } = await httpClient.get<User>(API_ENDPOINTS.auth.me);
    return data;
  },

  async updateMe(payload: UpdateProfileRequest): Promise<User> {
    const { data } = await httpClient.patch<User>(API_ENDPOINTS.auth.me, payload);
    return data;
  },
};