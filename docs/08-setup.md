# 08. Запуск и окружения

> Статус: черновик
> Версия: 0.1
> Связанные документы: [01. Архитектура](01-architecture.md), [07. Кэширование и медиа](07-caching-and-media.md)

## 1. Требования

| Компонент | Минимальная версия | Примечание |
|---|---|---|
| JDK | 25 (LTS) | Запуск и сборка |
| Maven | 3.9+ (используется `mvnw` wrapper) | Wrapper в репозитории |
| Docker | 24+ (Docker Engine) | Инфраструктура и тесты (Testcontainers) |
| Docker Compose | 2.x (плагин `docker compose`) | Развёртывание инфраструктуры |
| IDE | любая (рекомендуется IntelliJ IDEA) | — |

## 2. Сборка и миграции

### Maven

```bash
./mvnw clean compile        # компиляция
./mvnw test                # юнит + интеграционные тесты (Testcontainers)
./mvnw package             # сборка jar (spring-boot:repackage)
./mvnw spring-boot:run     # запуск приложения
```

- `pom.xml` использует Spring Boot 4 starter parent, Java 25 (`<java.version>25</java.version>`).
- Сборка без сети после первой загрузки зависимостей — работает через локальный `.m2`.

### Flyway

- Миграции в `src/main/resources/db/migration/V1__init.sql`, `V2__*.sql` и т.д. (строго возрастающая нумерация, без правок применённых файлов).
- Применяются автоматически при старте приложения (для окружений разработки и продакшена).
- Тестовые данные в миграции **не** добавляются; seed-скрипты — отдельно (см. раздел 5).
- В продакшене: `FLYWAY_VALIDATE_ON_MIGRATE=true` (по умолчанию), откат — новой миграцией.

## 3. Конфигурация

### Принцип

Один профиль приложения: **`default`**. Различия окружений задаются исключительно переменными окружения — Spring-профилей окружений нет. Для тестов используется отдельный конфиг `application-test.yml` (Testcontainers), который не является «профилем окружения».

- `application.yml` — дефолтные значения (локальные адреса), всё переопределяется env.
- `application-test.yml` — настройки тестового контекста.

### Переменные окружения

| Переменная | Назначение | Дефолт (local) |
|---|---|---|
| `APP_PORT` | Порт приложения | `8080` |
| `DB_URL` | JDBC URL PostgreSQL | `jdbc:postgresql://localhost:5432/catalog` |
| `DB_USER` | Пользователь БД | `catalog` |
| `DB_PASSWORD` | Пароль БД | `catalog` |
| `REDIS_HOST` | Хост Redis | `localhost` |
| `REDIS_PORT` | Порт Redis | `6379` |
| `KAFKA_BOOTSTRAP` | Bootstrap-серверы Kafka | `localhost:9092` |
| `MINIO_ENDPOINT` | Endpoint MinIO | `http://localhost:9000` |
| `MINIO_ACCESS_KEY` | Access key MinIO | `minioadmin` |
| `MINIO_SECRET_KEY` | Secret key MinIO | `minioadmin` |
| `MINIO_BUCKET` | Публичный бакет изображений | `catalog-images` |
| `JWT_SECRET` | Секрет HS256 (≥ 32 байта) | обязательна к заданию |
| `JWT_ACCESS_TTL` | Срок жизни access-токена, сек | `900` |
| `JWT_REFRESH_TTL` | Срок жизни refresh-токена, сек | `2592000` |
| `ADMIN_EMAIL` | Email первого администратора (seed) | пусто |
| `ADMIN_PASSWORD` | Пароль первого администратора (seed) | пусто |
| `PUBLIC_BASE_URL` | Внешний базовый URL (для URL изображений и ссылок) | `http://localhost:8080` |

Секреты (`JWT_SECRET`, `MINIO_SECRET_KEY`, `DB_PASSWORD`) не фиксируются в коде и `.env.example` — только в секрет-хранилище окружения.

## 4. docker-compose (только инфраструктура)

`docker-compose.yml` в корне проекта поднимает инфраструктуру; приложение запускается из IDE/контейнера отдельно.

