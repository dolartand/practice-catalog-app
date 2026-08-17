# 02. Модель данных

> Статус: черновик
> Версия: 0.1
> Связанные документы: [01. Архитектура](01-architecture.md), [03. Дизайн API](03-api-design.md), [05. Заказы](05-orders.md)

## 1. Общие принципы

- **Идентификаторы:** UUID (v7 или v4) для всех сущностей. UUID скрывает порядок создания записей и удобен для мобильного API (без утечки информации о количестве записей).
- **Аудит:** у каждой сущности поля `created_at`, `updated_at` (заполняются приложением, UTC).
- **Мягкое удаление (soft delete):** поле `deleted_at` у товаров и категорий. Физическое удаление запрещено; удалённые записи исключаются из выборок (глобальный фильтр в репозиториях).
- **Деньги:** целое число в копейках (`bigint`/`integer`), без `float`/`double`. Валюта одна — BYN. Хранение в малых единицах исключает ошибки округления.
- **Даты:** `timestamp with time zone`, всегда UTC. В API — ISO-8601.
- **Остатки:** только на уровне SKU (варианта товара), один склад в v1.
- **Снимки:** данные, влияющие на документ (цены, названия), копируются в документ на момент создания — заказ не меняется при изменении каталога.
- **Рейтинг:** агрегированное значение хранится на товаре (`rating_average`, `rating_count`) и обновляется асинхронно по событию из модуля `review` (см. [06-events.md](06-events.md)).

## 2. Модуль auth

```plantuml
@startuml
!theme plain

class User {
  + id: UUID
  + email: varchar(320) [unique]
  + password_hash: varchar(255)
  + first_name: varchar(100)
  + last_name: varchar(100)
  + phone: varchar(30)
  + role: enum { USER, ADMIN }
  + email_verified: boolean
  + created_at: timestamptz
  + updated_at: timestamptz
}

class RefreshToken {
  + id: UUID
  + user_id: UUID [FK -> User]
  + jti: varchar(36)
  + expires_at: timestamptz
  + revoked_at: timestamptz [nullable]
  + created_at: timestamptz
}

User "1" --> "0..*" RefreshToken : имеет
@enduml
```

| Таблица | Описание |
|---|---|
| `users` | Пользователи; `email` уникален, пароль — bcrypt (72 байта); роль определяет доступ (USER/ADMIN). |
| `refresh_tokens` | Refresh-токены: `jti` уникален, `revoked_at` для ротации/отзыва; одноразовые, при использовании заменяются. |

Детали жизненного цикла токенов — в [04-auth.md](04-auth.md).

## 3. Модуль catalog

```plantuml
@startuml
!theme plain

class Category {
  + id: UUID
  + parent_id: UUID [nullable, FK -> Category]
  + name: varchar(200)
  + slug: varchar(200) [unique]
  + description: text
  + image_url: varchar(500)
  + sort_order: integer
  + is_active: boolean
  + deleted_at: timestamptz [nullable]
  + created_at: timestamptz
  + updated_at: timestamptz
}

class Product {
  + id: UUID
  + category_id: UUID [FK -> Category]
  + name: varchar(300)
  + article: varchar(64) [unique]
  + description: text
  + series: varchar(200)           # серия/коллекция
  + product_type: varchar(100)     # сервиз, чашка, ваза, статуэтка...
  + decor: varchar(200)            # декор/рисунок
  + material: varchar(100)         # фарфор
  + capacity_ml: integer [nullable] # вместимость
  + weight_g: integer [nullable]
  + dimensions: varchar(100)       # габариты ДхШхВ
  + country_of_origin: varchar(100)
  + barcode: varchar(32) [nullable]
  + price_cents: bigint
  + discount_percent: integer [nullable]  # 0..100
  + price_with_discount_cents: bigint
  + rating_average: numeric(2,1)   # агрегат из review
  + rating_count: integer
  + is_active: boolean
  + deleted_at: timestamptz [nullable]
  + created_at: timestamptz
  + updated_at: timestamptz
}

class ProductSku {
  + id: UUID
  + product_id: UUID [FK -> Product]
  + name: varchar(200)          # напр. «Сервиз на 6 персон»
  + article: varchar(64) [unique]
  + price_cents: bigint [nullable]  # если отличается от товара
  + price_with_discount_cents: bigint [nullable]
  + stock_qty: integer          # остаток, один склад
  + is_active: boolean
  + created_at: timestamptz
  + updated_at: timestamptz
}

class ProductImage {
  + id: UUID
  + product_id: UUID [FK -> Product]
  + object_key: varchar(500)    # ключ в MinIO
  + url: varchar(500)           # presigned/публичный URL
  + position: integer
  + is_main: boolean
  + created_at: timestamptz
}

Category "1" --> "0..*" Category : parent
Category "1" --> "0..*" Product : содержит
Product "1" --> "0..*" ProductSku : варианты
Product "1" --> "0..*" ProductImage : изображения
@enduml
```

