# 10. Задачи разработки (исполнитель: ассистент)

> Статус: в работе
> Версия: 0.1
> Связанные документы: [01. Архитектура](01-architecture.md), [02. Модель данных](02-domain-model.md), [03. Дизайн API](03-api-design.md), [04. Аутентификация](04-auth.md), [05. Заказы](05-orders.md), [06. События](06-events.md), [07. Кэширование и медиа](07-caching-and-media.md), [08. Запуск и окружения](08-setup.md), [09. Roadmap](09-roadmap.md)

## Как пользоваться этим файлом

- Это исполняемый чек-лист всего процесса разработки: ассистент выполняет задачи по порядку блоков и отмечает выполненные пункты `[x]`.
- Каждый блок — законченная единица работы: после него код компилируется, инфраструктура поднимается, тесты зелёные.
- Блоки выполняются последовательно (зависимости указаны явно); внутри блока — произвольный порядок.
- После каждого блока — краткий отчёт о статусе; спорные решения фиксируются в ADR.
- Критерии завершения каждого блока указаны в конце блока.

## 0. Каркас проекта

Зависит от: ничего. Основа: [08-setup.md](08-setup.md), [01-architecture.md](01-architecture.md) (разделы 5–7).

- [ ] Инициализация проекта: Spring Boot 4, Java 25, Maven (`mvnw`); зависимости: web, data-jpa, security, validation, kafka, data-redis, actuator, flyway, mapstruct, testcontainers, lombok
- [ ] Структура пакетов: `com.practice.catalog.{common,auth,catalog,order,review}` со слоями `api/service/domain/infrastructure`
- [ ] `.gitignore` (target, .idea, .env), короткий `README.md` со ссылкой на docs
- [ ] `docker-compose.yml`: postgres 17, redis 7, kafka (KRaft), minio + `minio-init` (создание бакета `catalog-images`, публичная политика)
- [ ] `application.yml` + все переменные окружения из [08-setup.md](08-setup.md) (DB/REDIS/KAFKA/MINIO/JWT/ADMIN_*)
- [ ] Flyway `V1__init.sql`: DDL всех таблиц из [02-domain-model.md](02-domain-model.md) (users, refresh_tokens, categories, products, product_skus, product_images, carts, cart_items, orders, order_items, favorites, reviews, processed_events) + индексы и unique-ограничения из раздела 8
- [ ] Обработка ошибок: `@RestControllerAdvice`, Problem Details (RFC 9457), доменные исключения в `common`
- [ ] `BaseEntity` (UUID, `created_at`/`updated_at`), фильтр soft delete (`deleted_at`)
- [ ] Фильтр `X-Request-Id` → `traceId` в логи; structured-логирование (logstash-encoder), Actuator (`health`, `info`, `metrics`)

**Критерий:** `docker compose up -d` поднимает всю инфраструктуру; приложение стартует, `/actuator/health` — UP; миграция V1 применяется; 404 на неизвестный путь возвращает Problem Details.

## 1. Модуль auth

Зависит от: блок 0. Основа: [04-auth.md](04-auth.md), [02-domain-model.md](02-domain-model.md) (раздел 2), [03-api-design.md](03-api-design.md) (раздел 3).