| Сервис | Образ | Порт (host) | Примечание |
|---|---|---|---|
| `postgres` | `postgres:17-alpine` | `5432` | БД `catalog`, volume для данных, healthcheck `pg_isready` |
| `redis` | `redis:7-alpine` | `6379` | Кэш, volume |
| `kafka` | `apache/kafka:3.8` (KRaft) | `9092` (внешний), `9093` (внутренний) | Без Zookeeper, `auto.create.topics.enable=true` |
| `minio` | `minio/minio:latest` | `9000` (API), `9001` (консоль) | volume, `MINIO_ROOT_USER/PASSWORD` = minioadmin; бакет `catalog-images` создаётся при старте через `mc` (команда init) |

### Команды

```bash
docker compose up -d      # поднять инфраструктуру
docker compose ps         # статус
docker compose logs -f    # логи
docker compose down       # остановить (volumes сохраняются)
docker compose down -v    # остановить и удалить данные
```

- Первый запуск MinIO: сервис `minio-init` (одноразовый контейнер `minio/mc`) создаёт бакет `catalog-images` и выставляет политику публичного чтения (см. [07-caching-and-media.md](07-caching-and-media.md)).
- Kafka работает в режиме KRaft (без Zookeeper) — топики создаются при первом использовании (консьюмер-группы), retention 7 дней по умолчанию.

## 5. Локальный запуск (пошагово)

1. **Поднять инфраструктуру:**
   ```bash
   docker compose up -d
   ```
2. **Задать секреты** (в конфигурации запуска IDE или `.env` перед `docker compose`):
   - `JWT_SECRET` — произвольная строка ≥ 32 байт
   - при необходимости `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. **Запустить приложение** из IDEA (класс `CatalogApplication`, рабочая директория — корень проекта) или:
   ```bash
   ./mvnw spring-boot:run
   ```
4. **Проверить здоровье:** `GET http://localhost:8080/actuator/health` → `{"status":"UP"}`.
5. **Seed администратора:** при старте приложение проверяет: если админов нет и заданы `ADMIN_EMAIL`/`ADMIN_PASSWORD` — создаёт первого администратора. Иначе роль ADMIN недоступна до ручного добавления.
6. **Инструкция для README:** сводка шагов 1–5 (краткая версия), ссылка на этот документ.

## 6. Тесты

- Интеграционные тесты используют **Testcontainers**: при запуске `mvn test` поднимаются контейнеры PostgreSQL, Redis, Kafka (MinIO — только для тестов загрузки изображений).
- Конфигурация — `application-test.yml` (адреса контейнеров подставляются Testcontainers через dynamic properties).
- Контейнеры переиспользуются между тестами одной JVM (`@Testcontainers` + singleton-класс), что ускоряет прогон.
- Тесты не зависят от локальной инфраструктуры и от `docker compose`: контейнеры управляются самим тестом. Требование — запущенный Docker.
- `./mvnw test` — единственная команда полного прогона.

## 7. Продукционный деплой (обзор)

| Аспект | Решение v1 |
|---|---|
| Образ приложения | Многостадийный Dockerfile: `maven` → `eclipse-temurin:25-jre`, jar с `spring-boot:repackage` |
| Запуск | Один контейнер приложения + инфраструктура (PostgreSQL/Redis/Kafka/MinIO) рядом или в управляемом сервисе |
| Миграции | Flyway при старте (валидация включена) |
| Секреты | Переменные окружения / секрет-хранилище; `JWT_SECRET` ротируется по расписанию (отзыв refresh-токенов при ротации) |
| Бэкапы | PostgreSQL — ежедневный `pg_dump` + WAL; MinIO — репликация бакета; Redis — без сохранения (кэш восстанавливается) |
| Обновление | rolling: новый контейнер → healthcheck → переключение; миграции — до переключения трафика |
| Наблюдаемость | `/actuator/health` для оркестратора; structured-логи в stdout (см. [01-architecture.md](01-architecture.md)) |

Детальные процедуры продакшена (мониторинг, алерты, DR) — фаза 2, фиксируются в [09-roadmap.md](09-roadmap.md) и ADR.