| Таблица | Описание |
|---|---|
| `categories` | Дерево категорий: `parent_id` ссылается на родителя (adjacency list); глубина не ограничена, но на практике ≤ 3. Подкатегории выбираются рекурсивным CTE. |
| `products` | Товар с фиксированными характеристиками (специфика фарфоровых изделий: серия, тип изделия, декор, вместимость). Цены в копейках. |
| `product_skus` | Варианты товара: набор, персона, цвет и т.п. Остаток и опциональная своя цена живут здесь. Товар без активных SKU не продаётся. |
| `product_images` | Изображения в MinIO; `is_main` — главное фото (одно на товар, контролируется приложением); порядок — `position`. |

Правила цен:

- `price_with_discount_cents` вычисляется при сохранении: `price_cents * (100 - discount_percent) / 100`, хранится материализованно.
- Скидка применяется на уровне товара или SKU; SKU с собственной ценой может иметь собственную скидку.
- Изменение цены порождает событие `product.updated` (инвалидация кэша, см. [06-events.md](06-events.md)).

## 4. Модуль order

```plantuml
@startuml
!theme plain

class Cart {
  + id: UUID
  + user_id: UUID [FK -> User, unique]
  + created_at: timestamptz
  + updated_at: timestamptz
}

class CartItem {
  + id: UUID
  + cart_id: UUID [FK -> Cart]
  + sku_id: UUID [FK -> ProductSku]
  + quantity: integer
  + created_at: timestamptz
  + updated_at: timestamptz
}

class Order {
  + id: UUID
  + number: varchar(20) [unique]      # человекочитаемый номер
  + user_id: UUID [FK -> User]
  + status: enum { NEW, CONFIRMED, DELIVERED, CANCELLED }
  + items_total_cents: bigint
  + delivery_cents: bigint
  + total_cents: bigint
  + customer_name: varchar(200)
  + customer_phone: varchar(30)
  + delivery_city: varchar(100)
  + delivery_address: varchar(300)
  + comment: text
  + created_at: timestamptz
  + updated_at: timestamptz
}

class OrderItem {
  + id: UUID
  + order_id: UUID [FK -> Order]
  + sku_id: UUID [FK -> ProductSku, nullable]
  + product_name: varchar(300)        # снимок
  + sku_name: varchar(200)            # снимок
  + article: varchar(64)              # снимок
  + price_cents: bigint               # снимок
  + price_with_discount_cents: bigint # снимок
  + quantity: integer
  + total_cents: bigint
}

class Favorite {
  + id: UUID
  + user_id: UUID [FK -> User]
  + product_id: UUID [FK -> Product]
  + created_at: timestamptz
}

Cart "1" --> "0..*" CartItem
Order "1" --> "0..*" OrderItem
User "1" --> "0..1" Cart : имеет
User "1" --> "0..*" Favorite
User "1" --> "0..*" Order : оформляет
@enduml
```

| Таблица | Описание |
|---|---|
| `carts` / `cart_items` | Корзина: одна на пользователя; элементы ссылаются на SKU; количество > 0, верхняя граница задаётся конфигурацией. |
| `orders` | Заказ: статус, суммы (товары + доставка), контакты и адрес получателя. Оплата оффлайн — отдельного платёжного состояния нет, статус `CONFIRMED` фиксирует принятие заказа. |
| `order_items` | **Снимок** товара на момент заказа: название, артикул, цены копируются; при удалении/изменении товара заказ остаётся корректным. |
| `favorites` | Избранное: пара `(user_id, product_id)` уникальна; добавление идемпотентно. |

Статусы заказа и правила переходов — в [05-orders.md](05-orders.md).

## 5. Модуль review

```plantuml
@startuml
!theme plain

class Review {
  + id: UUID
  + user_id: UUID [FK -> User]
  + product_id: UUID [FK -> Product]
  + rating: smallint                 # 1..5
  + text: text
  + purchased_at: timestamptz [nullable]  # подтверждение покупки
  + is_moderated: boolean
  + created_at: timestamptz
  + updated_at: timestamptz
}

User "1" --> "0..*" Review
Product "1" --> "0..*" Review
@enduml
```

