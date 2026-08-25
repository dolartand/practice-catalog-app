// Числовые константы приложения. Лимиты валидации зеркалят контракт бэкенда —
// при изменении контракта правятся вместе с endpoints.ts.

/** Размер страницы по умолчанию для списков (каталог/заказы/избранное; потолок бэкенда 100) */
export const DEFAULT_PAGE_SIZE = 20;

/** Страница отзывов на детальной странице товара */
export const REVIEWS_PAGE_SIZE = 10;

/** Полная синхронизация Set избранного при входе: страница и потолок страниц */
export const FAVORITES_SYNC = { SIZE: 100, MAX_PAGES: 5 } as const;

/** Валидация профиля — PATCH /auth/me */
export const NAME_MAX_LENGTH = 100;
export const PHONE_MAX_LENGTH = 30;

/** Валидация текста отзыва — POST/PATCH reviews (@Size(min=1, max=2000)) */
export const REVIEW_TEXT_MAX_LENGTH = 2000;
