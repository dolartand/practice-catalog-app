# 03. Интеграция с API

> Статус: Документация готова
> Версия: 0.2 (§6 актуализирован: расширения реализованы бэкендом, commit 7c1aaee)
> Связанные документы: [02. Архитектура](02-architecture.md), [04. Аутентификация](04-auth.md), Backend [03. API](../../backend/03-api-design.md)

За основу взят контракт бэкенда (`docs/backend/03-api-design.md`,
`openapi.yml`) — соглашения (Problem Details, конверт пагинации, копейки)
повторяют мобильную интеграцию 1:1.

## 1. HTTP-клиент

axios-инстанс: `baseURL = VITE_API_BASE_URL ?? '' + /api/v1`, `timeout 15s`.

Интерцепторы:

1. **Request**: если есть accessToken → `Authorization: Bearer …`; для
   мутаций (POST/PATCH/PUT/DELETE) — `X-Request-Id` (crypto.randomUUID()).
2. **Response**: разбор Problem Details в тип `AppError`; 401 → refresh-flow
   из [04-auth.md §3](04-auth.md).

```ts
export interface AppError {
  kind: 'api';
  status: number;
  title: string;
  detail: string;
  fieldErrors: Record<string, string[]>;
}
```

## 2. Конверт пагинации

```ts
interface PageEnvelope<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}
```

Таблицы AntD работают в управляемом режиме: `current/pageSize` →
`page = current - 1`.

## 3. Эндпоинты, используемые админкой

### Аутентификация (см. 04-auth.md)

| Метод | Путь | Заметки |
|---|---|---|
| `POST` | `/auth/login` | email+пароль → токены + профиль |
| `POST` | `/auth/refresh` | ротация refresh |
| `POST` | `/auth/logout` | отзыв refresh-токена |

### Каталог

| Метод | Путь | Заметки |
|---|---|---|
| `GET` | `/categories` | публичное дерево **только активных** |
| `POST` | `/admin/categories` | `{name, slug, parentId?, description?, imageUrl?, sortOrder}` |
| `PATCH` | `/admin/categories/{id}` | + `isActive`; перенос по дереву через `parentId` |
| `DELETE` | `/admin/categories/{id}` | soft; `409` если активные товары/подкатегории |
| `GET` | `/products` | публичный поиск; фильтры `q, categoryId, series, type, inStock, onlyDiscounted, sort, page, size` |
| `GET` | `/products/{id}` | карточка; **только активный товар**, ETag/304 |
| `POST` | `/admin/products` | все поля контракта, цены в копейках |
| `PATCH` | `/admin/products/{id}` | частичное; ответ — adminCard (вкл. неактивные SKU) |
| `DELETE` | `/admin/products/{id}` | soft delete |
| `POST` | `/admin/products/{id}/skus` | `{name, article, priceCents?, discountPercent?, stockQty}` |
| `PATCH` | `/admin/skus/{id}` | `{name?, priceCents?, discountPercent?, stockQty?, isActive?}` |
| `DELETE` | `/admin/skus/{id}` | деактивация |
| `POST` | `/admin/products/{id}/images` | multipart: `file` + `position?` + `isMain`; JPEG/PNG/WebP ≤10МБ |
| `PATCH` | `/admin/images/{id}` | `{position?, isMain?}` |
| `DELETE` | `/admin/images/{id}` | удаление файла из MinIO |

### Заказы и отзывы

| Метод | Путь | Заметки |
|---|---|---|
| `GET` | `/admin/orders` | `status?, page, size` → список **без позиций** |
| `PATCH` | `/admin/orders/{id}/status` | `{status}`; матрица переходов бэкенда |
| `GET` | `/admin/reviews` | `isModerated?, page, size` |
| `PATCH` | `/admin/reviews/{id}/moderation` | `{isModerated}` |

Переходы статусов (сервер валидирует, UI показывает только допустимые):

```
NEW ──→ CONFIRMED ──→ DELIVERED
 │            │
 └──→ CANCELLED ←──┘        DELIVERED, CANCELLED — терминальные
```

## 4. Типы домена (ключевые поля)

Полностью повторяют ответы бэкенда; ниже — то, что отличается от мобильных
типов или важно для таблиц.

