# 11. Воспроизведение каталога (заполнение БД и MinIO)

> Статус: черновик
> Версия: 0.1
> Связанные документы: [08. Запуск и окружения](08-setup.md), [07. Кэширование и медиа](07-caching-and-media.md)

## 1. Что переносится через git

Данные каталога Добрушского фарфорового завода (лавка `shop.dfz.by`) воспроизводятся на любой машине **только из репозитория**:

| Артефакт | Расположение | Что это |
|---|---|---|
| Схема БД | `src/main/resources/db/migration/V1__*.sql`, `V2__*.sql`, `V3__*.sql` | Применяется Flyway при старте приложения; в git, семантических изменений не требует |
| Данные каталога | `src/main/resources/db/seed/seed_catalog.sql` | 24 категории, 143 товара, 143 SKU, 171 запись изображений (URL) |
| `seed_catalog.sql` | идемпотентен | `ON CONFLICT (id) DO NOTHING` — повторный запуск безопасен |
| Изображения | `scripts/seed/catalog-images/products/{product-uuid}/{image-uuid}.jpg` | 171 файл (~19 МБ), раскладка совпадает с бакетом `catalog-images` |
| Скрипт заливки БД | `scripts/seed-db.sh` | psql `< seed_catalog.sql` в контейнер `catalog-postgres` |
| Скрипт заливки MinIO | `scripts/upload-seed-images.sh` | `mc mirror` каталога изображений в бакет `catalog-images` |
| Одноразовый сервис | `minio-upload-images` в `docker-compose.yml` | та же заливка через `docker compose run --rm` |

### Что НЕ переносится через git

- **Пользователи / роли**: на новой машине админ создаётся только если заданы `ADMIN_EMAIL`/`ADMIN_PASSWORD` и в БД ещё нет админов (`AdminSeeder`, см. [04-auth.md](04-auth.md)).
- **Заказы, корзины, избранное, отзывы**: это данные сессий, для демонстрации каталога не нужны.
- Изображения **до загрузки на этой машине**: в репозитории хранятся сами файлы, в SQL — только URL на них.

## 2. Полный процесс на новой машине

Предполагается машина с Docker + Compose и JDK 25 (см. [08-setup.md](08-setup.md) §1).

### 2.1 Клонировать репозиторий

```bash
git clone <repo-url>
cd practice-catalog-app
```

### 2.2 Поднять инфраструктуру

```bash
docker compose up -d
```

- Поднимутся PostgreSQL, Redis, Kafka, MinIO.
- `minio-init` (одноразовый контейнер) создаст бакет `catalog-images` и выставит публичное чтение (анонимный download).
- Данные хранятся в named volumes — повторный `up` их не трогает.

Проверка:

```bash
docker compose ps     # все healthy / running
```

### 2.3 Применить миграции (один раз)

Схема создаётся Flyway автоматически при старте приложения. Нужен `JWT_SECRET` (строка ≥ 32 байт), см. [08-setup.md](08-setup.md) §3:

```bash
JWT_SECRET='<строка >= 32 байт>' ./mvnw spring-boot:run
```

Дождаться успешного старта и выключить:

```bash
curl http://localhost:8080/actuator/health   # {"status":"UP"}
```

> Порядок обязателен: сначала миграции, потом seed — иначе `seed_catalog.sql` упадёт на отсутствующих таблицах.

### 2.4 Заполнить БД каталогом

```bash
./scripts/seed-db.sh
```

Ожидаемый вывод: `INSERT 0 1`/… и `COMMIT`. Повторный запуск — `INSERT 0 0` (идемпотентность).

Проверка:

```bash
docker exec catalog-postgres psql -U catalog -d catalog -c \
  "SELECT (SELECT count(*) FROM categories) AS categories,
          (SELECT count(*) FROM products)   AS products,
          (SELECT count(*) FROM product_skus) AS skus,
          (SELECT count(*) FROM product_images) AS images;"
```

Ожидается: `24 | 143 | 143 | 171`.

### 2.5 Загрузить изображения в MinIO

```bash
./scripts/upload-seed-images.sh
# или, что то же самое:
docker compose run --rm minio-upload-images
```

- Ожидаемый вывод: таблица `mc mirror` (`Total` ~17–19 MiB) и `seed images uploaded to catalog-images`.
- Идемпотентно: повторный запуск не создаёт дубликатов (пути перезаписываются).

Проверка:

```bash
curl -sI http://localhost:9000/catalog-images/products/<product-uuid>/<image-uuid>.jpg | head -1
# HTTP/1.1 200 OK
```

## 3. Итоговая проверка API

```bash
# категории (дерево, публичное)
curl -s http://localhost:8080/api/v1/categories | jq 'length'

# список товаров (публичное, PageEnvelope)
curl -s 'http://localhost:8080/api/v1/products?size=5' | jq '{total, first: [.items[] | {name, priceCents, mainImageUrl, inStock}]}'

# карточка товара (публичное)
curl -s http://localhost:8080/api/v1/products/<product-uuid> | jq '{name, images: .images|length, skus: [.skus[] | {article, stockQty}]}'
```

Админские эндпоинты (`/api/v1/admin/**`) доступны только с токеном роли `ADMIN`.

## 4. Оговорки

- **URL изображений в `seed_catalog.sql` захардкожены** как `http://localhost:9000/catalog-images/...`. Они корректны при штатном локальном развёртывании (MinIO на `localhost:9000`). Если MinIO поднимется на другом хосте/порту — URL нужно обновить в seed-скрипте и переприменить его.
- **Сброс и повторный seed**: `docker compose down -v` полностью удаляет volumes (PostgreSQL, MinIO и т.д.), после чего можно заново пройти шаги 2.2–2.5. Для точечной очистки только каталога тестовых данных используется `src/main/resources/db/seed/cleanup_test_data.sql` (удаляет записи каталога и зависимые cart_items/favorites/reviews; `order_items.sku_id` обнуляется).
- **Админ на новой машине**: если `ADMIN_EMAIL`/`ADMIN_PASSWORD` не заданы на первом старте, роль ADMIN ни у кого не будет до ручного добавления пользователя в БД.