- [ ] Сущности `User`, `RefreshToken` + репозитории; bcrypt (стоимость 12)
- [ ] `JwtProvider`: HS256, секрет из `JWT_SECRET`, access 15 мин / refresh 30 дней, claims `sub/role/jti/exp/iat/iss/aud`
- [ ] `AuthService`: `register` (автовход), `login`, `refresh` (ротация: старый → revoked, новая пара), `logout`, `logout-all`, `change-password` (текущий + новый дважды, отзыв всех refresh)
- [ ] `JwtAuthenticationFilter` + `SecurityFilterChain` (публичные пути, `/admin/**` = ADMIN); `@PreAuthorize` для владельца ресурса
- [ ] `AuthController`: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/change-password`, `/auth/me`
- [ ] Seed первого админа из `ADMIN_EMAIL`/`ADMIN_PASSWORD` (только если админов нет)
- [ ] Фоновая очистка просроченных refresh-токенов
- [ ] Юнит-тесты `AuthService` (ротация, повторное использование revoked → отзыв всех), интеграционные тесты `AuthController` (register/login/refresh/change-password, коды 400/401/409)

**Критерий:** полный цикл register → login → refresh → logout работает; повторное использование refresh отзывает все токены пользователя; смена пароля разлогинивает со всех устройств; роль ADMIN получает доступ к `/admin/**`.

## 2. Модуль catalog (публичная часть + админка)

Зависит от: блок 1. Основа: [02-domain-model.md](02-domain-model.md) (раздел 3), [03-api-design.md](03-api-design.md) (разделы 2, 4), [07-caching-and-media.md](07-caching-and-media.md) (раздел 3).

- [ ] Сущности `Category` (adjacency list), `Product` (все фиксированные поля фарфора), `ProductSku`, `ProductImage` + репозитории
- [ ] Выборка дерева категорий рекурсивным CTE; slug — уникален среди активных
- [ ] Поиск товаров: `pg_trgm` по названию/артикулу/серии; фильтры `categoryId` (с подкатегориями), `priceFrom/To`, `series`, `type`, `inStock`, `onlyDiscounted`; сортировки `price_asc/price_desc/rating_desc/newest/discount_desc`; page-based конверт
- [ ] Пересчёт `price_with_discount_cents` при сохранении (цена/скидка товара и SKU)
- [ ] MapStruct-мапперы: сущность ↔ DTO (без утечки entity в api-слой)
- [ ] Публичные контроллеры: `GET /categories`, `GET /products`, `GET /products/{id}` (карточка: SKU, изображения, рейтинг), `GET /products/{id}/reviews` (список опубликованных)
- [ ] Админ-контроллеры: CRUD категорий (DELETE → 409 при товарах/подкатегориях), CRUD товаров (soft delete), CRUD SKU (деактивация), изображения: multipart-загрузка (JPEG/PNG/WebP ≤ 10 МБ), смена позиции/главного, удаление
- [ ] MinIO-клиент: загрузка в `products/{productId}/{uuid}.{ext}`, удаление объекта при DELETE изображения, публичный URL из `PUBLIC_BASE_URL`
- [ ] Юнит-тесты сервисов (пересчёт цен, поиск, удаление категории), интеграционные тесты репозиториев (CTE, full-text, фильтры, сортировки), тест загрузки изображения с MinIO

**Критерий:** публичный каталог отдаёт дерево/списки/карточки с корректными фильтрами и пагинацией; админ создаёт товар с SKU и изображением, публичный GET показывает его.

## 3. Модуль order (корзина и заказы)

Зависит от: блок 2. Основа: [05-orders.md](05-orders.md), [02-domain-model.md](02-domain-model.md) (раздел 4).

- [ ] Сущности `Cart`, `CartItem`, `Order`, `OrderItem`, `Favorite` + репозитории
- [ ] Корзина: одна на пользователя, лимиты (≤ 999 шт/позиция, ≤ 100 позиций), пересчёт цен при чтении, пометка `unavailable` для неактивных SKU/товаров и превышения остатка
- [ ] Оформление `POST /orders` одной транзакцией: `SELECT FOR UPDATE` по SKU → проверка остатка → списание → создание Order + OrderItem-снимков → очистка корзины; 422 со списком `[{skuId, requested, available}]`
- [ ] Номер заказа `ORD-YYYY-######` (уникальный); `deliveryCents = 0`; идемпотентность по `X-Request-Id`
- [ ] Переходы статусов по таблице [05-orders.md](05-orders.md) (раздел 4): инициаторы, идемпотентный повтор, 409 на недопустимый переход; `status_history` JSONB при каждом переходе
- [ ] Отмена (пользователем в NEW, оператором в NEW/CONFIRMED): возврат остатков
- [ ] `Favorite`: `PUT/DELETE /favorites/{productId}`, список с пагинацией
- [ ] Админ: `GET /admin/orders` (фильтр по статусу), `PATCH /admin/orders/{id}/status`
- [ ] Тесты: конкурентное списание остатка (два параллельных заказа), отмена возвращает остатки, идемпотентность оформления и переходов

**Критерий:** сценарий «корзина → заказ → подтверждение → доставка → отмена» полностью работает; остатки консистентны при конкурентных оформлениях.

## 4. Модуль review

Зависит от: блок 3. Основа: [02-domain-model.md](02-domain-model.md) (раздел 5), [05-orders.md](05-orders.md) (раздел 7), [03-api-design.md](03-api-design.md) (раздел 3).

- [ ] Сущность `Review` + репозиторий (уникальность `user_id + product_id`)
- [ ] Проверка права: заказ DELIVERED пользователя содержит `order_item.sku_id` → товар; иначе 403
- [ ] `POST /products/{id}/reviews`, `PATCH/DELETE /reviews/{id}` (только свои)
- [ ] Модерация: `GET /admin/reviews` (фильтр `isModerated`), `PATCH /admin/reviews/{id}/moderation`; публичный список — только одобренные
- [ ] Пересчёт агрегата рейтинга (по событию, см. блок 6): полный `AVG(rating)` по одобренным отзывам
- [ ] Тесты: 403 для не-покупателя, 409 за повторный отзыв, скрытый отзыв не влияет на рейтинг и не виден публично

**Критерий:** отзыв может оставить только покупатель после DELIVERED; один на товар; модерация скрывает отзыв из публичных списков и рейтинга.

## 5. Redis-кэш чтения каталога

Зависит от: блок 2. Основа: [07-caching-and-media.md](07-caching-and-media.md) (разделы 1–2).

- [ ] Ключи: `catalog:categories:tree`, `catalog:products:list:{hash}:{page}:{size}`, `catalog:product:{id}`; TTL 5 мин; negative cache 60 сек
- [ ] Остатки вне кэша: `inStock` — batch-запрос по странице; `stockQty` карточки — из БД; запросы с `inStock`/`onlyDiscounted` мимо кэша
- [ ] Инвалидация: обработка `product.updated.v1`/`product.created.v1` (удаление карточки и списков), прямая инвалидация при CRUD категорий
- [ ] Заголовки: `Cache-Control: public, max-age=300` на публичных ответах; ETag на карточке; `no-store` для ответов с остатками и авторизованных
- [ ] Тест: повторный GET /products забирает данные из кэша (метрика/лог), событие инвалидирует

**Критерий:** кэш работает без расхождения с БД по товарам/категориям; остатки всегда актуальны.

## 6. Kafka-события

Зависит от: блок 5 (инвалидация), блок 4 (рейтинг). Основа: [06-events.md](06-events.md).

- [ ] Конверт события (`eventId/eventType/source/occurredAt/traceId/payload`), сериализация JSON, key = id ресурса
- [ ] Публикация после COMMIT из модулей: `catalog.events` (`product.created.v1`, `product.updated.v1`, `stock.updated.v1`), `order.events` (`order.created.v1`, `order.status.changed.v1`), `review.events` (`review.rating.updated.v1`)
- [ ] Топики создаются автоматически (KRaft, `auto.create.topics.enable=true`); 3 партиции
- [ ] Консьюмер `catalog-cache`: `product.updated`, `stock.updated` → инвалидация кэша (блок 5)
- [ ] Консьюмер `review-rating`: `review.rating.updated` → полный пересчёт рейтинга товара
- [ ] Консьюмер `order-sink`: заглушка (логи/метрики) для `order.*`
- [ ] Идемпотентность: unique-индекс `processed_events.event_id`; ретраи с экспоненциальной задержкой (до 5) → DLT (`<topic>.dlt`) с заголовками ошибок
- [ ] Интеграционные тесты (Testcontainers Kafka): конверт, версии схем, идемпотентность (повторное событие не применяется дважды), срабатывание DLT

**Критерий:** оформление заказа → списание остатка → событие `stock.updated` → инвалидация кэша; публикация отзыва → событие → пересчёт рейтинга; повторная доставка события не дублирует эффект.

## 7. Качество и финальная полировка

Зависит от: блоки 0–6. Основа: [09-roadmap.md](09-roadmap.md) (разделы 2–3), [08-setup.md](08-setup.md) (раздел 6), [01-architecture.md](01-architecture.md) (раздел 9).

- [ ] Полный прогон `./mvnw test` (Testcontainers: PostgreSQL, Redis, Kafka, MinIO) — все тесты зелёные
- [ ] Покрытие сервисных слоёв ≥ 80% (jacoco)
- [ ] `openapi.yaml` по [03-api-design.md](03-api-design.md) (все эндпоинты, схемы, ошибки)
- [ ] Проверка соответствия кода документам 01–09: исправить расхождения в коде или зафиксировать в доке/ADR
- [ ] Прогон сценариев приёмки из [09-roadmap.md](09-roadmap.md) (раздел 2): «каталог → корзина → заказ → доставка → отзыв» и «админка: товар → изображение → подтверждение заказа»
- [ ] Проверка чек-листа DoD из [09-roadmap.md](09-roadmap.md)

**Критерий:** все пункты этого файла отмечены `[x]`; приёмка v1 из [09-roadmap.md](09-roadmap.md) пройдена.

## Порядок выполнения и коммуникация

1. Блоки выполняются по возрастанию номеров; внутри блока — произвольный порядок задач.
2. После завершения блока: `mvnw test` зелёный, краткий отчёт (что сделано, что проверено, что осталось).
3. Открытые вопросы (неоднозначности между доками) решаются через уточняющий вопрос пользователю; принятые решения — в ADR.
4. Коммиты: по одному на блок (сообщение по Conventional Commits), только по явной команде пользователя.