// Единственное место с путями REST API (без префикса /api/v1 — он в baseURL http-клиента).
// При изменении контракта правится только этот файл.

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },

  categories: {
    /** Публичное дерево — только активные категории */
    root: '/categories',
    /** Админские CRUD и полное дерево (GET) вкл. неактивные/удалённые */
    adminRoot: '/admin/categories',
    adminById: (id: string) => `/admin/categories/${id}`,
  },

  products: {
    list: '/products',
    byId: (id: string) => `/products/${id}`,
    /** Список любого статуса (?status=ACTIVE|INACTIVE|DELETED) */
    adminRoot: '/admin/products',
    /** Карточка в любом статусе вкл. неактивные SKU */
    adminById: (id: string) => `/admin/products/${id}`,
    skus: (productId: string) => `/admin/products/${productId}/skus`,
    images: (productId: string) => `/admin/products/${productId}/images`,
  },

  skus: {
    byId: (id: string) => `/admin/skus/${id}`,
  },

  images: {
    byId: (id: string) => `/admin/images/${id}`,
  },

  orders: {
    adminRoot: '/admin/orders',
    /** Детали заказа: позиции + statusHistory */
    adminById: (id: string) => `/admin/orders/${id}`,
    adminStatus: (id: string) => `/admin/orders/${id}/status`,
  },

  reviews: {
    byProduct: (productId: string) => `/products/${productId}/reviews`,
    adminRoot: '/admin/reviews',
    adminModeration: (id: string) => `/admin/reviews/${id}/moderation`,
  },
} as const;
