// Единственное место с путями REST API (без префикса /api/v1 — он в baseURL http-клиента).
// При изменении контракта правится только этот файл.

export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    changePassword: '/auth/change-password',
    me: '/auth/me',
  },

  categories: {
    root: '/categories',
  },

  products: {
    list: '/products',
    byId: (id: string) => `/products/${id}`,
    reviews: (productId: string) => `/products/${productId}/reviews`,
  },

  cart: {
    getCart: '/cart',
    items: '/cart/items',
    item: (itemId: string) => `/cart/items/${itemId}`,
  },

  favorites: {
    root: '/favorites',
    product: (productId: string) => `/favorites/${productId}`,
  },

  orders: {
    root: '/orders',
    byId: (orderId: string) => `/orders/${orderId}`,
    cancel: (orderId: string) => `/orders/${orderId}/cancel`,
  },

  reviews: {
    byId: (reviewId: string) => `/reviews/${reviewId}`,
  },
} as const;
