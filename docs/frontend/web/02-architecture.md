# 02. Архитектура веб-админки

> Статус: Документация готова
> Версия: 0.1
> Связанные документы: [01. Обзор](01-overview.md), [03. Интеграция с API](03-api-integration.md), [04. Аутентификация](04-auth.md)

## 1. Общая схема

Классическая SPA без SSR. Статика раздаётся отдельно (или тем же хостом, что
API — решается при деплое), все данные — через REST `/api/v1`.

```
Браузер (React SPA)
  ├── React Router      — маршруты, layout админки, guard
  ├── TanStack Query    — серверный кэш, мутации, инвалидация
  ├── axios instance    — baseURL /api/v1, Bearer-токен, refresh-очередь
  └── Ant Design 5      — Layout/Table/Form/Upload/Modal + notification
        │
        ▼
   Spring Boot API (/api/v1) → PostgreSQL, MinIO, Redis, Kafka
```

## 2. Структура проекта

Организуем по фичам (аналог FSD из мобильного приложения, упрощённый под веб):

```
admin-web/
├── index.html
├── vite.config.ts            # proxy /api → localhost:8080 в dev
├── src/
│   ├── app/                  # точка сборки
│   │   ├── router.tsx        # createBrowserRouter, layout, guards
│   │   ├── providers.tsx     # QueryClientProvider, AntD ConfigProvider, AuthContext
│   │   └── query-client.ts   # defaults: retry, staleTime, error handler
│   ├── shared/
│   │   ├── api/              # axios client, endpoints.ts, types Problem Details
│   │   ├── lib/              # money (cents↔формат), даты, статусы, константы
│   │   └── ui/               # обёртки над AntD (PageHeader, MoneyInput, StatusTag…)
│   ├── entities/             # типы + query-хуки домена
│   │   ├── product/          # types, useProducts, useProductCard, mutations SKU/images
│   │   ├── category/
│   │   ├── order/
│   │   ├── review/
│   │   └── session/          # auth-context, login/logout, token storage
│   ├── features/             # составные виджеты форм/действий
│   │   ├── product-form/
│   │   ├── sku-manager/
│   │   ├── image-manager/
│   │   ├── category-tree-editor/
│   │   ├── order-status-actions/
│   │   └── review-moderation-actions/
│   └── pages/                # экраны-маршруты (тонкие, собирают features)
│       ├── login/
│       ├── dashboard/
│       ├── products/         # список + create/edit (вложенный маршрут)
│       ├── categories/
│       ├── orders/
│       └── reviews/
```

Правила зависимостей: `pages → features → entities → shared` (как в мобильном
eslint-plugin-boundaries; настроим тот же плагин).

## 3. Маршруты

| Путь | Экран | Доступ |
|---|---|---|
| `/login` | Вход | публичный |
| `/` | редирект на `/dashboard` | ADMIN |
| `/dashboard` | Сводка | ADMIN |
| `/products` | Таблица товаров | ADMIN |
| `/products/new` | Создание товара | ADMIN |
| `/products/:id` | Редактирование товара (+SKU, изображения) | ADMIN |
| `/categories` | Дерево категорий CRUD | ADMIN |
| `/orders?status=` | Заказы с фильтром по статусу | ADMIN |
| `/orders/:id` | Карточка заказа | ADMIN |
| `/reviews` | Очередь модерации отзывов | ADMIN |
| `*` | 404 | — |

Guard: компонент `RequireAdmin` — если нет валидной сессии → redirect `/login`
с сохранением `from`; после логина возврат на исходный маршрут.

## 4. Состояние и данные

- **Серверное состояние** — только TanStack Query. Ключи кэша:
  `['products', filters]`, `['product', id]`, `['categories']`,
  `['orders', status, page]`, `['order', id]`, `['reviews', moderated, page]`,
  `['stats']`.
- **Мутации** всегда завершаются инвалидацией затронутых ключей
  (`invalidateQueries`) — оптимистичные обновления в v1 не применяем
  (операции редкие, важна достоверность).
- **AuthContext**: `{ user, isAuthenticated }`, токены живут вне React-стейта
  (см. [04-auth.md](04-auth.md)); контекст только для рендера UI.
- **Формы** — неконтролируемый AntD Form; отправка через mutation;
  ошибки полей из Problem Details мапятся `setFields({ name, errors })`.

## 5. Обработка ошибок

Единая точка: интерцептор ответа axios разбирает Problem Details →

| Случай | Поведение |
|---|---|
| 401 | попытка refresh (однократно, очередь запросов), иначе logout + redirect `/login` |
| 403 | notification «Недостаточно прав» |
| 400/422 | если внутри формы — вернуть в mutation onError для `setFields`; иначе notification |
| 409 | notification c `detail` (конфликт перехода/slug) |
| сеть | notification «Нет соединения» |

Глобальный `QueryClient` default: `retry: 1`, `refetchOnWindowFocus: false`,
`staleTime: 30s`.

## 6. Уведомления и подтверждения

- Успех мутаций: `message.success('Товар сохранён')` и т.п.
- Деструктивные действия (удаление товара/категории, отмена заказа, скрытие
  отзыва): `Modal.confirm` с описанием последствий.
- Загрузка файлов — прогресс AntD Upload; лимиты (JPEG/PNG/WebP ≤ 10 МБ)
  проверяются на клиенте до отправки.

## 7. Сборка и окружение

- Dev: Vite dev-server + proxy `/api` → `http://localhost:8080` (CORS не нужен).
- Prod: статическая сборка `dist/`; `VITE_API_BASE_URL` задаёт адрес API
  (по умолчанию тот же origin).
- Node LTS, скрипты: `dev/build/preview/lint/typecheck` — зеркалим мобильные.
