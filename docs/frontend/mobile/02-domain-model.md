# 02. Доменная модель клиента

> Статус: Реализовано (блоки 0–2, 5, 7); избранное/отзывы — в плане
> Версия: 0.1
> Связанные документы: [03. Интеграция с API](03-api-integration.md), [Backend 02. Доменная модель](../../backend/02-domain-model.md), [Контракт API](../../backend/openapi.yml)

Типы клиента зеркалируют контракт бэкенда (см. `openapi.yml`). Цены хранятся и передаются **в копейках** (`*Cents`), форматирование в BYN — только на границе UI.

## 1. Сессия и пользователь

| Модель | Поля |
|---|---|
| `User` | id, имя, email, телефон |
| `AuthTokens` | accessToken, refreshToken |
| Сессия | accessToken, refreshToken, user, isAuthenticated |

## 2. Каталог

| Модель | Поля |
|---|---|
| `Product` | id, name, priceCents, discountPercent, priceWithDiscountCents, series, productType, decor, material, capacityMl, weightG, dimensions, countryOfOrigin, ratingAverage, ratingCount, images[], skus[] |
| `ProductSku` | id, name, article, priceCents?, priceWithDiscountCents?, stockQty, isActive |
| `Category` | рекурсивное дерево: children[] |

Устаревшие `currency` / `oldPrice` из ранних версий удалены.

## 3. Корзина

- Ключ позиции — `sku_id`.
- Флаг `unavailable` для позиций, которых нет в наличии.
- Лимиты: 999 шт/позиция, 100 позиций на корзину.

## 4. Заказы

- Статусы: `NEW / CONFIRMED / DELIVERED / CANCELLED`.
- Поля заказа соответствуют контракту: покупатель (имя, телефон), доставка (город, адрес), комментарий, позиции по SKU.

## 5. Планируемые сущности (блоки 8–9)

| Модель | Замечания |
|---|---|
| Favorite | локальный Set id для optimistic-тоггла + серверная синхронизация |
| Review | рейтинг звёздами + текст; право на создание проверяется по DELIVERED-заказу |

## 6. Общие конверты

- Пагинация: `{ items, page, size, total, totalPages }`, хелпер `hasMore = page + 1 < totalPages` — переиспользуется каталогом, заказами, отзывами.
- Деньги: `formatPrice(priceCents)` → строка BYN (`Intl.NumberFormat('ru-BY')` с фолбэком).
