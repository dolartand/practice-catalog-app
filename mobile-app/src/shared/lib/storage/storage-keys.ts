// Единственное место с ключами локальных хранилищ.
// Менять строки здесь — значит менять их везде.

export const STORAGE_KEYS = {
  /** Токены сессии (expo-secure-store) */
  session: {
    accessToken: 'session.accessToken',
    refreshToken: 'session.refreshToken',
  },

  /** Настройки приложения (kvStorage) */
  settings: {
    language: 'app.language',
  },

  /** Кэш избранного (kvStorage, по пользователю) */
  favoritesIds: (userId: string) => `favorites.ids:${userId}`,

  /** Локальный реестр «моих отзывов» (kvStorage, по пользователю) */
  myReviews: (userId: string) => `reviews.my:${userId}`,

  /** Автозаполнение контактов чекаута (kvStorage) */
  checkoutLastContact: 'checkout.lastContact',
} as const;
