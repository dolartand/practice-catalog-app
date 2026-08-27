import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const httpClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`,
  timeout: 15_000,
});

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.method && MUTATING_METHODS.has(config.method) && !config.headers['X-Request-Id']) {
    config.headers['X-Request-Id'] = crypto.randomUUID();
  }
  return config;
});

type TokenGetter = () => string | null;
type RefreshHandler = () => Promise<string | null>;
type UnauthorizedHandler = () => void;

let getAccessToken: TokenGetter = () => null;
let refreshAccessToken: RefreshHandler = async () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

// Провайдер сессии (entities/session) подключает свои обработчики при старте.
export function configureHttpClientAuth(handlers: {
  getAccessToken: TokenGetter;
  refreshAccessToken: RefreshHandler;
  onUnauthorized: UnauthorizedHandler;
}) {
  getAccessToken = handlers.getAccessToken;
  refreshAccessToken = handlers.refreshAccessToken;
  onUnauthorized = handlers.onUnauthorized;
}

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: {
  resolve: (token: string | null) => void;
}[] = [];

function resolveQueue(token: string | null) {
  pendingQueue.forEach(({ resolve }) => resolve(token));
  pendingQueue = [];
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const isUnauthorized = error.response?.status === 401;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

    if (!isUnauthorized || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      const token = await new Promise<string | null>((resolve) => pendingQueue.push({ resolve }));
      if (!token) return Promise.reject(error);
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return httpClient(originalRequest);
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      resolveQueue(newToken);

      if (!newToken) {
        onUnauthorized();
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return httpClient(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      resolveQueue(null);
      onUnauthorized();
      return Promise.reject(refreshError);
    }
  },
);