```ts
// GET /admin/orders → элемент списка
interface AdminOrder {
  id: string; number: string; userId: string;
  status: 'NEW' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
  itemsTotalCents: number; deliveryCents: number; totalCents: number;
  customerName: string; customerPhone: string;
  deliveryCity: string; deliveryAddress: string;
  comment: string | null; createdAt: string; // ISO UTC
}

// GET /admin/reviews → элемент
interface AdminReview {
  id: string; userId: string; productId: string;
  rating: number; text: string;
  moderated: boolean; createdAt: string;
}

// ProductCard (публичная карточка) содержит images[] и skus[] —
// используется как источник при редактировании товара.
```

Деньги: хранение только в копейках; ввод в форме — `<MoneyInput>`
(рубли с копейками, `×100` на границе). Формат отображения: `Intl.NumberFormat('ru-RU', {style:'currency', currency:'BYN'})`.

## 5. Инвалидация кэша после мутаций

| Мутация | Инвалидировать |
|---|---|
| create/update/delete product | `['products']`, `['product', id]`, `['stats']` |
| SKU create/update/deactivate | `['product', id]`, `['products']`, `['stats']` |
| image upload/reorder/delete | `['product', id]`, `['products']` |
| category create/update/delete | `['categories']`, `['products']`, `['stats']` |
| order status change | `['orders']`, `['order', id]`, `['stats']` |
| review moderate | `['reviews']`, `['stats']`, `['product', productId]` |

Публичные кэши бэкенда (Redis, ETag) инвалидируются сервером сами — клиенту
делать нечего.

## 6. Бывшие пробелы бэкенда — реализованы

Расширения реализованы бэкендом (commit `7c1aaee`); итоговые контракты
отличаются от первоначальных предложений — ниже фактические. В коде админки
каждой точке соответствует флаг `features.gaps.*` (сейчас включён) — рубильник
отката на обходные пути.

### 6.1 Список и карточка товаров для администратора → готово

```
GET /api/v1/admin/products?status&q&categoryId&sort&page&size
    status ∈ {ACTIVE (default), INACTIVE, DELETED}
    ⚠ series/type/inStock/onlyDiscounted не поддерживаются;
      categoryId — точное совпадение (без подкатегорий)
→ PageEnvelope<AdminProductListItem>
    AdminProductListItem = { …поля списка, isActive, deletedAt, createdAt }
    ⚠ inStock в ответе нет
GET /api/v1/admin/products/{id} → ProductResponse + {isActive, deletedAt}
```

Следствия для UI: табы статусов вместо пометки «только активные»; реактивация
скрытого товара — PATCH `{isActive: true}`; колонка «Наличие» в админской ветке
заменена на «Статус».

### 6.2 Полное дерево категорий для админа → готово

```
GET /api/v1/admin/categories → AdminCategoryNode[]
    узел = CategoryNode + { isActive, deletedAt, activeProductCount }
```

Путь `/admin/categories/tree` из первоначального предложения не использован —
дерево отдаёт сам `GET /admin/categories`. Публичный `GET /categories`
(активные) остаётся источником для выбора категории в формах.

### 6.3 Состав заказа у оператора → готово

```
GET /api/v1/admin/orders/{id} → AdminOrderDetail:
    реквизиты/адрес/комментарий + items[] (снимки OrderItemResponse)
    + statusHistory[] ({status, byUserId, at})
GET /api/v1/admin/orders → AdminOrderListItem (+itemCount, без позиций)
```

### 6.4 Данные автора и товара в модерации отзывов → готово

```
GET /api/v1/admin/reviews → AdminReviewResponse:
    + productName, productArticle (видны даже для удалённого товара),
      userEmail, userFirstName, userLastName
```

Ленивый резолв товара по публичной карточке больше не нужен.

## 7. Лимиты, проверяемые клиентом

Зеркалят раздел 6 backend 03-api-design.md: name ≤300, slug уникален,
артикул ≤64 уникален, комментарий ≤1000, изображение JPEG/PNG/WebP ≤10 МБ,
`size` ≤100. Полный перечень — в [05-catalog.md §8](05-catalog.md).