| Таблица | Описание |
|---|---|
| `reviews` | Отзыв: оценка 1–5 и текст. Пара `(user_id, product_id)` уникальна — один отзыв на товар. Оставить отзыв может только пользователь, купивший этот товар (проверка по `order_items` через снимок SKU → товар). |

Согласованность:

- При публикации/изменении/удалении отзыва модуль `review` публикует событие `review.rating.updated`; подписчик пересчитывает `rating_average` и `rating_count` на товаре (взвешенное среднее, округление до 0,1).

## 6. Сводная схема связей между модулями

```plantuml
@startuml
!theme plain
left to right direction

package "auth" {
  entity User
}
package "catalog" {
  entity Category
  entity Product
  entity ProductSku
  entity ProductImage
}
package "order" {
  entity Cart
  entity CartItem
  entity Order
  entity OrderItem
  entity Favorite
}
package "review" {
  entity Review
}

User ||--o{ Cart
User ||--o{ Order
User ||--o{ Favorite
User ||--o{ Review

Category ||--o{ Category
Category ||--o{ Product
Product ||--o{ ProductSku
Product ||--o{ ProductImage
Product ||--o{ Review

Cart ||--o{ CartItem
CartItem }o--|| ProductSku
Order ||--o{ OrderItem
OrderItem }o--o| ProductSku : снимок, nullable
Favorite }o--|| Product
@enduml
```

## 7. Словари и статусы

### OrderStatus

| Статус | Описание | Допустимые переходы |
|---|---|---|
| `NEW` | Создан, ожидает подтверждения оператором | → `CONFIRMED`, → `CANCELLED` |
| `CONFIRMED` | Подтверждён, передан в сборку/доставку | → `DELIVERED`, → `CANCELLED` |
| `DELIVERED` | Доставлен, оплачен при получении | терминальный |
| `CANCELLED` | Отменён (пользователем или оператором) | терминальный |

### Роли

| Роль | Права |
|---|---|
| `USER` | Просмотр каталога, корзина, заказы, избранное, отзывы |
| `ADMIN` | Всё, что `USER`, плюс CRUD категорий/товаров/SKU/изображений, смена статусов заказов, модерация отзывов |

### Типы изделий (справочные значения `product_type`, расширяемые)

сервиз, чайная пара, чашка, блюдце, тарелка, ваза, статуэтка, сувенир, сахарница, молочник

## 8. Индексы и уникальные ограничения

| Таблица | Индексы / ограничения | Назначение |
|---|---|---|
| `users` | `uk_users_email` (unique), idx на `role` | Вход по email, выборки по роли |
| `refresh_tokens` | `uk_refresh_jti` (unique), idx `(user_id)`, idx `(expires_at)` | Ротация, отзыв, очистка просроченных |
| `categories` | idx `(parent_id)`, `uk_categories_slug` (unique, partial `WHERE deleted_at IS NULL`) | Рекурсивные CTE, slug в URL |
| `products` | idx `(category_id)`, idx GIN `(name gin_trgm_ops)`, idx `(series)`, `uk_products_article` (unique, partial), idx `(price_with_discount_cents)`, idx `(is_active, deleted_at)` | Поиск (pg_trgm), фильтры, сортировка по цене |
| `product_skus` | idx `(product_id)`, `uk_skus_article` (unique, partial) | Карточка товара, остатки |
| `product_images` | idx `(product_id, position)` | Порядок изображений |
| `cart_items` | idx `(cart_id)`, `uk_cart_items_sku` (unique `(cart_id, sku_id)`) | Содержимое корзины |
| `orders` | idx `(user_id, created_at desc)`, idx `(status)`, `uk_orders_number` (unique) | История заказов, списки по статусу |
| `order_items` | idx `(order_id)`, idx `(sku_id)` | Детали заказа, проверка покупки для отзывов |
| `favorites` | `uk_favorites_user_product` (unique `(user_id, product_id)`), idx `(user_id)` | Избранное пользователя |
| `reviews` | `uk_reviews_user_product` (unique `(user_id, product_id)`), idx `(product_id, created_at desc)` | Один отзыв на товар, списки отзывов |

Примечание: partial-индексы используются с soft delete (`WHERE deleted_at IS NULL`), чтобы сохранить уникальность артикулов и slug среди активных записей.